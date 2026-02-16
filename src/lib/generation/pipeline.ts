import { prisma } from "@/lib/db";
import { getLLMProvider, type ExtractInput } from "@/lib/llm/provider";
import type { FactPack, CoverItem } from "@/lib/llm/schemas";
import { renderTemplate, type RenderContext } from "@/lib/templates/renderer";
import { generatePdf } from "@/lib/pdf/generator";
import { computePremiumSummary, type UIState, type PremiumFrequency } from "./premium";
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

// ── Helpers ──

/** Find a cover item by type (case-insensitive partial match) */
function findCover(covers: CoverItem[], type: string): string {
  const t = type.toLowerCase();
  const item = covers.find(c => c.coverType.toLowerCase().includes(t));
  return item?.sumInsured || "N/A";
}

/** Safe string value */
function v(val: string | null | undefined, fallback = "N/A"): string {
  return val || fallback;
}

/** Detect frequency from various string formats */
function detectFrequency(fp: FactPack): PremiumFrequency {
  // Check caseMeta first (if present from old schema)
  const meta = fp as Record<string, unknown>;
  if (meta.caseMeta && typeof meta.caseMeta === "object") {
    const cm = meta.caseMeta as Record<string, unknown>;
    if (cm.frequency === "fortnight" || cm.frequency === "month" || cm.frequency === "year") {
      return cm.frequency as PremiumFrequency;
    }
  }
  // Check existing/recommended cover premium frequencies
  for (const ec of fp.existingCover) {
    if (ec.premiumFrequency?.toLowerCase().includes("fortnight")) return "fortnight";
    if (ec.premiumFrequency?.toLowerCase().includes("month")) return "month";
    if (ec.premiumFrequency?.toLowerCase().includes("year")) return "year";
  }
  for (const rc of fp.recommendedCover) {
    if (rc.premiumFrequency?.toLowerCase().includes("fortnight")) return "fortnight";
    if (rc.premiumFrequency?.toLowerCase().includes("month")) return "month";
    if (rc.premiumFrequency?.toLowerCase().includes("year")) return "year";
  }
  return "month";
}

export async function runGenerationPipeline(input: GenerateInput): Promise<GenerateResult> {
  const llm = getLLMProvider();
  console.log(`[Pipeline] Starting ${input.docType} for case ${input.caseId}`);

  // ── Step 1: UI State (SOURCE OF TRUTH) ──
  const uiState: UIState = {
    isPartner: input.clientType === ClientType.PARTNER,
    clientAHasExisting: input.clientAHasExisting,
    clientBHasExisting: input.clientBHasExisting,
    hasExistingCover: input.clientAHasExisting || input.clientBHasExisting,
  };

  // ── Step 2: Save inputs ──
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

  // ── Step 3: LLM Extractor ──
  console.log("[Pipeline] Running extractor...");
  const factPack = await llm.extractCaseJson({
    docType: input.docType,
    clientOverrides: input.clientOverrides,
    firefliesText: input.firefliesText,
    quotesText: input.quotesText,
    otherDocsText: input.otherDocsText,
    additionalContext: input.additionalContext,
    roaDeviations: input.roaDeviations,
  });
  console.log(`[Pipeline] Extracted: ${factPack.clients.length} clients, ${factPack.existingCover.length} existing, ${factPack.recommendedCover.length} recommended`);

  // ── Step 4: LLM Writer ──
  console.log("[Pipeline] Running writer...");
  const writerOutput = await llm.writeSections(factPack, input.docType);
  console.log("[Pipeline] Writer complete");

  // ── Step 5: Map fact pack to template variables ──
  // Get client data
  const clientA = factPack.clients[0];
  const clientB = factPack.clients.length > 1 ? factPack.clients[1] : null;

  // Get existing/recommended cover blocks per client
  const clientAName = clientA?.fullName || input.clientOverrides?.name || "Client A";
  const clientBName = clientB?.fullName || input.clientOverrides?.nameB || "Client B";

  const existA = factPack.existingCover.find(e => e.clientName?.includes(clientAName.split(" ")[0]) || e.clientName?.includes("Client A") || e.clientName?.includes("A"));
  const existB = factPack.existingCover.find(e => e.clientName?.includes(clientBName.split(" ")[0]) || e.clientName?.includes("Client B") || e.clientName?.includes("B"));
  const recA = factPack.recommendedCover.find(r => r.clientName?.includes(clientAName.split(" ")[0]) || r.clientName?.includes("Client A") || r.clientName?.includes("A"));
  const recB = factPack.recommendedCover.find(r => r.clientName?.includes(clientBName.split(" ")[0]) || r.clientName?.includes("Client B") || r.clientName?.includes("B"));

  // Fallbacks: if only one block and not partner, use it for A
  const existCoverA = existA || (factPack.existingCover.length === 1 ? factPack.existingCover[0] : null);
  const existCoverB = existB || null;
  const recCoverA = recA || (factPack.recommendedCover.length === 1 ? factPack.recommendedCover[0] : null);
  const recCoverB = recB || null;

  const freq = detectFrequency(factPack);

  // ── Step 6: DETERMINISTIC premium math ──
  const premiumSummary = computePremiumSummary(
    {
      existingAmount: existCoverA?.premiumAmount ?? null,
      newAmount: recCoverA?.premiumAmount ?? null,
      frequency: freq,
    },
    uiState.isPartner ? {
      existingAmount: existCoverB?.premiumAmount ?? null,
      newAmount: recCoverB?.premiumAmount ?? null,
      frequency: freq,
    } : null,
    uiState,
    freq
  );
  console.log(`[Pipeline] Premium: ${premiumSummary.OLD_PREMIUM} → ${premiumSummary.NEW_PREMIUM} (${premiumSummary.PREMIUM_CHANGE_LABEL})`);

  // ── Step 7: DETERMINISTIC benefits ──
  const benefitsSummary = buildBenefitsSummary(
    clientAName,
    factPack.benefitsSummaryA || null,
    uiState.isPartner ? clientBName : null,
    factPack.benefitsSummaryB || null,
    uiState
  );

  // ── Step 8: Sections included ──
  const si = factPack.scopeOfAdvice.perClient[0] || { lifeInsurance: false, traumaInsurance: false, tpdInsurance: false, incomeProtection: false, redundancyCover: false, healthInsurance: false };

  // ── Step 9: Build Nunjucks context ──
  const sec = (key: string): string => {
    const s = writerOutput.sections as Record<string, { included: boolean; html: string }> | undefined;
    if (s && key in s) return s[key].html || "";
    return "";
  };

  const nzDate = new Date().toLocaleDateString("en-NZ", {
    timeZone: "Pacific/Auckland", day: "numeric", month: "long", year: "numeric",
  });

  const existCoversA = existCoverA?.covers || [];
  const existCoversB = existCoverB?.covers || [];
  const newCoversA = recCoverA?.covers || [];
  const newCoversB = recCoverB?.covers || [];

  const context: RenderContext = {
    CLIENT_NAME: clientAName,
    CLIENT_A_NAME: clientAName,
    CLIENT_B_NAME: clientBName,
    CLIENT_EMAIL: v(clientA?.email, input.clientOverrides?.email || ""),
    CLIENT_PHONE: v(clientA?.phone, ""),
    DATE: nzDate,
    SIGNOFF_DATE: nzDate,
    ENGAGEMENT_DATE: nzDate,

    ADVISER_NAME: factPack.documentMetadata.adviserName || "Craig Smith",
    ADVISER_EMAIL: "craig@smiths.net.nz",
    ADVISER_PHONE: "0274 293 939",
    ADVISER_FSP: `FSP${factPack.documentMetadata.adviserFapLicence || "33042"}`,

    IS_PARTNER: uiState.isPartner,
    HAS_EXISTING_COVER: uiState.hasExistingCover,
    NEW_COVER_ONLY: !uiState.hasExistingCover,

    // Section includes
    LIFE_INCLUDED: si.lifeInsurance,
    TRAUMA_INCLUDED: si.traumaInsurance,
    TPD_INCLUDED: si.tpdInsurance,
    INCOME_MP_INCLUDED: si.incomeProtection || si.redundancyCover,
    IP_INCLUDED: si.incomeProtection,
    MP_INCLUDED: si.redundancyCover,
    AIC_INCLUDED: newCoversA.some(c => c.coverType.toLowerCase().includes("accident")),
    HEALTH_INCLUDED: si.healthInsurance,

    // Premium (deterministic)
    ...premiumSummary,

    // Client A existing covers (from covers array)
    CLIENT_A_EXISTING_INSURER: v(existCoverA?.insurer, ""),
    CLIENT_A_NEW_INSURER: v(recCoverA?.insurer, ""),
    CLIENT_A_ADVICE_TYPE_LABEL: uiState.hasExistingCover
      ? `Summary of changes from ${v(existCoverA?.insurer, "existing")} to ${v(recCoverA?.insurer, "new")}`
      : "",
    CLIENT_A_OLD_LIFE: findCover(existCoversA, "life"),
    CLIENT_A_OLD_TRAUMA: findCover(existCoversA, "trauma"),
    CLIENT_A_OLD_TPD: findCover(existCoversA, "tpd"),
    CLIENT_A_OLD_IP: findCover(existCoversA, "income"),
    CLIENT_A_OLD_MP: findCover(existCoversA, "mortgage"),
    CLIENT_A_OLD_AIC: findCover(existCoversA, "accident"),
    CLIENT_A_OLD_PREMIUM_COVER: findCover(existCoversA, "premium"),

    CLIENT_A_NEW_LIFE: findCover(newCoversA, "life"),
    CLIENT_A_NEW_TRAUMA: findCover(newCoversA, "trauma"),
    CLIENT_A_NEW_TPD: findCover(newCoversA, "tpd"),
    CLIENT_A_NEW_IP: findCover(newCoversA, "income"),
    CLIENT_A_NEW_MP: findCover(newCoversA, "mortgage"),
    CLIENT_A_NEW_AIC: findCover(newCoversA, "accident"),
    CLIENT_A_NEW_PREMIUM_COVER: findCover(newCoversA, "premium"),

    // Client B
    CLIENT_B_EXISTING_INSURER: v(existCoverB?.insurer, ""),
    CLIENT_B_NEW_INSURER: v(recCoverB?.insurer, ""),
    CLIENT_B_ADVICE_TYPE_LABEL: uiState.hasExistingCover
      ? `Summary of changes from ${v(existCoverB?.insurer, "existing")} to ${v(recCoverB?.insurer, "new")}`
      : "",
    CLIENT_B_OLD_LIFE: findCover(existCoversB, "life"),
    CLIENT_B_OLD_TRAUMA: findCover(existCoversB, "trauma"),
    CLIENT_B_OLD_TPD: findCover(existCoversB, "tpd"),
    CLIENT_B_OLD_IP: findCover(existCoversB, "income"),
    CLIENT_B_OLD_MP: findCover(existCoversB, "mortgage"),
    CLIENT_B_OLD_AIC: findCover(existCoversB, "accident"),
    CLIENT_B_OLD_PREMIUM_COVER: findCover(existCoversB, "premium"),

    CLIENT_B_NEW_LIFE: findCover(newCoversB, "life"),
    CLIENT_B_NEW_TRAUMA: findCover(newCoversB, "trauma"),
    CLIENT_B_NEW_TPD: findCover(newCoversB, "tpd"),
    CLIENT_B_NEW_IP: findCover(newCoversB, "income"),
    CLIENT_B_NEW_MP: findCover(newCoversB, "mortgage"),
    CLIENT_B_NEW_AIC: findCover(newCoversB, "accident"),
    CLIENT_B_NEW_PREMIUM_COVER: findCover(newCoversB, "premium"),

    // Benefits (deterministic)
    ...benefitsSummary,

    // Writer narratives
    SPECIAL_INSTRUCTIONS: sec("special_instructions") || factPack.specialInstructions || "",
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

  // ── Step 10: Render template ──
  console.log("[Pipeline] Rendering template...");
  const clientType = input.docType === DocType.SOE ? null : input.clientType;
  const renderedHtml = await renderTemplate(input.docType, clientType, context, uiState.hasExistingCover);

  // ── Step 11: PREFLIGHT VALIDATION ──
  const validation = preflightValidate({
    uiState,
    premiumSummary,
    benefitsSummary,
    renderedHtml,
    clientAName: clientA?.fullName || input.clientOverrides?.name || null,
    clientBName: clientB?.fullName || input.clientOverrides?.nameB || null,
  });

  if (validation.errors.length > 0) console.warn("[Pipeline] ERRORS:", validation.errors);
  if (validation.warnings.length > 0) console.warn("[Pipeline] Warnings:", validation.warnings);

  // ── Step 12: Save doc + PDF ──
  const doc = await prisma.generatedDocument.create({
    data: {
      caseId: input.caseId,
      docType: input.docType,
      extractedJson: factPack as object,
      renderedHtml,
      pdfPath: null,
    },
  });

  let pdfPath: string | null = null;
  if (validation.valid) {
    try {
      await generatePdf(renderedHtml);
      pdfPath = "on-demand";
    } catch (e) {
      console.error("[Pipeline] PDF generation failed:", e);
    }
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
