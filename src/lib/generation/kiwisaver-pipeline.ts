import { prisma } from "@/lib/db";
import { extractKiwisaverData } from "@/lib/llm/kiwisaver-extractor";
import { writeKiwisaverSections } from "@/lib/llm/kiwisaver-writer";
import { getProviderData, getFundDescription } from "@/lib/providers";
import type { FundDescription, AssetAllocation } from "@/lib/providers";
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

function buildComparisonBlock(
  client: KiwisaverFactPack["clients"][0],
  recDesc: FundDescription | null,
  recData: ProviderData | null,
  recommendationSummaryHtml: string,
): string {
  const recLogo = getProviderLogo(client.recommended.provider);
  const recLogoHtml = recLogo
    ? `<img src="${recLogo}" alt="${client.recommended.provider}" style="height:108px;width:auto;display:block;margin-bottom:14px;">`
    : "";

  const panelRows = [
    { label: "Provider", value: v(client.recommended.provider, "-") },
    { label: "Fund", value: v(client.recommended.fund, "-") },
    { label: "Risk profile", value: v(client.riskProfileOutcome, "-") },
  ];
  if (recData?.fees.fundFeePercent) panelRows.push({ label: "Total fee (p.a.)", value: recData.fees.fundFeePercent });
  if (recDesc) {
    panelRows.push({ label: "Min. timeframe", value: recDesc.minTimeframe });
    panelRows.push({ label: "Risk indicator", value: `${recDesc.riskIndicator} / 7` });
  }

  const panelHtml = panelRows.map(r =>
    `<div class="rec-row"><span class="rec-label">${r.label}</span><span class="rec-value">${r.value}</span></div>`
  ).join("\n          ");

  const allocBar = recDesc ? `
    <div class="alloc-bar-wrap">
      <div class="alloc-bar-label">Target asset allocation</div>
      <div class="alloc-bar">
        <div class="alloc-growth" style="width:${recDesc.growthPercent}%;"></div>
        <div class="alloc-income" style="width:${recDesc.incomePercent}%;"></div>
      </div>
      <div class="alloc-bar-legend">
        <span class="leg-growth">Growth ${recDesc.growthPercent}%</span>
        <span class="leg-income">Income ${recDesc.incomePercent}%</span>
      </div>
    </div>` : "";

  const currentSummary = client.current.provider ? `
  <div class="info-card" style="margin-top:var(--sp-sm);">
    <h4>Your current position</h4>
    <table class="ks-compare">
      <tbody>
        <tr class="ks-row"><td class="ks-row-label" style="width:180px;">Provider</td><td style="padding:10px 16px;font-size:10pt;">${v(client.current.provider, "-")}</td></tr>
        <tr class="ks-row"><td class="ks-row-label" style="width:180px;">Fund</td><td style="padding:10px 16px;font-size:10pt;">${v(client.current.fund, "-")}</td></tr>
        ${client.current.balance ? `<tr class="ks-row"><td class="ks-row-label" style="width:180px;">Balance</td><td style="padding:10px 16px;font-size:10pt;">${client.current.balance}</td></tr>` : ""}
      </tbody>
    </table>
  </div>` : "";

  return `
<div class="rec-layout">
  <div class="rec-text">
    ${recommendationSummaryHtml}
    ${currentSummary}
  </div>
  <div class="rec-panel">
    ${recLogoHtml}
    <div class="rec-panel-title">Recommendation summary</div>
    ${panelHtml}
    ${allocBar}
  </div>
</div>`;
}

function ksVal(val: string | null | undefined): string {
  if (!val || val === "N/A") return `<td class="ks-row-val na">-</td>`;
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
        <th class="ks-label-head" style="width:220px;"></th>
        ${ksProviderHead(recommendedData?.provider, recommendedData?.fund, "Recommended")}
        ${hasCurrent ? ksProviderHead(currentData?.provider, currentData?.fund, "Current") : ""}
      </tr>
    </thead>
    <tbody>
      <tr class="ks-row"><td class="ks-row-label">Manager's base fee (p.a.)</td>${ksVal(recommendedData?.fees.other)}${hasCurrent ? ksVal(currentData?.fees.other) : ""}</tr>
      <tr class="ks-row"><td class="ks-row-label">Other management &amp; admin charges</td>${ksVal(recommendedData?.fees.adminFee)}${hasCurrent ? ksVal(currentData?.fees.adminFee) : ""}</tr>
      <tr class="ks-row"><td class="ks-row-label"><strong>Total estimated annual fund charges</strong></td>${ksVal(recommendedData?.fees.fundFeePercent)}${hasCurrent ? ksVal(currentData?.fees.fundFeePercent) : ""}</tr>
    </tbody>
  </table>
  ${feeSummary}
  <p class="body-text" style="font-size:7.5pt;color:var(--muted);margin-top:8px;">Fee data sourced from provider disclosure documents${recommendedData?.sources.feesUrl ? ': <a href="' + recommendedData.sources.feesUrl + '" style="color:var(--bronze);">' + recommendedData.sources.feesUrl + '</a>' : ''}${currentData?.sources.feesUrl ? ' and <a href="' + currentData.sources.feesUrl + '" style="color:var(--bronze);">' + currentData.sources.feesUrl + '</a>' : ''}.</p>
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
  <p class="body-text" style="font-size:7.5pt;color:var(--muted);margin-top:10px;">Annualised returns shown after fees and before tax. Past performance is not a reliable indicator of future performance.${recommendedData?.sources.performanceUrl ? ' Source: <a href="' + recommendedData.sources.performanceUrl + '" style="color:var(--bronze);">' + recommendedData.sources.performanceUrl + '</a>' : ''}.</p>
</div>`;
}

// ═══ SVG DONUT CHART GENERATOR ═══

const ALLOC_COLORS: Record<string, string> = {
  cash: "#C4B5A0",
  nzFixedInterest: "#A39580",
  intlFixedInterest: "#8A7B66",
  ausEquities: "#B07D56",
  intlEquities: "#8C5E3C",
  listedProperty: "#D4A872",
  unlistedProperty: "#E6CCAB",
};

const ALLOC_LABELS: Record<string, string> = {
  cash: "Cash",
  nzFixedInterest: "NZ Fixed Interest",
  intlFixedInterest: "Int'l Fixed Interest",
  ausEquities: "Australasian Equities",
  intlEquities: "International Equities",
  listedProperty: "Listed Property",
  unlistedProperty: "Unlisted Property",
};

function buildDonutSvg(alloc: AssetAllocation, riskIndicator: number, fundName: string): string {
  const entries = Object.entries(alloc)
    .filter(([, pct]) => (pct as number) > 0)
    .map(([key, pct]) => ({ key, pct: pct as number, color: ALLOC_COLORS[key] || "#CCC", label: ALLOC_LABELS[key] || key }));

  const cx = 90, cy = 90, r = 70, stroke = 28;
  const circumference = 2 * Math.PI * r;
  let offset = 0;

  const segments = entries.map(e => {
    const dashLen = (e.pct / 100) * circumference;
    const gap = circumference - dashLen;
    const seg = `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${e.color}" stroke-width="${stroke}" stroke-dasharray="${dashLen} ${gap}" stroke-dashoffset="${-offset}" transform="rotate(-90 ${cx} ${cy})"/>`;
    offset += dashLen;
    return seg;
  });

  const riskDots = Array.from({ length: 7 }, (_, i) =>
    `<rect x="${14 + i * 23}" y="0" width="18" height="6" rx="1" fill="${i < riskIndicator ? '#B07D56' : '#E6E1DA'}"/>`
  ).join("");

  const legendItems = entries.map((e, i) =>
    `<g transform="translate(0, ${i * 18})">
      <rect width="10" height="10" rx="1" fill="${e.color}"/>
      <text x="14" y="9" font-family="'Satoshi', sans-serif" font-size="8" fill="#3D3D3D">${e.label} ${e.pct}%</text>
    </g>`
  ).join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 ${200 + entries.length * 18}" width="180">
  <g>${segments.join("")}</g>
  <text x="${cx}" y="${cy - 6}" text-anchor="middle" font-family="'Instrument Serif', serif" font-size="18" fill="#1A1A1A">${fundName}</text>
  <text x="${cx}" y="${cy + 12}" text-anchor="middle" font-family="'Satoshi', sans-serif" font-size="8" fill="#7A7A7A" letter-spacing="0.08em" text-transform="uppercase">FUND</text>
  <g transform="translate(10, 190)">${riskDots}</g>
  <text x="10" y="206" font-family="'Satoshi', sans-serif" font-size="7" fill="#7A7A7A" letter-spacing="0.06em">RISK INDICATOR</text>
  <g transform="translate(10, 220)">${legendItems}</g>
</svg>`;
}

// ═══ FUND STRUCTURE & INVESTMENT COMPOSITION SECTION ═══

function buildFundBreakdownSection(
  provider: string,
  fund: string,
  desc: FundDescription,
  logo: string,
): string {
  const donut = buildDonutSvg(desc.allocation, desc.riskIndicator, fund);

  const feeRows = [
    { label: "Manager's base fee", value: desc.fees.baseFee },
  ];
  if (desc.fees.otherCharges !== "N/A") {
    feeRows.push({ label: "Other management & admin", value: desc.fees.otherCharges });
  }
  if (desc.fees.performanceFee !== "N/A") {
    feeRows.push({ label: "Estimated performance fee", value: desc.fees.performanceFee });
  }
  feeRows.push({ label: "Total estimated annual charge", value: desc.fees.totalEstimated });

  const feeTableHtml = feeRows.map(r =>
    `<div class="fb-fee-row"><span class="fb-fee-label">${r.label}</span><span class="fb-fee-value">${r.value}</span></div>`
  ).join("\n");

  const perfFeeNote = desc.fees.performanceFeeDetail
    ? `<p class="body-text" style="font-size:8.5pt;color:var(--muted);margin-top:6px;">${desc.fees.performanceFeeDetail}</p>`
    : "";

  const totalFeeNum = parseFloat(desc.fees.totalEstimated.replace("%", ""));
  const tenKFee = !isNaN(totalFeeNum) ? `$${(totalFeeNum * 100).toFixed(0)}` : "-";
  const hundredKFee = !isNaN(totalFeeNum) ? `$${(totalFeeNum * 1000).toFixed(0)}` : "-";

  const allocEntries = Object.entries(desc.allocation)
    .filter(([, pct]) => (pct as number) > 0)
    .map(([key, pct]) => ({ label: ALLOC_LABELS[key] || key, pct: pct as number, isGrowth: ["ausEquities", "intlEquities", "listedProperty", "unlistedProperty"].includes(key) }));

  const incomeItems = allocEntries.filter(e => !e.isGrowth);
  const growthItems = allocEntries.filter(e => e.isGrowth);

  const logoHtml = logo ? `<img src="${logo}" alt="${provider}" style="height:54px;width:auto;display:block;margin-bottom:8px;">` : "";

  return `
<div class="fb-section">
  <div class="fb-layout">
    <div class="fb-text">
      ${logoHtml}
      <div class="fb-section-title">Fund Structure & Investment Composition</div>
      <p class="body-text" style="margin-bottom:var(--sp-sm);">${desc.objective}</p>
      <p class="body-text" style="font-size:9pt;color:var(--muted);margin-bottom:var(--sp-md);"><strong>Suitable for:</strong> ${desc.suitableFor}</p>

      <div class="fb-sub-title">Fee structure</div>
      <div class="fb-fee-table">${feeTableHtml}</div>
      ${perfFeeNote}
      <p class="body-text" style="font-size:8.5pt;color:var(--muted);margin-top:8px;">On a $10,000 balance, total annual fees would be approximately <strong>${tenKFee}</strong>. On a $100,000 balance, approximately <strong>${hundredKFee}</strong>. These fees compound over time - even small differences can materially affect your retirement balance over 20-30 years.</p>

      <div class="fb-sub-title">Asset allocation</div>
      <div class="fb-alloc-split">
        <div class="fb-alloc-group">
          <div class="fb-alloc-group-label">Income assets ${desc.incomePercent}%</div>
          ${incomeItems.map(e => `<div class="fb-alloc-item"><span>${e.label}</span><span>${e.pct}%</span></div>`).join("")}
        </div>
        <div class="fb-alloc-group">
          <div class="fb-alloc-group-label">Growth assets ${desc.growthPercent}%</div>
          ${growthItems.map(e => `<div class="fb-alloc-item"><span>${e.label}</span><span>${e.pct}%</span></div>`).join("")}
        </div>
      </div>
      <p class="body-text" style="font-size:8.5pt;color:var(--muted);margin-top:8px;">Source: ${provider} Product Disclosure Statement, ${desc.pdsDate}. Target allocations indicate what is expected over the course of an economic cycle; actual allocations may vary.</p>
    </div>
    <div class="fb-chart">
      <div class="fb-chart-inner">
        ${donut}
      </div>
      <div class="fb-chart-meta">
        <div class="fb-meta-row"><span>Min. timeframe</span><span>${desc.minTimeframe}</span></div>
        <div class="fb-meta-row"><span>Risk indicator</span><span>${desc.riskIndicator} / 7</span></div>
        <div class="fb-meta-row"><span>Growth assets</span><span>${desc.growthPercent}%</span></div>
        <div class="fb-meta-row"><span>Income assets</span><span>${desc.incomePercent}%</span></div>
        <div class="fb-meta-row"><span>Total fee (p.a.)</span><span>${desc.fees.totalEstimated}</span></div>
      </div>
    </div>
  </div>
</div>`;
}

function buildFundDescBlock(
  recData: ProviderData | null,
  recDesc: FundDescription | null,
  curData: ProviderData | null,
  curDesc: FundDescription | null,
): string {
  let html = "";

  if (recDesc && recData) {
    const logo = getProviderLogo(recData.provider);
    html += buildFundBreakdownSection(recData.provider, recData.fund, recDesc, logo);
  }

  if (curDesc && curData && curData.provider !== recData?.provider) {
    const logo = getProviderLogo(curData.provider);
    html += buildFundBreakdownSection(curData.provider, curData.fund, curDesc, logo);
  }

  return html;
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

  let recFundDesc: FundDescription | null = null;
  let curFundDesc: FundDescription | null = null;

  try {
    if (client.current.provider && client.current.fund) {
      currentProviderData = await getProviderData(client.current.provider, client.current.fund);
      curFundDesc = getFundDescription(client.current.provider, client.current.fund);
    }
    if (client.recommended.provider && client.recommended.fund) {
      recommendedProviderData = await getProviderData(client.recommended.provider, client.recommended.fund);
      recFundDesc = getFundDescription(client.recommended.provider, client.recommended.fund);
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

  const recSummaryHtml = sec("recommendation_summary") || v(factPack.narrativeInputs.recommendationSummaryParagraph);

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

    // Writer sections (resolve before block injections so we can pass into builders)
    SPECIAL_INSTRUCTIONS_HTML: sec("special_instructions") || v(factPack.narrativeInputs.specialInstructionsHtml),
    RECOMMENDATION_SUMMARY_PARAGRAPH: recSummaryHtml,
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
    RECOMMENDATION_COMPARISON_BLOCKS: buildComparisonBlock(client, recFundDesc, recommendedProviderData, recSummaryHtml),
    FUND_DESCRIPTION_BLOCKS: buildFundDescBlock(recommendedProviderData, recFundDesc, currentProviderData, curFundDesc),
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
