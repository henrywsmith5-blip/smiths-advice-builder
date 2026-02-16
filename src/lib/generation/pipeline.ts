import { prisma } from "@/lib/db";
import { getLLMProvider, type ExtractInput } from "@/lib/llm/provider";
import { renderTemplate, type RenderContext } from "@/lib/templates/renderer";
import { generatePdf } from "@/lib/pdf/generator";
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
  console.log("[Pipeline] Extraction complete");

  // ── Step 3: LLM Writer ──
  console.log("[Pipeline] Running writer...");
  const writerOutput = await llm.writeSections(extractedJson, input.docType);
  console.log("[Pipeline] Writer complete");

  // ── Step 4: Compute cover logic ──
  const hasAnyExistingCover =
    input.clientType === ClientType.INDIVIDUAL
      ? input.clientAHasExisting
      : input.clientAHasExisting || input.clientBHasExisting;

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

  const existingCovers = extractedJson.existing_cover?.covers || {};
  const newCovers = extractedJson.new_cover?.covers || {};

  const context: RenderContext = {
    // Client info
    CLIENT_NAME: extractedJson.client.name || input.clientOverrides?.name || "Client",
    CLIENT_A_NAME: extractedJson.client.name || input.clientOverrides?.name || "Client A",
    CLIENT_B_NAME: extractedJson.client.name_b || input.clientOverrides?.nameB || "Client B",
    CLIENT_EMAIL: extractedJson.client.email || input.clientOverrides?.email || "",
    CLIENT_PHONE: extractedJson.client.phone || "",
    DATE: nzDate,
    SIGNOFF_DATE: nzDate,
    ENGAGEMENT_DATE: nzDate,

    // Adviser defaults
    ADVISER_NAME: "Craig Smith",
    ADVISER_EMAIL: "craig@smiths.net.nz",
    ADVISER_PHONE: "0274 293 939",
    ADVISER_FSP: "FSP33042",

    // Structure flags
    IS_PARTNER: input.clientType === ClientType.PARTNER,
    HAS_EXISTING_COVER: hasAnyExistingCover,
    NEW_COVER_ONLY: !hasAnyExistingCover,

    // Section includes
    LIFE_INCLUDED: extractedJson.sections.life?.included ?? false,
    TRAUMA_INCLUDED: extractedJson.sections.trauma?.included ?? false,
    TPD_INCLUDED: extractedJson.sections.tpd?.included ?? false,
    INCOME_MP_INCLUDED: extractedJson.sections.income_protection?.included ?? false,
    IP_INCLUDED: extractedJson.sections.income_protection?.included ?? false,
    MP_INCLUDED: extractedJson.sections.mortgage?.included ?? false,
    AIC_INCLUDED: extractedJson.sections.other?.included ?? false,
    PREMIUM_COVER_INCLUDED: false,

    // Premium data
    OLD_INSURER: extractedJson.existing_cover?.insurer || "",
    NEW_INSURER: extractedJson.new_cover?.insurer || "",
    OLD_PREMIUM: extractedJson.existing_cover?.premium || "",
    NEW_PREMIUM: extractedJson.new_cover?.premium || "",
    PREMIUM_FREQUENCY: "per month",
    PREMIUM_CHANGE_LABEL: "Savings",
    PREMIUM_CHANGE: "",
    MONTHLY_SAVINGS: "",
    ANNUAL_SAVINGS: "",

    // Client A existing cover
    CLIENT_A_EXISTING_INSURER: extractedJson.existing_cover?.insurer || "",
    CLIENT_A_ADVICE_TYPE_LABEL: hasAnyExistingCover ? "Summary of changes — migration from existing cover" : "",
    CLIENT_A_OLD_LIFE: existingCovers["CLIENT_A_OLD_LIFE"] || existingCovers["OLD_LIFE"] || "N/A",
    CLIENT_A_OLD_TRAUMA: existingCovers["CLIENT_A_OLD_TRAUMA"] || existingCovers["OLD_TRAUMA"] || "N/A",
    CLIENT_A_OLD_TPD: existingCovers["CLIENT_A_OLD_TPD"] || existingCovers["OLD_TPD"] || "N/A",
    CLIENT_A_OLD_IP: existingCovers["CLIENT_A_OLD_IP"] || existingCovers["OLD_IP"] || "N/A",
    CLIENT_A_OLD_MP: existingCovers["CLIENT_A_OLD_MP"] || existingCovers["OLD_MP"] || "N/A",
    CLIENT_A_OLD_AIC: existingCovers["CLIENT_A_OLD_AIC"] || existingCovers["OLD_AIC"] || "N/A",
    CLIENT_A_OLD_PREMIUM_COVER: existingCovers["CLIENT_A_OLD_PREMIUM_COVER"] || "N/A",

    // Client A new cover
    CLIENT_A_NEW_INSURER: extractedJson.new_cover?.insurer || "",
    CLIENT_A_NEW_LIFE: newCovers["CLIENT_A_NEW_LIFE"] || newCovers["NEW_LIFE"] || "N/A",
    CLIENT_A_NEW_TRAUMA: newCovers["CLIENT_A_NEW_TRAUMA"] || newCovers["NEW_TRAUMA"] || "N/A",
    CLIENT_A_NEW_TPD: newCovers["CLIENT_A_NEW_TPD"] || newCovers["NEW_TPD"] || "N/A",
    CLIENT_A_NEW_IP: newCovers["CLIENT_A_NEW_IP"] || newCovers["NEW_IP"] || "N/A",
    CLIENT_A_NEW_MP: newCovers["CLIENT_A_NEW_MP"] || newCovers["NEW_MP"] || "N/A",
    CLIENT_A_NEW_AIC: newCovers["CLIENT_A_NEW_AIC"] || newCovers["NEW_AIC"] || "N/A",
    CLIENT_A_NEW_PREMIUM_COVER: newCovers["CLIENT_A_NEW_PREMIUM_COVER"] || "N/A",

    // Client B existing cover
    CLIENT_B_EXISTING_INSURER: existingCovers["CLIENT_B_EXISTING_INSURER"] || extractedJson.existing_cover?.insurer || "",
    CLIENT_B_ADVICE_TYPE_LABEL: hasAnyExistingCover ? "Summary of changes — migration from existing cover" : "",
    CLIENT_B_OLD_LIFE: existingCovers["CLIENT_B_OLD_LIFE"] || "N/A",
    CLIENT_B_OLD_TRAUMA: existingCovers["CLIENT_B_OLD_TRAUMA"] || "N/A",
    CLIENT_B_OLD_TPD: existingCovers["CLIENT_B_OLD_TPD"] || "N/A",
    CLIENT_B_OLD_IP: existingCovers["CLIENT_B_OLD_IP"] || "N/A",
    CLIENT_B_OLD_MP: existingCovers["CLIENT_B_OLD_MP"] || "N/A",
    CLIENT_B_OLD_AIC: existingCovers["CLIENT_B_OLD_AIC"] || "N/A",
    CLIENT_B_OLD_PREMIUM_COVER: existingCovers["CLIENT_B_OLD_PREMIUM_COVER"] || "N/A",

    // Client B new cover
    CLIENT_B_NEW_INSURER: newCovers["CLIENT_B_NEW_INSURER"] || extractedJson.new_cover?.insurer || "",
    CLIENT_B_NEW_LIFE: newCovers["CLIENT_B_NEW_LIFE"] || "N/A",
    CLIENT_B_NEW_TRAUMA: newCovers["CLIENT_B_NEW_TRAUMA"] || "N/A",
    CLIENT_B_NEW_TPD: newCovers["CLIENT_B_NEW_TPD"] || "N/A",
    CLIENT_B_NEW_IP: newCovers["CLIENT_B_NEW_IP"] || "N/A",
    CLIENT_B_NEW_MP: newCovers["CLIENT_B_NEW_MP"] || "N/A",
    CLIENT_B_NEW_AIC: newCovers["CLIENT_B_NEW_AIC"] || "N/A",
    CLIENT_B_NEW_PREMIUM_COVER: newCovers["CLIENT_B_NEW_PREMIUM_COVER"] || "N/A",

    // Writer section HTML snippets
    SPECIAL_INSTRUCTIONS: sec("special_instructions"),
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

    // Benefits summary
    MP_MONTHLY: sec("mp_monthly") || "N/A",
    MP_WAIT: sec("mp_wait") || "N/A",
    MP_BENEFIT_PERIOD: sec("mp_benefit_period") || "N/A",
    MP_PREMIUM: sec("mp_premium") || "N/A",
    IP_MONTHLY: sec("ip_monthly") || "N/A",
    IP_WAIT: sec("ip_wait") || "N/A",
    IP_BENEFIT_PERIOD: sec("ip_benefit_period") || "N/A",
    IP_PREMIUM: sec("ip_premium") || "N/A",
  };

  // ── Step 6: Render template ──
  console.log("[Pipeline] Rendering template...");
  const clientType = input.docType === DocType.SOE ? null : input.clientType;
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
