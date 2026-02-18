import { prisma } from "@/lib/db";
import { getLLMProvider, type ExtractInput } from "@/lib/llm/provider";
import { renderTemplate, type RenderContext } from "@/lib/templates/renderer";
import { generatePdf } from "@/lib/pdf/generator";
import { computePremiumSummary, parseDollar, type PremiumFrequency, type UIState, type ClientPremiumData } from "@/lib/generation/premium";
import { DocType, ClientType } from "@prisma/client";
import { v4 as uuid } from "uuid";
import fs from "fs/promises";
import path from "path";

const DATA_DIR = process.env.DATA_DIR || "/data";

export interface GenerateInput {
  caseId: string;
  docType: DocType;
  firefliesText?: string;
  quotesText?: string;
  otherDocsText?: string;
  additionalContext?: string;
  roaDeviations?: string;
  clientOverrides?: {
    name?: string;
    nameB?: string;
    email?: string;
  };
  clientType: ClientType;
  clientAHasExisting: boolean;
  clientBHasExisting: boolean;
  saveCase: boolean;
}

export interface GenerateResult {
  docId: string;
  renderedHtml: string;
  pdfPath: string | null;
}

export async function runGenerationPipeline(
  input: GenerateInput
): Promise<GenerateResult> {
  // KiwiSaver has its own pipeline with different data shape
  if (input.docType === DocType.KIWISAVER) {
    const { runKiwisaverPipeline } = await import("./kiwisaver-pipeline");
    return runKiwisaverPipeline(input);
  }

  const llm = getLLMProvider();

  console.log(`[Pipeline] Starting ${input.docType} generation for case ${input.caseId}`);

  // ── Step 1: Save inputs if requested ──
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
        retentionDeleteAt: new Date(
          Date.now() +
            (parseInt(process.env.RETENTION_DAYS || "7") * 24 * 60 * 60 * 1000)
        ),
      },
    });
  }

  // ── Step 2: LLM Extractor ──
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

  const extractedJson = await llm.extractCaseJson(extractInput);
  console.log(`[Pipeline] Extraction complete: clientA=${extractedJson.client.name_a}, clientB=${extractedJson.client.name_b}`);
  console.log(`[Pipeline] Insurers: existA=${extractedJson.client_a_existing_insurer}, newA=${extractedJson.client_a_new_insurer}`);
  console.log(`[Pipeline] CoverA new: life=${extractedJson.client_a_new_cover.life}, trauma=${extractedJson.client_a_new_cover.trauma}`);
  console.log(`[Pipeline] Premium: existing=${extractedJson.premium.existing_total}, new=${extractedJson.premium.new_total}, freq=${extractedJson.premium.frequency}`);

  // ── Step 3: LLM Writer ──
  console.log("[Pipeline] Running writer...");
  const writerOutput = await llm.writeSections(extractedJson, input.docType);
  console.log("[Pipeline] Writer complete");

  // ── Step 4: Compute cover logic ──
  // Auto-detect from extracted data if user didn't toggle manually
  const clientAHasExisting = input.clientAHasExisting || !!extractedJson.client_a_existing_insurer;
  const clientBHasExisting = input.clientBHasExisting || !!extractedJson.client_b_existing_insurer;
  const isPartner = input.clientType === ClientType.PARTNER || !!extractedJson.client.name_b;
  const effectiveClientType = isPartner ? ClientType.PARTNER : ClientType.INDIVIDUAL;

  const hasAnyExistingCover = effectiveClientType === ClientType.INDIVIDUAL
    ? clientAHasExisting
    : clientAHasExisting || clientBHasExisting;

  console.log(`[Pipeline] Detected: partner=${isPartner}, existingCover=${hasAnyExistingCover}, clientA=${extractedJson.client.name_a}, clientB=${extractedJson.client.name_b}`);

  // ── Step 5: Build render context ──
  // Helper to safely access writer sections by string key
  const sec = (key: string): string => {
    const s = writerOutput.sections as Record<string, { included: boolean; html: string }> | undefined;
    if (s && key in s) return s[key].html || "";
    return "";
  };

  const nzDate = new Date().toLocaleDateString("en-NZ", {
    timeZone: "Pacific/Auckland", day: "numeric", month: "long", year: "numeric",
  });

  const insurerLogoMap: Record<string, string> = {
    "aia": "/images/insurers/aia.png",
    "asteron": "/images/insurers/asteron.png",
    "chubb": "/images/insurers/chubb.png",
    "fidelity life": "/images/insurers/fidelity.png",
    "fidelity": "/images/insurers/fidelity.png",
    "nib": "/images/insurers/nib.png",
    "partners life": "/images/insurers/partners.png",
    "partners": "/images/insurers/partners.png",
    "pinnacle": "/images/insurers/pinnacle.png",
  };
  const getInsurerLogo = (name: string | null | undefined): string => {
    if (!name) return "";
    return insurerLogoMap[name.toLowerCase().trim()] || "";
  };

  const buildInsurerLogos = (mainInsurer: string | null | undefined, healthInsurer: string | null | undefined): Array<{src: string; alt: string}> => {
    const seen = new Set<string>();
    const logos: Array<{src: string; alt: string}> = [];
    for (const name of [mainInsurer, healthInsurer]) {
      if (!name) continue;
      const key = name.toLowerCase().trim();
      if (seen.has(key)) continue;
      seen.add(key);
      const logo = getInsurerLogo(name);
      if (logo) logos.push({ src: logo, alt: name });
    }
    return logos;
  };

  // Direct field mapping from schema → template variables
  const d = extractedJson;
  const v = (val: string | null | undefined, fallback = "-") => val || fallback;
  // For cover cells: show "Not included" instead of just a dash
  const vc = (val: string | null | undefined) => val || "Not included";

  const context: RenderContext = {
    // Client info
    CLIENT_NAME: v(d.client.name_a, input.clientOverrides?.name || "Client"),
    CLIENT_A_NAME: v(d.client.name_a, input.clientOverrides?.name || "Client A"),
    CLIENT_B_NAME: v(d.client.name_b, input.clientOverrides?.nameB || "Client B"),
    CLIENT_EMAIL: v(d.client.email, input.clientOverrides?.email || ""),
    CLIENT_PHONE: v(d.client.phone, ""),
    DATE: nzDate,
    SIGNOFF_DATE: nzDate,
    ENGAGEMENT_DATE: nzDate,

    // Adviser
    ADVISER_NAME: "Craig Smith",
    ADVISER_EMAIL: "craig@smiths.net.nz",
    ADVISER_PHONE: "0274 293 939",
    ADVISER_FSP: "FSP33042",

    // Structure flags (auto-detected from extraction)
    IS_PARTNER: isPartner,
    HAS_EXISTING_COVER: hasAnyExistingCover,
    NEW_COVER_ONLY: !hasAnyExistingCover,

    // Section includes (from extractor)
    LIFE_INCLUDED: d.sections_included.life,
    TRAUMA_INCLUDED: d.sections_included.trauma,
    TPD_INCLUDED: d.sections_included.tpd,
    INCOME_MP_INCLUDED: d.sections_included.income_protection || d.sections_included.mortgage_protection,
    IP_INCLUDED: d.sections_included.income_protection,
    MP_INCLUDED: d.sections_included.mortgage_protection,
    AIC_INCLUDED: d.sections_included.accidental_injury,
    HEALTH_INCLUDED: d.sections_included.health,

    // Premium — deterministic computation, never from LLM
    ...(() => {
      const freqStr = (d.premium.frequency || "per month").toLowerCase();
      const freq: PremiumFrequency = freqStr.includes("fortnight") ? "fortnight" : freqStr.includes("year") ? "year" : "month";
      const uiPrem: UIState = { isPartner, clientAHasExisting: clientAHasExisting, clientBHasExisting, hasExistingCover: hasAnyExistingCover };
      const clientAPrem: ClientPremiumData = {
        existingAmount: parseDollar(d.premium.existing_total),
        newAmount: parseDollar(d.premium.new_total),
        frequency: freq,
      };
      const clientBPrem: ClientPremiumData | null = isPartner ? {
        existingAmount: null,
        newAmount: null,
        frequency: freq,
      } : null;
      const ps = computePremiumSummary(clientAPrem, clientBPrem, uiPrem, freq);
      return {
        OLD_PREMIUM: ps.OLD_PREMIUM,
        NEW_PREMIUM: ps.NEW_PREMIUM,
        PREMIUM_FREQUENCY: ps.PREMIUM_FREQUENCY,
        PREMIUM_CHANGE_LABEL: ps.PREMIUM_CHANGE_LABEL,
        PREMIUM_CHANGE: ps.PREMIUM_CHANGE,
        MONTHLY_SAVINGS: ps.MONTHLY_SAVINGS,
        ANNUAL_SAVINGS: ps.ANNUAL_SAVINGS,
      };
    })(),

    // Client A — existing cover
    CLIENT_A_EXISTING_INSURER: v(d.client_a_existing_insurer, ""),
    CLIENT_A_EXISTING_INSURER_LOGO: getInsurerLogo(d.client_a_existing_insurer),
    CLIENT_A_EXISTING_INSURER_LOGOS: buildInsurerLogos(d.client_a_existing_insurer, d.client_a_existing_health_insurer),
    CLIENT_A_ADVICE_TYPE_LABEL: hasAnyExistingCover
      ? `Summary of changes from ${v(d.client_a_existing_insurer, "existing insurer")} to ${v(d.client_a_new_insurer, "new insurer")}`
      : "",
    CLIENT_A_OLD_LIFE: vc(d.client_a_old_cover.life),
    CLIENT_A_OLD_TRAUMA: vc(d.client_a_old_cover.trauma),
    CLIENT_A_OLD_TPD: vc(d.client_a_old_cover.tpd),
    CLIENT_A_OLD_IP: vc(d.client_a_old_cover.income_protection),
    CLIENT_A_OLD_MP: vc(d.client_a_old_cover.mortgage_protection),
    CLIENT_A_OLD_AIC: vc(d.client_a_old_cover.accidental_injury),
    CLIENT_A_OLD_PREMIUM_COVER: vc(d.client_a_old_cover.premium_cover),
    CLIENT_A_OLD_HEALTH: d.client_a_old_cover.health ? "Yes" : "Not included",

    // Client A — new cover
    CLIENT_A_NEW_INSURER: v(d.client_a_new_insurer, ""),
    CLIENT_A_NEW_INSURER_LOGO: getInsurerLogo(d.client_a_new_insurer),
    CLIENT_A_NEW_INSURER_LOGOS: buildInsurerLogos(d.client_a_new_insurer, d.client_a_new_health_insurer),
    CLIENT_A_NEW_LIFE: vc(d.client_a_new_cover.life),
    CLIENT_A_NEW_TRAUMA: vc(d.client_a_new_cover.trauma),
    CLIENT_A_NEW_TPD: vc(d.client_a_new_cover.tpd),
    CLIENT_A_NEW_IP: vc(d.client_a_new_cover.income_protection),
    CLIENT_A_NEW_MP: vc(d.client_a_new_cover.mortgage_protection),
    CLIENT_A_NEW_AIC: vc(d.client_a_new_cover.accidental_injury),
    CLIENT_A_NEW_PREMIUM_COVER: vc(d.client_a_new_cover.premium_cover),
    CLIENT_A_NEW_HEALTH: d.client_a_new_cover.health ? "Yes" : "Not included",

    // Client B — existing cover
    CLIENT_B_EXISTING_INSURER: v(d.client_b_existing_insurer, ""),
    CLIENT_B_EXISTING_INSURER_LOGO: getInsurerLogo(d.client_b_existing_insurer),
    CLIENT_B_EXISTING_INSURER_LOGOS: buildInsurerLogos(d.client_b_existing_insurer, d.client_b_existing_health_insurer),
    CLIENT_B_ADVICE_TYPE_LABEL: hasAnyExistingCover
      ? `Summary of changes from ${v(d.client_b_existing_insurer, "existing insurer")} to ${v(d.client_b_new_insurer, "new insurer")}`
      : "",
    CLIENT_B_OLD_LIFE: vc(d.client_b_old_cover.life),
    CLIENT_B_OLD_TRAUMA: vc(d.client_b_old_cover.trauma),
    CLIENT_B_OLD_TPD: vc(d.client_b_old_cover.tpd),
    CLIENT_B_OLD_IP: vc(d.client_b_old_cover.income_protection),
    CLIENT_B_OLD_MP: vc(d.client_b_old_cover.mortgage_protection),
    CLIENT_B_OLD_AIC: vc(d.client_b_old_cover.accidental_injury),
    CLIENT_B_OLD_PREMIUM_COVER: vc(d.client_b_old_cover.premium_cover),
    CLIENT_B_OLD_HEALTH: d.client_b_old_cover.health ? "Yes" : "Not included",

    // Client B — new cover
    CLIENT_B_NEW_INSURER: v(d.client_b_new_insurer, ""),
    CLIENT_B_NEW_INSURER_LOGO: getInsurerLogo(d.client_b_new_insurer),
    CLIENT_B_NEW_INSURER_LOGOS: buildInsurerLogos(d.client_b_new_insurer, d.client_b_new_health_insurer),
    CLIENT_B_NEW_LIFE: vc(d.client_b_new_cover.life),
    CLIENT_B_NEW_TRAUMA: vc(d.client_b_new_cover.trauma),
    CLIENT_B_NEW_TPD: vc(d.client_b_new_cover.tpd),
    CLIENT_B_NEW_IP: vc(d.client_b_new_cover.income_protection),
    CLIENT_B_NEW_MP: vc(d.client_b_new_cover.mortgage_protection),
    CLIENT_B_NEW_AIC: vc(d.client_b_new_cover.accidental_injury),
    CLIENT_B_NEW_PREMIUM_COVER: vc(d.client_b_new_cover.premium_cover),
    CLIENT_B_NEW_HEALTH: d.client_b_new_cover.health ? "Yes" : "Not included",

    // Benefits summary — Client A (from extractor)
    MP_MONTHLY: v(d.benefits.mortgage_protection.monthly_amount, "N/A"),
    MP_WAIT: v(d.benefits.mortgage_protection.wait_period, "N/A"),
    MP_BENEFIT_PERIOD: v(d.benefits.mortgage_protection.benefit_period, "N/A"),
    MP_PREMIUM: v(d.benefits.mortgage_protection.premium, "N/A"),
    IP_MONTHLY: v(d.benefits.income_protection.monthly_amount, "N/A"),
    IP_WAIT: v(d.benefits.income_protection.wait_period, "N/A"),
    IP_BENEFIT_PERIOD: v(d.benefits.income_protection.benefit_period, "N/A"),
    IP_PREMIUM: v(d.benefits.income_protection.premium, "N/A"),

    // Benefits summary — Client B (partner only, from benefits_b)
    CLIENT_B_MP_MONTHLY: v(d.benefits_b.mortgage_protection.monthly_amount, "N/A"),
    CLIENT_B_MP_WAIT: v(d.benefits_b.mortgage_protection.wait_period, "N/A"),
    CLIENT_B_MP_BENEFIT_PERIOD: v(d.benefits_b.mortgage_protection.benefit_period, "N/A"),
    CLIENT_B_MP_PREMIUM: v(d.benefits_b.mortgage_protection.premium, "N/A"),
    CLIENT_B_IP_MONTHLY: v(d.benefits_b.income_protection.monthly_amount, "N/A"),
    CLIENT_B_IP_WAIT: v(d.benefits_b.income_protection.wait_period, "N/A"),
    CLIENT_B_IP_BENEFIT_PERIOD: v(d.benefits_b.income_protection.benefit_period, "N/A"),
    CLIENT_B_IP_PREMIUM: v(d.benefits_b.income_protection.premium, "N/A"),

    // Writer narrative sections
    SPECIAL_INSTRUCTIONS: sec("special_instructions") || d.special_instructions || "",
    REASON_LIFE_COVER: sec("reasons_life"),
    REASON_TRAUMA: sec("reasons_trauma"),
    REASON_PROGRESSIVE_CARE: sec("reasons_progressive_care"),
    REASON_TPD: sec("reasons_tpd"),
    REASON_INCOME_MORTGAGE: sec("reasons_income_mortgage"),
    REASON_ACCIDENTAL_INJURY: sec("reasons_aic"),
    REASON_HEALTH: sec("reasons_health"),
    SECTION_SUMMARY: sec("summary"),
    SECTION_REASONS: sec("summary"),
    SECTION_SCOPE: sec("scope"),
    SECTION_OUT_OF_SCOPE: sec("out_of_scope"),
    SECTION_RESPONSIBILITIES: sec("responsibilities"),
    ROA_DEVIATIONS: sec("deviations") || input.roaDeviations || "",
    MODIFICATION_NOTES: sec("modification_notes") || "",

    // Pros/cons (from writer)
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

  // ── Step 6: Render template ──
  console.log("[Pipeline] Rendering template...");
  const clientType = input.docType === DocType.SOE ? null : effectiveClientType;
  const renderedHtml = await renderTemplate(input.docType, clientType, context, hasAnyExistingCover);

  // ── Step 7: Generate PDF ──
  console.log("[Pipeline] Generating PDF...");
  let pdfPath: string | null = null;
  try {
    const pdfBuffer = await generatePdf(renderedHtml);
    const docId = uuid();

    // Save PDF to disk
    const dir = path.join(DATA_DIR, "pdfs", input.caseId);
    await fs.mkdir(dir, { recursive: true });
    pdfPath = path.join(dir, `${docId}.pdf`);
    await fs.writeFile(pdfPath, pdfBuffer);
    console.log(`[Pipeline] PDF saved: ${pdfPath}`);

    // ── Step 8: Save generated document record ──
    const doc = await prisma.generatedDocument.create({
      data: {
        id: docId,
        caseId: input.caseId,
        docType: input.docType,
        extractedJson: extractedJson as object,
        renderedHtml,
        pdfPath,
      },
    });

    return {
      docId: doc.id,
      renderedHtml,
      pdfPath,
    };
  } catch (pdfError) {
    console.error("[Pipeline] PDF generation failed:", pdfError);
    // Still save the document without PDF
    const doc = await prisma.generatedDocument.create({
      data: {
        caseId: input.caseId,
        docType: input.docType,
        extractedJson: extractedJson as object,
        renderedHtml,
        pdfPath: null,
      },
    });

    return {
      docId: doc.id,
      renderedHtml,
      pdfPath: null,
    };
  }
}
