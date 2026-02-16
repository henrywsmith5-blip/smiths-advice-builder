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

/** Cover type aliases for flexible matching */
const COVER_ALIASES: Record<string, string[]> = {
  life: ["life", "life cover", "life insurance", "life - lump sum", "life - drip feed"],
  trauma: ["trauma", "progressive care", "critical", "trauma insurance", "progressive care / trauma"],
  tpd: ["tpd", "total and permanent", "total & permanent", "permanent disability"],
  income: ["income protection", "income", "ip"],
  mortgage: ["mortgage protection", "mortgage", "mp"],
  accident: ["accidental injury", "accident", "aic", "accidental"],
  premium: ["premium cover", "premium waiver", "premium protection"],
  health: ["health", "health insurance", "medical", "hospital"],
};

/** Find a cover item by type with fuzzy matching across aliases */
function findCover(covers: CoverItem[], type: string): string {
  if (!covers || covers.length === 0) return "N/A";
  const aliases = COVER_ALIASES[type.toLowerCase()] || [type.toLowerCase()];
  for (const alias of aliases) {
    const item = covers.find(c => c.coverType.toLowerCase().includes(alias));
    if (item?.sumInsured) return item.sumInsured;
  }
  return "N/A";
}

/** Check if ANY cover of a type exists in a covers array */
function hasCoverType(covers: CoverItem[], type: string): boolean {
  const aliases = COVER_ALIASES[type.toLowerCase()] || [type.toLowerCase()];
  return covers.some(c => aliases.some(a => c.coverType.toLowerCase().includes(a)));
}

/** Safe string value */
function v(val: string | null | undefined, fallback = "N/A"): string {
  return val || fallback;
}

/** Parse a premium amount from various formats */
function parsePremiumAmount(block: { premiumAmount?: number | null; totalPremium?: string | null } | null): number | null {
  if (!block) return null;
  if (block.premiumAmount !== null && block.premiumAmount !== undefined) return block.premiumAmount;
  if (block.totalPremium) {
    const cleaned = block.totalPremium.replace(/[,$\s]/g, "").split("/")[0].replace(/per.*$/, "").trim();
    const num = parseFloat(cleaned);
    return isNaN(num) ? null : num;
  }
  return null;
}

/** Detect frequency from various fields in the fact pack */
function detectFrequency(fp: FactPack): PremiumFrequency {
  // Check all possible sources
  const sources: (string | null | undefined)[] = [];

  for (const ec of fp.existingCover) {
    sources.push(ec.premiumFrequency, ec.totalPremium);
  }
  for (const rc of fp.recommendedCover) {
    sources.push(rc.premiumFrequency, rc.totalPremium);
  }

  for (const s of sources) {
    if (!s) continue;
    const lower = s.toLowerCase();
    if (lower.includes("fortnight")) return "fortnight";
    if (lower.includes("week") && !lower.includes("fortnight")) return "fortnight"; // weekly → treat as fortnight for now
    if (lower.includes("month")) return "month";
    if (lower.includes("year") || lower.includes("annual")) return "year";
  }
  return "month";
}

/** Derive which sections are included from actual cover data (fallback when scope not populated) */
function deriveSectionsFromCovers(fp: FactPack): Record<string, boolean> {
  const allCovers: CoverItem[] = [
    ...fp.recommendedCover.flatMap(r => r.covers),
    ...fp.existingCover.flatMap(e => e.covers),
  ];

  return {
    life: hasCoverType(allCovers, "life"),
    trauma: hasCoverType(allCovers, "trauma"),
    tpd: hasCoverType(allCovers, "tpd"),
    incomeProtection: hasCoverType(allCovers, "income"),
    mortgageProtection: hasCoverType(allCovers, "mortgage"),
    accidentalInjury: hasCoverType(allCovers, "accident"),
    health: hasCoverType(allCovers, "health"),
  };
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
  const clientA = factPack.clients[0];
  const clientB = factPack.clients.length > 1 ? factPack.clients[1] : null;

  const clientAName = clientA?.fullName || input.clientOverrides?.name || "Client A";
  const clientBName = clientB?.fullName || input.clientOverrides?.nameB || "Client B";

  // Match cover blocks to clients (flexible: by first name, label, or position)
  type CoverBlock = FactPack["existingCover"][number];
  type RecBlock = FactPack["recommendedCover"][number];

  function matchCoverBlock<T extends { clientName: string }>(blocks: T[], name: string, label: string, idx: number): T | null {
    const firstName = name.split(" ")[0];
    return blocks.find(b =>
      b.clientName?.toLowerCase().includes(firstName.toLowerCase()) ||
      b.clientName?.toLowerCase().includes(label.toLowerCase())
    ) || (blocks.length > idx ? blocks[idx] : null) || null;
  }

  const existCoverA: CoverBlock | null = matchCoverBlock(factPack.existingCover, clientAName, "client a", 0);
  const existCoverB: CoverBlock | null = matchCoverBlock(factPack.existingCover, clientBName, "client b", 1);
  const recCoverA: RecBlock | null = matchCoverBlock(factPack.recommendedCover, clientAName, "client a", 0);
  const recCoverB: RecBlock | null = matchCoverBlock(factPack.recommendedCover, clientBName, "client b", 1);

  console.log(`[Pipeline] Cover blocks: existA=${!!existCoverA}, existB=${!!existCoverB}, recA=${!!recCoverA}, recB=${!!recCoverB}`);

  const freq = detectFrequency(factPack);

  // ── Step 6: DETERMINISTIC premium math ──
  const premiumSummary = computePremiumSummary(
    {
      existingAmount: parsePremiumAmount(existCoverA),
      newAmount: parsePremiumAmount(recCoverA),
      frequency: freq,
    },
    uiState.isPartner ? {
      existingAmount: parsePremiumAmount(existCoverB),
      newAmount: parsePremiumAmount(recCoverB),
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

  // ── Step 8: Sections included (derive from covers if scope not populated) ──
  const scopeClient = factPack.scopeOfAdvice.perClient[0];
  const scopePopulated = scopeClient && (scopeClient.lifeInsurance || scopeClient.traumaInsurance || scopeClient.tpdInsurance || scopeClient.incomeProtection || scopeClient.healthInsurance);
  const derived = deriveSectionsFromCovers(factPack);

  const si = scopePopulated
    ? { lifeInsurance: scopeClient.lifeInsurance, traumaInsurance: scopeClient.traumaInsurance, tpdInsurance: scopeClient.tpdInsurance, incomeProtection: scopeClient.incomeProtection, redundancyCover: scopeClient.redundancyCover, healthInsurance: scopeClient.healthInsurance }
    : { lifeInsurance: derived.life, traumaInsurance: derived.trauma, tpdInsurance: derived.tpd, incomeProtection: derived.incomeProtection, redundancyCover: derived.mortgageProtection, healthInsurance: derived.health };

  console.log(`[Pipeline] Sections (${scopePopulated ? "from scope" : "derived from covers"}): life=${si.lifeInsurance} trauma=${si.traumaInsurance} tpd=${si.tpdInsurance} ip=${si.incomeProtection}`);

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
    AIC_INCLUDED: derived.accidentalInjury || (recCoverA?.covers || []).some(c => c.coverType.toLowerCase().includes("accident")),
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
