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

const PROVIDER_LOGO_MAP: Record<string, string> = {
  milford: "/images/providers/milford.png",
  fisher: "/images/providers/fisher.png",
  "fisher funds": "/images/providers/fisher.png",
};

function getProviderLogo(name: string | null | undefined): string {
  if (!name) return "";
  return PROVIDER_LOGO_MAP[name.toLowerCase().trim()] || "";
}

function providerLogoBadge(name: string | null | undefined): string {
  const logo = getProviderLogo(name);
  if (logo) return `<div class="provider-logo-badge"><img src="${logo}" alt="${name}"></div>`;
  if (name) return `<div style="font-weight:700;font-size:12pt;margin-bottom:6px;">${name}</div>`;
  return "";
}

function providerLogoInline(name: string | null | undefined): string {
  const logo = getProviderLogo(name);
  if (logo) return `<img class="provider-logo" src="${logo}" alt="${name}">`;
  if (name) return `<strong>${name}</strong>`;
  return "";
}

function buildComparisonBlock(client: KiwisaverFactPack["clients"][0]): string {
  const recBadge = providerLogoBadge(client.recommended.provider);
  const curBadge = providerLogoBadge(client.current.provider);

  return `
<div class="info-card">
  <h4>Recommendation - ${v(client.name, "Client")}</h4>
  <div class="dual-cover-wrapper">
    <table>
      <thead>
        <tr>
          <th class="header-recommended" colspan="2">
            <div class="provider-header-cell">${recBadge}<div class="provider-header-label">Recommended</div></div>
          </th>
          <th class="spacer-col"></th>
          <th class="header-current" colspan="2">
            <div class="provider-header-cell">${curBadge}<div class="provider-header-label">Current</div></div>
          </th>
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

function ksVal(val: string | null | undefined): string {
  if (!val || val === "N/A") return `<td class="ks-row-val na">—</td>`;
  return `<td class="ks-row-val">${val}</td>`;
}

function ksProviderHead(name: string | null | undefined, fund: string | null | undefined, tag: string): string {
  const logo = getProviderLogo(name);
  const logoHtml = logo ? `<img src="${logo}" alt="${name}">` : `<div style="font-weight:700;font-size:11pt;color:var(--dark);margin-bottom:4px;">${name || ""}</div>`;
  return `<th class="ks-provider-head">${logoHtml}<div class="ks-fund-name">${fund || ""}</div><div class="ks-provider-tag">${tag}</div></th>`;
}

function buildFeesBlock(currentData: ProviderData | null, recommendedData: ProviderData | null): string {
  const hasCurrent = !!(currentData?.provider);

  const feeSummary = buildFeeSummary(recommendedData, currentData);

  return `
<div class="info-card">
  <h4>Fee Comparison</h4>
  <table class="ks-compare">
    <thead>
      <tr>
        <th class="ks-label-head" style="width:180px;"></th>
        ${ksProviderHead(recommendedData?.provider, recommendedData?.fund, "Recommended")}
        ${hasCurrent ? ksProviderHead(currentData?.provider, currentData?.fund, "Current") : ""}
      </tr>
    </thead>
    <tbody>
      <tr class="ks-row"><td class="ks-row-label">Fund management fee (p.a.)</td>${ksVal(recommendedData?.fees.fundFeePercent)}${hasCurrent ? ksVal(currentData?.fees.fundFeePercent) : ""}</tr>
      <tr class="ks-row"><td class="ks-row-label">Admin / member fee</td>${ksVal(recommendedData?.fees.adminFee)}${hasCurrent ? ksVal(currentData?.fees.adminFee) : ""}</tr>
      <tr class="ks-row"><td class="ks-row-label">Other fees</td>${ksVal(recommendedData?.fees.other)}${hasCurrent ? ksVal(currentData?.fees.other) : ""}</tr>
    </tbody>
  </table>
  ${feeSummary}
</div>`;
}

function buildFeeSummary(recommendedData: ProviderData | null, currentData: ProviderData | null): string {
  const recName = recommendedData?.provider || "the recommended provider";
  const recFund = recommendedData?.fund || "the recommended fund";
  const recFee = recommendedData?.fees.fundFeePercent;

  if (recFee && currentData?.fees.fundFeePercent) {
    const rNum = parseFloat(recFee.replace("%", ""));
    const cNum = parseFloat(currentData.fees.fundFeePercent.replace("%", ""));
    if (!isNaN(rNum) && !isNaN(cNum)) {
      const diff = Math.abs(rNum - cNum).toFixed(2);
      if (rNum < cNum) {
        return `<p class="body-text" style="margin-top:10px;">The ${recName} ${recFund} has a fund fee of ${recFee} p.a., which is ${diff}% lower than your current provider. Over a long investment horizon, lower fees compound and can make a meaningful difference to your retirement balance.</p>`;
      } else if (rNum > cNum) {
        return `<p class="body-text" style="margin-top:10px;">The ${recName} ${recFund} has a fund fee of ${recFee} p.a., which is ${diff}% higher than your current provider. While fees are important, they should be considered alongside fund performance, investment approach, and alignment with your risk profile and goals.</p>`;
      } else {
        return `<p class="body-text" style="margin-top:10px;">Both providers charge a comparable fund fee of ${recFee} p.a. The fee difference is negligible, so the recommendation is based on fund performance, investment approach, and suitability for your risk profile.</p>`;
      }
    }
  }

  if (recFee) {
    return `<p class="body-text" style="margin-top:10px;">The ${recName} ${recFund} charges a fund fee of ${recFee} per annum. This fee is deducted from your investment returns and covers fund management costs. Fees compound over time and can significantly impact long-term outcomes.</p>`;
  }

  return `<p class="body-text" style="margin-top:10px;">Fees are charged as a percentage of your fund balance and are deducted from your investment returns. Even small differences in fees can compound over time and impact your retirement balance.</p>`;
}

function buildPerformanceBlock(currentData: ProviderData | null, recommendedData: ProviderData | null): string {
  const cp = currentData?.performance || { oneYear: null, threeYear: null, fiveYear: null, sinceInception: null };
  const rp = recommendedData?.performance || { oneYear: null, threeYear: null, fiveYear: null, sinceInception: null };
  const hasCurrent = !!currentData?.provider;

  return `
<div class="info-card">
  <h4>Annualised Returns</h4>
  <table class="ks-compare">
    <thead>
      <tr>
        <th class="ks-label-head" style="width:180px;"></th>
        ${ksProviderHead(recommendedData?.provider, recommendedData?.fund, "Recommended")}
        ${hasCurrent ? ksProviderHead(currentData?.provider, currentData?.fund, "Current") : ""}
      </tr>
    </thead>
    <tbody>
      <tr class="ks-row"><td class="ks-row-label">1 year return (p.a.)</td>${ksVal(rp.oneYear)}${hasCurrent ? ksVal(cp.oneYear) : ""}</tr>
      <tr class="ks-row"><td class="ks-row-label">3 year return (p.a.)</td>${ksVal(rp.threeYear)}${hasCurrent ? ksVal(cp.threeYear) : ""}</tr>
      <tr class="ks-row"><td class="ks-row-label">5 year return (p.a.)</td>${ksVal(rp.fiveYear)}${hasCurrent ? ksVal(cp.fiveYear) : ""}</tr>
      <tr class="ks-row"><td class="ks-row-label">Since inception (p.a.)</td>${ksVal(rp.sinceInception)}${hasCurrent ? ksVal(cp.sinceInception) : ""}</tr>
    </tbody>
  </table>
  <p class="body-text" style="font-size:7.5pt;color:var(--muted);margin-top:10px;">Annualised returns shown after fees and before tax. Past performance is not a reliable indicator of future performance.</p>
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

  const clientAge = client.age ? Number(client.age) : null;
  const yearsTo65 = clientAge ? Math.max(0, 65 - clientAge) : null;

  const context: RenderContext = {
    BODY_CLASS: "production",
    CLIENTS_PREPARED_FOR: clientName,
    ADVICE_DATE_LONG: factPack.caseMeta.adviceDate || nzDate,
    CLIENT_1_NAME: clientName,
    MEETING_DATE_LONG: v(factPack.caseMeta.meetingDate, nzDate),
    CLIENT_1_AGE: v(client.age),
    CLIENT_1_YEARS_TO_65: yearsTo65 !== null ? String(yearsTo65) : "",
    CLIENT_1_EMPLOYMENT_STATUS: v(client.employmentStatus),
    CLIENT_1_INCOME_ANNUAL: v(client.incomeAnnual),
    CLIENT_1_PIR: v(client.pir),
    CLIENT_1_EMPLOYEE_CONTRIB: v(client.employeeContrib, "3%"),
    CLIENT_1_EMPLOYER_CONTRIB: v(client.employerContrib, "3%"),
    CLIENT_1_CURRENT_PROVIDER: v(client.current.provider),
    CLIENT_1_CURRENT_FUND: v(client.current.fund),
    CLIENT_1_CURRENT_BALANCE: v(client.current.balance),
    CLIENT_1_GOAL: v(client.goal),
    CLIENT_1_TIMEFRAME: v(client.timeframe),
    CLIENT_1_FIRST_HOME_INTENTION: client.firstHomeIntention ? "true" : "",
    CLIENT_1_FIRST_HOME_TIMEFRAME: v(client.firstHomeTimeframe),
    CLIENT_1_RISK_PROFILE_OUTCOME: v(client.riskProfileOutcome, "To be determined"),
    CLIENT_1_RISK_TOLERANCE: v(client.riskTolerance, "To be assessed"),
    CLIENT_1_RISK_CAPACITY: v(client.riskCapacity, "To be assessed"),
    CLIENT_1_ESG_PREFERENCE: v(client.esgPreference),
    CLIENT_1_OTHER_ASSETS_DEBTS: v(client.otherAssetsDebts),
    CLIENT_1_EMERGENCY_FUND: v(client.emergencyFund),
    CLIENT_1_RECOMMENDED_CONTRIB_RATE: v(client.recommendedContribRate),
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
    RISK_PROFILE_NARRATIVE: sec("risk_profile_narrative") || v(factPack.narrativeInputs.riskProfileNarrativeHtml),
    STRATEGY_NARRATIVE: sec("strategy_narrative") || v(factPack.narrativeInputs.strategyNarrativeHtml),

    // Projections (only shown if at least one value exists)
    HAS_PROJECTIONS: !!(client.timeframe || client.projections?.projectedBalance || client.projections?.projectedWeeklyIncome || client.projections?.assumptions),
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
