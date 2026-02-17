import { prisma } from "@/lib/db";
import { extractKiwisaverData } from "@/lib/llm/kiwisaver-extractor";
import { writeKiwisaverSections } from "@/lib/llm/kiwisaver-writer";
import { getProviderData } from "@/lib/providers";
import { renderTemplate, type RenderContext } from "@/lib/templates/renderer";
import { generatePdf } from "@/lib/pdf/generator";
import { validateKiwisaverHtml } from "@/lib/generation/kiwisaver-validate";
import { DocType, ClientType } from "@prisma/client";
import type { GenerateInput, GenerateResult } from "./pipeline";
import type { KiwisaverFactPack } from "@/lib/llm/kiwisaver-schemas";
import type { ProviderData } from "@/lib/llm/kiwisaver-schemas";
import { v4 as uuid } from "uuid";
import fs from "fs/promises";
import path from "path";

const DATA_DIR = process.env.DATA_DIR || "/data";

function v(val: string | number | null | undefined, fallback = ""): string {
  if (val === null || val === undefined) return fallback;
  return String(val);
}

function buildComparisonBlock(client: KiwisaverFactPack["clients"][0]): string {
  return `
<div class="info-card">
  <h4>Recommendation - ${v(client.name, "Client")}</h4>
  <div class="dual-cover-wrapper">
    <table>
      <thead>
        <tr>
          <th class="header-recommended" colspan="2">Recommended</th>
          <th class="spacer-col"></th>
          <th class="header-current" colspan="2">Current</th>
        </tr>
        <tr>
          <th style="background:var(--white);color:var(--dark);">Item</th>
          <th style="background:var(--white);color:var(--dark);">Details</th>
          <th class="spacer-col"></th>
          <th style="background:var(--white);color:var(--dark);">Item</th>
          <th style="background:var(--white);color:var(--dark);">Details</th>
        </tr>
      </thead>
      <tbody>
        <tr><td>Provider</td><td>${v(client.recommended.provider, "N/A")}</td><td class="spacer-col"></td><td>Provider</td><td>${v(client.current.provider, "N/A")}</td></tr>
        <tr><td>Fund</td><td>${v(client.recommended.fund, "N/A")}</td><td class="spacer-col"></td><td>Fund</td><td>${v(client.current.fund, "N/A")}</td></tr>
        <tr><td>Risk profile</td><td>${v(client.riskProfileOutcome, "N/A")}</td><td class="spacer-col"></td><td>Balance</td><td>${v(client.current.balance, "N/A")}</td></tr>
      </tbody>
    </table>
  </div>
</div>`;
}

function buildFeesBlock(currentData: ProviderData | null, recommendedData: ProviderData | null): string {
  const cFee = currentData?.fees.fundFeePercent || "N/A";
  const rFee = recommendedData?.fees.fundFeePercent || "N/A";
  const cAdmin = currentData?.fees.adminFee || "N/A";
  const rAdmin = recommendedData?.fees.adminFee || "N/A";

  return `
<div class="info-card">
  <h4>Fee Comparison</h4>
  <table class="data-table">
    <thead><tr><th>Fee Type</th><th>${recommendedData?.provider || "Recommended"} (${recommendedData?.fund || ""})</th><th>${currentData?.provider || "Current"} (${currentData?.fund || ""})</th></tr></thead>
    <tbody>
      <tr><td>Fund fee</td><td>${rFee}</td><td>${cFee}</td></tr>
      <tr><td>Admin / member fee</td><td>${rAdmin}</td><td>${cAdmin}</td></tr>
    </tbody>
  </table>
  ${currentData?.sources.feesUrl ? `<p class="body-text" style="font-size:8pt;color:var(--muted);">Sources: ${currentData.sources.feesUrl} | ${recommendedData?.sources.feesUrl || ""}</p>` : ""}
</div>`;
}

function buildPerformanceBlock(currentData: ProviderData | null, recommendedData: ProviderData | null): string {
  const cp = currentData?.performance || { oneYear: null, threeYear: null, fiveYear: null, sinceInception: null };
  const rp = recommendedData?.performance || { oneYear: null, threeYear: null, fiveYear: null, sinceInception: null };

  return `
<div class="info-card">
  <h4>Performance Comparison</h4>
  <table class="data-table">
    <thead><tr><th>Period</th><th>${recommendedData?.provider || "Recommended"} (${recommendedData?.fund || ""})</th><th>${currentData?.provider || "Current"} (${currentData?.fund || ""})</th></tr></thead>
    <tbody>
      <tr><td>1 Year</td><td>${rp.oneYear || "N/A"}</td><td>${cp.oneYear || "N/A"}</td></tr>
      <tr><td>3 Years (p.a.)</td><td>${rp.threeYear || "N/A"}</td><td>${cp.threeYear || "N/A"}</td></tr>
      <tr><td>5 Years (p.a.)</td><td>${rp.fiveYear || "N/A"}</td><td>${cp.fiveYear || "N/A"}</td></tr>
      <tr><td>Since inception (p.a.)</td><td>${rp.sinceInception || "N/A"}</td><td>${cp.sinceInception || "N/A"}</td></tr>
    </tbody>
  </table>
  <p class="body-text" style="font-size:8pt;color:var(--muted);">Past performance is not a reliable indicator of future performance.</p>
</div>`;
}

function buildSignatureBlock(clientName: string): string {
  return `
<div class="signature-grid single">
  <div class="sig-box">
    <div class="sig-name">${clientName}</div>
    <div class="sig-line"></div>
    <div class="sig-label">Signature</div>
    <div class="sig-line"></div>
    <div class="sig-label">Date</div>
  </div>
</div>

<div class="signature-grid single" style="margin-top:16px;">
  <div class="sig-box">
    <div class="sig-name">Craig Smith - Financial Adviser</div>
    <div class="sig-line"></div>
    <div class="sig-label">Signature</div>
    <div class="sig-line"></div>
    <div class="sig-label">Date</div>
  </div>
</div>`;
}

export async function runKiwisaverPipeline(input: GenerateInput): Promise<GenerateResult> {
  console.log(`[KiwiSaver Pipeline] Starting for case ${input.caseId}`);

  // Step 1: Save inputs if requested
  if (input.saveCase) {
    await prisma.case.update({
      where: { id: input.caseId },
      data: {
        firefliesText: input.firefliesText || null,
        quotesText: input.quotesText || null,
        otherDocsText: input.otherDocsText || null,
        additionalContext: input.additionalContext || null,
      },
    });
  }

  // Step 2: Extract KiwiSaver facts
  console.log("[KiwiSaver Pipeline] Extracting facts...");
  const factPack = await extractKiwisaverData({
    firefliesText: input.firefliesText,
    quotesText: input.quotesText,
    otherDocsText: input.otherDocsText,
    additionalContext: input.additionalContext,
    clientOverrides: input.clientOverrides,
    docType: "SOA",
  });

  // Override client name from UI if provided
  const client = factPack.clients[0];
  if (input.clientOverrides?.name && !client.name) {
    client.name = input.clientOverrides.name;
  }

  // Step 3: Fetch provider data deterministically
  console.log("[KiwiSaver Pipeline] Fetching provider data...");
  let currentProviderData: ProviderData | null = null;
  let recommendedProviderData: ProviderData | null = null;

  try {
    if (client.current.provider && client.current.fund) {
      currentProviderData = await getProviderData(client.current.provider, client.current.fund);
    }
    if (client.recommended.provider && client.recommended.fund) {
      recommendedProviderData = await getProviderData(client.recommended.provider, client.recommended.fund);
    }
  } catch (err) {
    console.warn("[KiwiSaver Pipeline] Provider fetch failed:", err);
  }

  // Step 4: Writer - generate narrative sections
  console.log("[KiwiSaver Pipeline] Writing sections...");
  const writerOutput = await writeKiwisaverSections(factPack);

  const sec = (key: string): string => {
    if (writerOutput.sections[key]?.included) return writerOutput.sections[key].html || "";
    return "";
  };

  // Step 5: Build render context
  const nzDate = new Date().toLocaleDateString("en-NZ", {
    timeZone: "Pacific/Auckland",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const clientName = v(client.name, input.clientOverrides?.name || "Client");

  const context: RenderContext = {
    BODY_CLASS: "production",
    CLIENTS_PREPARED_FOR: clientName,
    ADVICE_DATE_LONG: factPack.caseMeta.adviceDate || nzDate,
    CLIENT_1_NAME: clientName,
    MEETING_DATE_LONG: v(factPack.caseMeta.meetingDate, nzDate),
    CLIENT_1_AGE: v(client.age),
    CLIENT_1_INCOME_ANNUAL: v(client.incomeAnnual),
    CLIENT_1_EMPLOYEE_CONTRIB: v(client.employeeContrib, "3%"),
    CLIENT_1_EMPLOYER_CONTRIB: v(client.employerContrib, "3%"),
    CLIENT_1_CURRENT_PROVIDER: v(client.current.provider),
    CLIENT_1_CURRENT_FUND: v(client.current.fund),
    CLIENT_1_CURRENT_BALANCE: v(client.current.balance),
    CLIENT_1_GOAL: v(client.goal),
    DATA_AS_AT_DATE: recommendedProviderData?.asAtDate || nzDate,

    // Scope checkboxes
    CLIENT_1_SCOPE_RISK_PROFILE_CLASS: client.scopeSelections.riskProfile ? "checked" : "",
    CLIENT_1_SCOPE_FUND_REVIEW_CLASS: client.scopeSelections.fundReview ? "checked" : "",
    CLIENT_1_SCOPE_CONTRIBUTIONS_CLASS: client.scopeSelections.contributions ? "checked" : "",
    CLIENT_1_SCOPE_WITHDRAWALS_CLASS: client.scopeSelections.withdrawals ? "checked" : "",
    CLIENT_1_SCOPE_LIMITED_ADVICE_CLASS: client.scopeSelections.limitedAdvice ? "checked" : "",

    // Writer sections
    SPECIAL_INSTRUCTIONS_HTML: sec("special_instructions") || v(factPack.narrativeInputs.specialInstructionsHtml),
    RECOMMENDATION_SUMMARY_PARAGRAPH: sec("recommendation_summary") || v(factPack.narrativeInputs.recommendationSummaryParagraph),
    PROJECTIONS_EXPLANATION_PARAGRAPH: sec("projections_explanation") || v(factPack.narrativeInputs.projectionsExplanationParagraph),

    // Projections
    PROJECTION_TIMEFRAME: v(client.timeframe),
    PROJECTION_BALANCE: v(client.projections?.projectedBalance),
    PROJECTION_WEEKLY_INCOME: v(client.projections?.projectedWeeklyIncome),
    PROJECTION_ASSUMPTIONS: v(client.projections?.assumptions),

    // Block injections
    RECOMMENDATION_COMPARISON_BLOCKS: buildComparisonBlock(client),
    FEES_TABLE_BLOCKS: buildFeesBlock(currentProviderData, recommendedProviderData),
    PERFORMANCE_TABLE_BLOCKS: buildPerformanceBlock(currentProviderData, recommendedProviderData),
    SIGNATURE_BLOCKS: buildSignatureBlock(clientName),

    // Declaration
    DECLARATION_INTRO: `I, <strong><em>${clientName}</em></strong>, have read and understand this KiwiSaver Statement of Advice and wish to:`,
    MODIFICATION_NOTES_HTML: "",
  };

  // Step 6: Render template
  console.log("[KiwiSaver Pipeline] Rendering template...");
  const renderedHtml = await renderTemplate(
    DocType.KIWISAVER,
    ClientType.INDIVIDUAL,
    context,
    false
  );

  // Step 7: Validate
  const warnings = validateKiwisaverHtml(renderedHtml, clientName);
  if (warnings.length > 0) {
    console.warn("[KiwiSaver Pipeline] Validation warnings:", warnings);
  }

  // Step 8: Generate PDF
  let pdfPath: string | null = null;
  try {
    console.log("[KiwiSaver Pipeline] Generating PDF...");
    const pdfBuffer = await generatePdf(renderedHtml);
    const docId = uuid();
    const pdfDir = path.join(DATA_DIR, "pdfs", input.caseId);
    await fs.mkdir(pdfDir, { recursive: true });
    pdfPath = path.join(pdfDir, `${docId}.pdf`);
    await fs.writeFile(pdfPath, pdfBuffer);
    console.log("[KiwiSaver Pipeline] PDF saved:", pdfPath);
  } catch (err) {
    console.error("[KiwiSaver Pipeline] PDF generation failed:", err);
  }

  // Step 9: Save document record
  const doc = await prisma.generatedDocument.create({
    data: {
      caseId: input.caseId,
      docType: DocType.KIWISAVER,
      extractedJson: JSON.parse(JSON.stringify(factPack)),
      renderedHtml,
      pdfPath,
    },
  });

  console.log(`[KiwiSaver Pipeline] Complete: docId=${doc.id}`);

  return {
    docId: doc.id,
    renderedHtml,
    pdfPath,
  };
}
