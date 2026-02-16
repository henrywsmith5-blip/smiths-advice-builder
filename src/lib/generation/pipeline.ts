import { prisma } from "@/lib/db";
import { getLLMProvider, type ExtractInput } from "@/lib/llm/provider";
import type { FactPack, ClientData } from "@/lib/llm/schemas";
import { renderTemplate, type RenderContext } from "@/lib/templates/renderer";
import { generatePdf } from "@/lib/pdf/generator";
import { computePremiumSummary, parseDollar, type UIState, type PremiumFrequency } from "./premium";
import { buildBenefitsSummary } from "./benefits";
import { preflightValidate, type ValidationResult } from "./validator";
import { DocType, ClientType } from "@prisma/client";

export interface GenerateInput {
  caseId: string;
  docType: DocType;
  firefliesText?: string;
  quotesText?: string;
  otherDocsText?: string;
  additionalContext?: string;
  roaDeviations?: string;
  clientOverrides?: { name?: string; nameB?: string; email?: string };
  clientType: ClientType;
  clientAHasExisting: boolean;
  clientBHasExisting: boolean;
  saveCase: boolean;
}

export interface GenerateResult {
  docId: string;
  renderedHtml: string;
  pdfPath: string | null;
  validation: ValidationResult;
  premiumSummary: {
    existingTotal: number | null;
    newTotal: number | null;
    delta: number | null;
    deltaLabel: string | null;
    frequency: string;
  };
}

// Helper: get client from fact pack by id
function getClient(fp: FactPack, id: "A" | "B"): ClientData | null {
  return fp.clients.find(c => c.id === id) || null;
}

// Helper: safe string value
function v(val: string | null | undefined, fallback = "N/A"): string {
  return val || fallback;
}

export async function runGenerationPipeline(input: GenerateInput): Promise<GenerateResult> {
  const llm = getLLMProvider();
  console.log(`[Pipeline] Starting ${input.docType} for case ${input.caseId}`);

  // ── Step 1: UI State (SOURCE OF TRUTH for structure) ──
  const uiState: UIState = {
    isPartner: input.clientType === ClientType.PARTNER,
    clientAHasExisting: input.clientAHasExisting,
    clientBHasExisting: input.clientBHasExisting,
    hasExistingCover: input.clientAHasExisting || input.clientBHasExisting,
  };
  console.log(`[Pipeline] UI State: partner=${uiState.isPartner}, existingA=${uiState.clientAHasExisting}, existingB=${uiState.clientBHasExisting}`);

  // ── Step 2: Save inputs if requested ──
  if (input.saveCase) {
    await prisma.case.update({
      where: { id: input.caseId },
      data: {
        firefliesText: input.firefliesText || null,
        quotesText: input.quotesText || null,
        otherDocsText: input.otherDocsText || null,
        additionalContext: input.additionalContext || null,
        roaDeviations: input.roaDeviations || null,
        clientAName: input.clientOverrides?.name || undefined,
        clientBName: input.clientOverrides?.nameB || undefined,
        clientEmail: input.clientOverrides?.email || undefined,
        clientAHasExisting: input.clientAHasExisting,
        clientBHasExisting: input.clientBHasExisting,
        retentionDeleteAt: new Date(Date.now() + (parseInt(process.env.RETENTION_DAYS || "7") * 86400000)),
      },
    });
  }

  // ── Step 3: LLM Extractor (facts only, no math) ──
  console.log("[Pipeline] Running extractor...");
  const extractInput: ExtractInput = {
    docType: input.docType,
    clientOverrides: input.clientOverrides,
    firefliesText: input.firefliesText,
    quotesText: input.quotesText,
    otherDocsText: input.otherDocsText,
    additionalContext: input.additionalContext,
    roaDeviations: input.roaDeviations,
  };
  const factPack = await llm.extractCaseJson(extractInput);
  console.log(`[Pipeline] Extracted ${factPack.clients.length} clients, ${factPack.missingFields.length} missing fields`);

  // ── Step 4: LLM Writer (narrative only, no premium math) ──
  console.log("[Pipeline] Running writer...");
  const writerOutput = await llm.writeSections(factPack, input.docType);
  console.log("[Pipeline] Writer complete");

  // ── Step 5: Get client data from fact pack ──
  const clientA = getClient(factPack, "A");
  const clientB = getClient(factPack, "B");
  const freq: PremiumFrequency = factPack.caseMeta.frequency || "month";

  // ── Step 6: DETERMINISTIC premium math (never from LLM) ──
  const premiumSummary = computePremiumSummary(
    {
      existingAmount: clientA?.existingCover.premium.amount ?? null,
      newAmount: clientA?.implementedCover.premium.amount ?? null,
      frequency: freq,
    },
    uiState.isPartner ? {
      existingAmount: clientB?.existingCover.premium.amount ?? null,
      newAmount: clientB?.implementedCover.premium.amount ?? null,
      frequency: freq,
    } : null,
    uiState,
    freq
  );
  console.log(`[Pipeline] Premium: existing=${premiumSummary.OLD_PREMIUM}, new=${premiumSummary.NEW_PREMIUM}, delta=${premiumSummary.PREMIUM_CHANGE_LABEL}`);

  // ── Step 7: DETERMINISTIC benefits summary ──
  const benefitsSummary = buildBenefitsSummary(
    clientA?.name || input.clientOverrides?.name || "Client A",
    clientA?.benefitsSummary || null,
    clientB?.name || input.clientOverrides?.nameB || null,
    clientB?.benefitsSummary || null,
    uiState
  );

  // ── Step 8: Build Nunjucks render context ──
  const sec = (key: string): string => {
    const s = writerOutput.sections as Record<string, { included: boolean; html: string }> | undefined;
    if (s && key in s) return s[key].html || "";
    return "";
  };

  const nzDate = new Date().toLocaleDateString("en-NZ", {
    timeZone: "Pacific/Auckland", day: "numeric", month: "long", year: "numeric",
  });

  const si = factPack.sectionsIncluded;

  const context: RenderContext = {
    // Client info
    CLIENT_NAME: v(clientA?.name, input.clientOverrides?.name || "Client"),
    CLIENT_A_NAME: v(clientA?.name, input.clientOverrides?.name || "Client A"),
    CLIENT_B_NAME: v(clientB?.name, input.clientOverrides?.nameB || "Client B"),
    CLIENT_EMAIL: v(clientA?.email, input.clientOverrides?.email || ""),
    CLIENT_PHONE: v(clientA?.phone, ""),
    DATE: nzDate,
    SIGNOFF_DATE: nzDate,
    ENGAGEMENT_DATE: nzDate,

    ADVISER_NAME: "Craig Smith",
    ADVISER_EMAIL: "craig@smiths.net.nz",
    ADVISER_PHONE: "0274 293 939",
    ADVISER_FSP: "FSP33042",

    // Structure flags (FROM UI, never LLM)
    IS_PARTNER: uiState.isPartner,
    HAS_EXISTING_COVER: uiState.hasExistingCover,
    NEW_COVER_ONLY: !uiState.hasExistingCover,

    // Section includes (from extractor)
    LIFE_INCLUDED: si.life,
    TRAUMA_INCLUDED: si.trauma,
    TPD_INCLUDED: si.tpd,
    INCOME_MP_INCLUDED: si.incomeProtection || si.mortgageProtection,
    IP_INCLUDED: si.incomeProtection,
    MP_INCLUDED: si.mortgageProtection,
    AIC_INCLUDED: si.accidentalInjury,
    HEALTH_INCLUDED: si.health,

    // PREMIUM (all from deterministic computation)
    ...premiumSummary,

    // Client A covers
    CLIENT_A_EXISTING_INSURER: v(clientA?.existingCover.insurer, ""),
    CLIENT_A_NEW_INSURER: v(clientA?.implementedCover.insurer, ""),
    CLIENT_A_ADVICE_TYPE_LABEL: uiState.hasExistingCover
      ? `Summary of changes from ${v(clientA?.existingCover.insurer, "existing")} to ${v(clientA?.implementedCover.insurer, "new")}`
      : "",
    CLIENT_A_OLD_LIFE: v(clientA?.existingCover.covers.life),
    CLIENT_A_OLD_TRAUMA: v(clientA?.existingCover.covers.trauma),
    CLIENT_A_OLD_TPD: v(clientA?.existingCover.covers.tpd),
    CLIENT_A_OLD_IP: v(clientA?.existingCover.covers.ip),
    CLIENT_A_OLD_MP: v(clientA?.existingCover.covers.mp),
    CLIENT_A_OLD_AIC: v(clientA?.existingCover.covers.aic),
    CLIENT_A_OLD_PREMIUM_COVER: v(clientA?.existingCover.covers.premiumCover),
    CLIENT_A_NEW_LIFE: v(clientA?.implementedCover.covers.life),
    CLIENT_A_NEW_TRAUMA: v(clientA?.implementedCover.covers.trauma),
    CLIENT_A_NEW_TPD: v(clientA?.implementedCover.covers.tpd),
    CLIENT_A_NEW_IP: v(clientA?.implementedCover.covers.ip),
    CLIENT_A_NEW_MP: v(clientA?.implementedCover.covers.mp),
    CLIENT_A_NEW_AIC: v(clientA?.implementedCover.covers.aic),
    CLIENT_A_NEW_PREMIUM_COVER: v(clientA?.implementedCover.covers.premiumCover),

    // Client B covers
    CLIENT_B_EXISTING_INSURER: v(clientB?.existingCover.insurer, ""),
    CLIENT_B_NEW_INSURER: v(clientB?.implementedCover.insurer, ""),
    CLIENT_B_ADVICE_TYPE_LABEL: uiState.hasExistingCover
      ? `Summary of changes from ${v(clientB?.existingCover.insurer, "existing")} to ${v(clientB?.implementedCover.insurer, "new")}`
      : "",
    CLIENT_B_OLD_LIFE: v(clientB?.existingCover.covers.life),
    CLIENT_B_OLD_TRAUMA: v(clientB?.existingCover.covers.trauma),
    CLIENT_B_OLD_TPD: v(clientB?.existingCover.covers.tpd),
    CLIENT_B_OLD_IP: v(clientB?.existingCover.covers.ip),
    CLIENT_B_OLD_MP: v(clientB?.existingCover.covers.mp),
    CLIENT_B_OLD_AIC: v(clientB?.existingCover.covers.aic),
    CLIENT_B_OLD_PREMIUM_COVER: v(clientB?.existingCover.covers.premiumCover),
    CLIENT_B_NEW_LIFE: v(clientB?.implementedCover.covers.life),
    CLIENT_B_NEW_TRAUMA: v(clientB?.implementedCover.covers.trauma),
    CLIENT_B_NEW_TPD: v(clientB?.implementedCover.covers.tpd),
    CLIENT_B_NEW_IP: v(clientB?.implementedCover.covers.ip),
    CLIENT_B_NEW_MP: v(clientB?.implementedCover.covers.mp),
    CLIENT_B_NEW_AIC: v(clientB?.implementedCover.covers.aic),
    CLIENT_B_NEW_PREMIUM_COVER: v(clientB?.implementedCover.covers.premiumCover),

    // Benefits (deterministic)
    ...benefitsSummary,

    // Writer narratives
    SPECIAL_INSTRUCTIONS: sec("special_instructions") || factPack.shared.specialInstructions || "",
    REASON_LIFE_COVER: sec("reasons_life"),
    REASON_TRAUMA: sec("reasons_trauma"),
    REASON_PROGRESSIVE_CARE: sec("reasons_progressive_care"),
    REASON_TPD: sec("reasons_tpd"),
    REASON_INCOME_MORTGAGE: sec("reasons_income_mortgage"),
    REASON_ACCIDENTAL_INJURY: sec("reasons_aic"),
    SECTION_SUMMARY: sec("summary"),
    SECTION_REASONS: sec("summary"),
    SECTION_SCOPE: sec("scope"),
    SECTION_OUT_OF_SCOPE: sec("out_of_scope"),
    SECTION_RESPONSIBILITIES: sec("responsibilities"),
    ROA_DEVIATIONS: sec("deviations") || input.roaDeviations || "",
    MODIFICATION_NOTES: sec("modification_notes") || "",

    // Pros/cons
    LIFE_PROS: sec("pros_life"),
    LIFE_CONS: sec("cons_life"),
    TRAUMA_PROS: sec("pros_trauma"),
    TRAUMA_CONS: sec("cons_trauma"),
    TPD_PROS: sec("pros_tpd"),
    TPD_CONS: sec("cons_tpd"),
    INCOME_MP_PROS: sec("pros_income_mp"),
    INCOME_MP_CONS: sec("cons_income_mp"),
    AIC_PROS: sec("pros_aic"),
    AIC_CONS: sec("cons_aic"),
  };

  // ── Step 9: Render template ──
  console.log("[Pipeline] Rendering template...");
  const clientType = input.docType === DocType.SOE ? null : input.clientType;
  const renderedHtml = await renderTemplate(input.docType, clientType, context, uiState.hasExistingCover);

  // ── Step 10: PREFLIGHT VALIDATION (blocks PDF if fails) ──
  const validation = preflightValidate({
    uiState,
    premiumSummary,
    benefitsSummary,
    renderedHtml,
    clientAName: clientA?.name || input.clientOverrides?.name || null,
    clientBName: clientB?.name || input.clientOverrides?.nameB || null,
  });

  if (validation.errors.length > 0) {
    console.warn("[Pipeline] Validation ERRORS:", validation.errors);
  }
  if (validation.warnings.length > 0) {
    console.warn("[Pipeline] Validation warnings:", validation.warnings);
  }

  // ── Step 11: Save document + generate PDF (only if validation passes) ──
  let pdfPath: string | null = null;

  const doc = await prisma.generatedDocument.create({
    data: {
      caseId: input.caseId,
      docType: input.docType,
      extractedJson: factPack as object,
      renderedHtml,
      pdfPath: null,
    },
  });

  if (validation.valid) {
    try {
      const pdfBuffer = await generatePdf(renderedHtml);
      // PDF stored in DB via rendered HTML, generated on-the-fly for download
      pdfPath = "on-demand";
      console.log(`[Pipeline] PDF generation successful for doc ${doc.id}`);
    } catch (e) {
      console.error("[Pipeline] PDF generation failed:", e);
    }
  } else {
    console.warn(`[Pipeline] PDF blocked due to ${validation.errors.length} validation errors`);
  }

  return {
    docId: doc.id,
    renderedHtml,
    pdfPath,
    validation,
    premiumSummary: {
      existingTotal: premiumSummary.existingTotal,
      newTotal: premiumSummary.newTotal,
      delta: premiumSummary.delta,
      deltaLabel: premiumSummary.deltaLabel,
      frequency: premiumSummary.frequency,
    },
  };
}
