import * as cheerio from "cheerio";
import type { ProviderData } from "@/lib/llm/kiwisaver-schemas";

// ══════════════════════════════════════════════════════════════
// PROVIDER DATA FETCHERS — Deterministic, never LLM-generated
// ══════════════════════════════════════════════════════════════

const CACHE = new Map<string, { data: ProviderData; expiry: number }>();
const CACHE_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours

function cacheKey(provider: string, fund: string): string {
  return `${provider.toLowerCase().trim()}::${fund.toLowerCase().trim()}`;
}

function getCached(provider: string, fund: string): ProviderData | null {
  const key = cacheKey(provider, fund);
  const entry = CACHE.get(key);
  if (entry && Date.now() < entry.expiry) return entry.data;
  if (entry) CACHE.delete(key);
  return null;
}

function setCache(data: ProviderData): void {
  const key = cacheKey(data.provider, data.fund);
  CACHE.set(key, { data, expiry: Date.now() + CACHE_TTL_MS });
}

function nzDate(): string {
  return new Date().toLocaleDateString("en-NZ", {
    timeZone: "Pacific/Auckland",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function emptyProviderData(provider: string, fund: string, sources: { feesUrl: string; performanceUrl: string }): ProviderData {
  return {
    provider,
    fund,
    fees: { fundFeePercent: null, adminFee: null, other: null },
    performance: { oneYear: null, threeYear: null, fiveYear: null, sinceInception: null },
    sources,
    asAtDate: nzDate(),
  };
}

async function fetchPage(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; SmithsAdviceBuilder/1.0)" },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) {
      console.warn(`[Providers] Failed to fetch ${url}: ${res.status}`);
      return null;
    }
    return await res.text();
  } catch (err) {
    console.warn(`[Providers] Fetch error for ${url}:`, err);
    return null;
  }
}

// ══════════════════════════════════════════════════════════════
// FISHER FUNDS — Live scraping (server-rendered pages)
// ══════════════════════════════════════════════════════════════

const FISHER_FEES_URL = "https://fisherfunds.co.nz/kiwisaver/fees-and-expenses";
const FISHER_PERF_URL = "https://fisherfunds.co.nz/funds-and-performance";

// Verified reference data from fisherfunds.co.nz (Feb 2026)
// Used as fallback if live scraping fails
const FISHER_FEES_REF: Record<string, { basicFee: string; adminFee: string; totalFee: string }> = {
  cash:                { basicFee: "0.36%", adminFee: "0.09%", totalFee: "0.45%" },
  cashplus:            { basicFee: "0.59%", adminFee: "0.09%", totalFee: "0.68%" },
  "core conservative": { basicFee: "0.42%", adminFee: "0.09%", totalFee: "0.51%" },
  conservative:        { basicFee: "0.76%", adminFee: "0.11%", totalFee: "0.87%" },
  default:             { basicFee: "0.37%", adminFee: "N/A",   totalFee: "0.37%" },
  balanced:            { basicFee: "0.91%", adminFee: "0.19%", totalFee: "1.10%" },
  growth:              { basicFee: "0.98%", adminFee: "0.22%", totalFee: "1.20%" },
  aggressive:          { basicFee: "1.06%", adminFee: "0.17%", totalFee: "1.23%" },
};

// Performance as at 31 Jan 2026 (annualised, after fees before tax)
const FISHER_PERF_REF: Record<string, { oneYear: string | null; threeYear: string | null; fiveYear: string | null; sinceInception: string | null }> = {
  cash:                { oneYear: "3.6%",  threeYear: "5.0%",  fiveYear: "3.5%",  sinceInception: "3.1%" },
  cashplus:            { oneYear: "3.5%",  threeYear: "4.3%",  fiveYear: "2.1%",  sinceInception: "2.8%" },
  "core conservative": { oneYear: "3.8%",  threeYear: "6.8%",  fiveYear: "3.8%",  sinceInception: "4.6%" },
  conservative:        { oneYear: "4.2%",  threeYear: "6.6%",  fiveYear: "3.1%",  sinceInception: "4.9%" },
  default:             { oneYear: "9.8%",  threeYear: "11.0%", fiveYear: null,     sinceInception: "5.6%" },
  balanced:            { oneYear: "3.4%",  threeYear: "8.9%",  fiveYear: "5.4%",  sinceInception: "6.2%" },
  growth:              { oneYear: "2.3%",  threeYear: "10.1%", fiveYear: "6.9%",  sinceInception: "6.8%" },
  aggressive:          { oneYear: null,     threeYear: null,     fiveYear: null,     sinceInception: null },
};

// Ordered list of fund names as they appear in Fisher's fee table (top to bottom)
const FISHER_FEE_TABLE_ORDER = [
  "cash", "cashplus", "core conservative", "conservative",
  "default", "balanced", "growth", "aggressive",
];

// Ordered list of fund names as they appear in Fisher's KiwiSaver Plan performance table
const FISHER_PERF_TABLE_ORDER = [
  "cash", "cashplus", "core conservative", "conservative",
  "default", "balanced", "growth", "aggressive",
];

function normaliseFisherFundName(input: string): string {
  const lower = input.toLowerCase().trim()
    .replace(/fisher\s*funds?\s*/i, "")
    .replace(/kiwisaver\s*(plan)?\s*/i, "")
    .replace(/\s*fund$/i, "")
    .replace(/\*+/g, "")
    .trim();
  return lower;
}

function findFisherFundKey(fund: string): string | null {
  const norm = normaliseFisherFundName(fund);

  // Direct match
  if (FISHER_FEES_REF[norm]) return norm;

  // Partial match
  for (const key of Object.keys(FISHER_FEES_REF)) {
    if (norm.includes(key) || key.includes(norm)) return key;
  }

  // Fallback: match on first word (e.g. "Growth" matches "growth")
  const firstWord = norm.split(/\s+/)[0];
  for (const key of Object.keys(FISHER_FEES_REF)) {
    if (key === firstWord || key.startsWith(firstWord)) return key;
  }

  return null;
}

async function fetchFisher(fund: string): Promise<ProviderData> {
  const sources = { feesUrl: FISHER_FEES_URL, performanceUrl: FISHER_PERF_URL };
  const data = emptyProviderData("Fisher Funds", fund, sources);

  const fundKey = findFisherFundKey(fund);
  if (!fundKey) {
    console.warn(`[Fisher] Could not match fund name: "${fund}"`);
    return data;
  }

  console.log(`[Fisher] Matched fund "${fund}" -> key "${fundKey}"`);

  // Try live scraping first for fees
  let usedLiveFees = false;
  const feesHtml = await fetchPage(FISHER_FEES_URL);
  if (feesHtml) {
    try {
      const $ = cheerio.load(feesHtml);
      const tableIndex = FISHER_FEE_TABLE_ORDER.indexOf(fundKey);

      // Find the main fees table (the one with "Investment Option" or fund names)
      const tables = $("table");
      tables.each((_, table) => {
        if (usedLiveFees) return;
        const rows = $(table).find("tr");

        // Try to find the fund row by text match
        let matchedRowHtml: string | null = null;

        rows.each((rowIdx, row) => {
          const rowText = $(row).text().toLowerCase();
          if (rowText.includes(fundKey) ||
              (fundKey === "growth" && rowText.includes("growth") && !rowText.includes("glidepath") && !rowText.includes("active"))) {
            matchedRowHtml = $.html(row);
            return false; // break
          }
        });

        if (matchedRowHtml) {
          const $row = cheerio.load(matchedRowHtml);
          const cells = $row("td");
          const percentValues: string[] = [];

          cells.each((_, cell) => {
            const text = $(cell).text().trim();
            if (text.match(/\d+\.\d+%/) || text === "N/A") {
              percentValues.push(text);
            }
          });

          if (percentValues.length >= 3) {
            data.fees.fundFeePercent = percentValues[2]; // Total annual fund charges
            data.fees.adminFee = percentValues[1]; // Other management charges
            data.fees.other = percentValues[0]; // Manager's basic fee
            usedLiveFees = true;
            console.log(`[Fisher] Live fee data scraped: total=${percentValues[2]}, admin=${percentValues[1]}, basic=${percentValues[0]}`);
          } else if (percentValues.length >= 1) {
            data.fees.fundFeePercent = percentValues[percentValues.length - 1];
            usedLiveFees = true;
          }
        }
      });
    } catch (err) {
      console.warn("[Fisher] Fee scraping error:", err);
    }
  }

  // If live scraping didn't get fees, use reference data
  if (!usedLiveFees) {
    const ref = FISHER_FEES_REF[fundKey];
    if (ref) {
      data.fees.fundFeePercent = ref.totalFee;
      data.fees.adminFee = ref.adminFee;
      data.fees.other = ref.basicFee;
      console.log(`[Fisher] Using reference fee data for "${fundKey}": total=${ref.totalFee}`);
    }
  }

  // Try live scraping for performance
  let usedLivePerf = false;
  const perfHtml = await fetchPage(FISHER_PERF_URL);
  if (perfHtml) {
    try {
      const $ = cheerio.load(perfHtml);
      const perfIndex = FISHER_PERF_TABLE_ORDER.indexOf(fundKey);

      // Fisher performance page has multiple tables, one per product type
      // The first table is the KiwiSaver Plan table
      const tables = $("table");

      tables.each((tableIdx, table) => {
        if (usedLivePerf) return;
        const tableText = $(table).text().toLowerCase();

        // Only look at the first table which should be KiwiSaver Plan
        if (tableIdx > 0) return;

        const rows = $(table).find("tr");
        let dataRowIdx = 0;

        rows.each((_, row) => {
          if (usedLivePerf) return;
          const cells = $(row).find("td");
          if (cells.length === 0) return; // skip header rows

          // Check if this is the right row by position (matching the fund order)
          const percentValues: string[] = [];
          cells.each((_, cell) => {
            const text = $(cell).text().trim();
            if (text.match(/-?\d+\.\d+%/)) {
              percentValues.push(text);
            }
          });

          if (percentValues.length >= 4 && dataRowIdx === perfIndex) {
            // Performance columns: 1m, 3m, 6m, 12m, 3yr, 5yr, 7yr, 10yr, inception
            // We want: 12m (index 3), 3yr (4), 5yr (5), inception (8)
            const perf12m = percentValues[3] || null;
            const perf3yr = percentValues[4] || null;
            const perf5yr = percentValues[5] || null;
            const perfInc = percentValues[percentValues.length - 1] || null;

            if (perf12m) data.performance.oneYear = perf12m;
            if (perf3yr) data.performance.threeYear = perf3yr;
            if (perf5yr) data.performance.fiveYear = perf5yr;
            if (perfInc) data.performance.sinceInception = perfInc;
            usedLivePerf = true;
            console.log(`[Fisher] Live perf data scraped: 1yr=${perf12m}, 3yr=${perf3yr}, 5yr=${perf5yr}`);
          }

          dataRowIdx++;
        });
      });
    } catch (err) {
      console.warn("[Fisher] Performance scraping error:", err);
    }
  }

  // If live scraping didn't get performance, use reference data
  if (!usedLivePerf) {
    const ref = FISHER_PERF_REF[fundKey];
    if (ref) {
      data.performance.oneYear = ref.oneYear;
      data.performance.threeYear = ref.threeYear;
      data.performance.fiveYear = ref.fiveYear;
      data.performance.sinceInception = ref.sinceInception;
      data.asAtDate = "31 January 2026";
      console.log(`[Fisher] Using reference perf data for "${fundKey}": 1yr=${ref.oneYear}`);
    }
  }

  return data;
}

// ══════════════════════════════════════════════════════════════
// MILFORD — Hardcoded from PDS + comparison data
// (Milford's website is fully JS-rendered, cheerio cannot scrape it)
// ══════════════════════════════════════════════════════════════

const MILFORD_FEES_URL = "https://milfordasset.com/information-hub/fees";
const MILFORD_PERF_URL = "https://milfordasset.com/funds-performance/view-performance";

// Verified from Milford PDS dated 18 June 2025 (Section 5 - What are the fees?)
const MILFORD_FEES_REF: Record<string, { baseFee: string; perfFee: string; totalEstFee: string }> = {
  cash:          { baseFee: "0.20%", perfFee: "N/A",   totalEstFee: "0.20%" },
  conservative:  { baseFee: "0.85%", perfFee: "N/A",   totalEstFee: "0.85%" },
  moderate:      { baseFee: "0.95%", perfFee: "0.01%", totalEstFee: "0.96%" },
  balanced:      { baseFee: "1.05%", perfFee: "0.02%", totalEstFee: "1.07%" },
  "active growth": { baseFee: "1.05%", perfFee: "0.20%", totalEstFee: "1.25%" },
  aggressive:    { baseFee: "1.15%", perfFee: "N/A",   totalEstFee: "1.15%" },
};

// 5-year annualised returns from kiwisavercomparison.co.nz (data as at Oct 2025)
const MILFORD_PERF_REF: Record<string, { oneYear: string | null; threeYear: string | null; fiveYear: string | null; sinceInception: string | null }> = {
  cash:            { oneYear: null, threeYear: null, fiveYear: "2.28%",  sinceInception: null },
  conservative:    { oneYear: null, threeYear: null, fiveYear: "3.44%",  sinceInception: null },
  moderate:        { oneYear: null, threeYear: null, fiveYear: "5.15%",  sinceInception: null },
  balanced:        { oneYear: null, threeYear: null, fiveYear: "7.34%",  sinceInception: null },
  "active growth": { oneYear: null, threeYear: null, fiveYear: "10.12%", sinceInception: null },
  aggressive:      { oneYear: null, threeYear: null, fiveYear: "10.07%", sinceInception: null },
};

function normaliseMilfordFundName(input: string): string {
  const lower = input.toLowerCase().trim()
    .replace(/milford\s*/i, "")
    .replace(/kiwisaver\s*/i, "")
    .replace(/\s*fund$/i, "")
    .trim();
  return lower;
}

function findMilfordFundKey(fund: string): string | null {
  const norm = normaliseMilfordFundName(fund);

  if (MILFORD_FEES_REF[norm]) return norm;

  for (const key of Object.keys(MILFORD_FEES_REF)) {
    if (norm.includes(key) || key.includes(norm)) return key;
  }

  const firstWord = norm.split(/\s+/)[0];
  for (const key of Object.keys(MILFORD_FEES_REF)) {
    if (key === firstWord || key.startsWith(firstWord)) return key;
  }

  return null;
}

async function fetchMilford(fund: string): Promise<ProviderData> {
  const sources = { feesUrl: MILFORD_FEES_URL, performanceUrl: MILFORD_PERF_URL };
  const data = emptyProviderData("Milford", fund, sources);

  const fundKey = findMilfordFundKey(fund);
  if (!fundKey) {
    console.warn(`[Milford] Could not match fund name: "${fund}"`);
    return data;
  }

  console.log(`[Milford] Matched fund "${fund}" -> key "${fundKey}"`);

  // Use reference data (Milford's site is JS-rendered, cannot scrape)
  const feeRef = MILFORD_FEES_REF[fundKey];
  if (feeRef) {
    data.fees.fundFeePercent = feeRef.totalEstFee;
    data.fees.adminFee = feeRef.perfFee;
    data.fees.other = feeRef.baseFee;
    console.log(`[Milford] Fee data: base=${feeRef.baseFee}, total=${feeRef.totalEstFee}`);
  }

  const perfRef = MILFORD_PERF_REF[fundKey];
  if (perfRef) {
    data.performance.oneYear = perfRef.oneYear;
    data.performance.threeYear = perfRef.threeYear;
    data.performance.fiveYear = perfRef.fiveYear;
    data.performance.sinceInception = perfRef.sinceInception;
    data.asAtDate = "October 2025";
    console.log(`[Milford] Perf data: 5yr=${perfRef.fiveYear}`);
  }

  return data;
}

// ══════════════════════════════════════════════════════════════
// FUND DESCRIPTIONS (from PDS / official sources)
// ══════════════════════════════════════════════════════════════

// ══════════════════════════════════════════════════════════════
// FUND DESCRIPTIONS — Sourced from official PDS documents
// Fisher Funds PDS: 30 September 2025
// Milford PDS: 18 June 2025
// ══════════════════════════════════════════════════════════════

export interface AssetAllocation {
  cash: number;
  nzFixedInterest: number;
  intlFixedInterest: number;
  ausEquities: number;
  intlEquities: number;
  listedProperty: number;
  unlistedProperty: number;
}

export interface FeeBreakdown {
  baseFee: string;
  otherCharges: string;
  performanceFee: string;
  totalEstimated: string;
  performanceFeeDetail: string | null;
}

export interface FundDescription {
  objective: string;
  suitableFor: string;
  minTimeframe: string;
  riskIndicator: number;
  growthPercent: number;
  incomePercent: number;
  allocation: AssetAllocation;
  fees: FeeBreakdown;
  pdsDate: string;
}

// ── Fisher Funds (PDS 30 September 2025) ────────────────────

const FISHER_FUND_DESCRIPTIONS: Record<string, FundDescription> = {
  cash: {
    objective: "Aims to provide stable returns and reduce the potential of capital loss over the short to medium term by investing in cash and New Zealand short-term fixed interest assets.",
    suitableFor: "A short-term or naturally cautious investor looking to make a withdrawal within 12 months, most interested in low volatility of returns over achieving potential higher returns.",
    minTimeframe: "No minimum",
    riskIndicator: 1,
    growthPercent: 0,
    incomePercent: 100,
    allocation: { cash: 100, nzFixedInterest: 0, intlFixedInterest: 0, ausEquities: 0, intlEquities: 0, listedProperty: 0, unlistedProperty: 0 },
    fees: { baseFee: "0.36%", otherCharges: "0.09%", performanceFee: "N/A", totalEstimated: "0.45%", performanceFeeDetail: null },
    pdsDate: "30 September 2025",
  },
  "core conservative": {
    objective: "Aims to provide stable returns over the long term by investing mainly in income assets with a small allocation to growth assets.",
    suitableFor: "A short-term or naturally cautious investor nearing retirement or intending to make a withdrawal in the short term, motivated by low volatility of returns over achieving potential higher returns.",
    minTimeframe: "3 years",
    riskIndicator: 2,
    growthPercent: 18,
    incomePercent: 82,
    allocation: { cash: 27, nzFixedInterest: 25, intlFixedInterest: 30, ausEquities: 7, intlEquities: 11, listedProperty: 0, unlistedProperty: 0 },
    fees: { baseFee: "0.42%", otherCharges: "0.09%", performanceFee: "N/A", totalEstimated: "0.51%", performanceFeeDetail: null },
    pdsDate: "30 September 2025",
  },
  conservative: {
    objective: "Aims to provide stable returns over the long term by investing mainly in income assets with a modest allocation to growth assets.",
    suitableFor: "A short-term or naturally cautious investor looking to make a withdrawal within the short term, who values lower volatility of returns over achieving potential higher returns.",
    minTimeframe: "3 years",
    riskIndicator: 3,
    growthPercent: 20,
    incomePercent: 80,
    allocation: { cash: 20, nzFixedInterest: 28, intlFixedInterest: 32, ausEquities: 5, intlEquities: 11, listedProperty: 2, unlistedProperty: 2 },
    fees: { baseFee: "0.76%", otherCharges: "0.11%", performanceFee: "N/A", totalEstimated: "0.87%", performanceFeeDetail: null },
    pdsDate: "30 September 2025",
  },
  default: {
    objective: "Aims to provide a balance between stability of returns and growing your investment over the long term by investing in a mix of income and growth assets. An enhanced passive investment style may be used at times.",
    suitableFor: "A medium- to long-term investor who wants a balance between volatility of returns and achieving potential higher returns.",
    minTimeframe: "5 years",
    riskIndicator: 4,
    growthPercent: 55,
    incomePercent: 45,
    allocation: { cash: 7, nzFixedInterest: 17, intlFixedInterest: 21, ausEquities: 16, intlEquities: 37, listedProperty: 2, unlistedProperty: 0 },
    fees: { baseFee: "0.37%", otherCharges: "N/A", performanceFee: "N/A", totalEstimated: "0.37%", performanceFeeDetail: "No annual fund charge applies if your Default Fund balance is $1,500 or less." },
    pdsDate: "30 September 2025",
  },
  balanced: {
    objective: "Aims to provide a balance between stability of returns and growing your investment over the long term by investing in a mix of income and growth assets.",
    suitableFor: "A medium- to long-term investor who wants a balance between volatility of returns and achieving potential higher returns.",
    minTimeframe: "5 years",
    riskIndicator: 4,
    growthPercent: 60,
    incomePercent: 40,
    allocation: { cash: 5, nzFixedInterest: 16, intlFixedInterest: 19, ausEquities: 18, intlEquities: 38, listedProperty: 2, unlistedProperty: 2 },
    fees: { baseFee: "0.91%", otherCharges: "0.19%", performanceFee: "N/A", totalEstimated: "1.10%", performanceFeeDetail: null },
    pdsDate: "30 September 2025",
  },
  growth: {
    objective: "Aims to grow your investment over the long term by investing mainly in growth assets.",
    suitableFor: "A long-term investor who can tolerate volatility of returns in the expectation of potential higher returns and has time on their side.",
    minTimeframe: "7 years",
    riskIndicator: 5,
    growthPercent: 80,
    incomePercent: 20,
    allocation: { cash: 5, nzFixedInterest: 7, intlFixedInterest: 8, ausEquities: 26, intlEquities: 50, listedProperty: 2, unlistedProperty: 2 },
    fees: { baseFee: "0.98%", otherCharges: "0.22%", performanceFee: "N/A", totalEstimated: "1.20%", performanceFeeDetail: null },
    pdsDate: "30 September 2025",
  },
  aggressive: {
    objective: "Aims to grow your investment over the long term by investing predominantly in growth assets.",
    suitableFor: "A long-term investor who can tolerate significant volatility of returns in the expectation of potential higher returns and has time on their side.",
    minTimeframe: "10 years",
    riskIndicator: 6,
    growthPercent: 95,
    incomePercent: 5,
    allocation: { cash: 5, nzFixedInterest: 0, intlFixedInterest: 0, ausEquities: 28, intlEquities: 63, listedProperty: 2, unlistedProperty: 2 },
    fees: { baseFee: "1.06%", otherCharges: "0.17%", performanceFee: "N/A", totalEstimated: "1.23%", performanceFeeDetail: null },
    pdsDate: "30 September 2025",
  },
};

// ── Milford (PDS 18 June 2025) ──────────────────────────────

const MILFORD_FUND_DESCRIPTIONS: Record<string, FundDescription> = {
  cash: {
    objective: "Targets a return above the New Zealand Official Cash Rate. Primarily invests in New Zealand cash, short-dated debt securities and term deposits.",
    suitableFor: "Investors seeking low-risk exposure with a very short investment timeframe or those looking to park funds temporarily.",
    minTimeframe: "No minimum",
    riskIndicator: 1,
    growthPercent: 0,
    incomePercent: 100,
    allocation: { cash: 20, nzFixedInterest: 80, intlFixedInterest: 0, ausEquities: 0, intlEquities: 0, listedProperty: 0, unlistedProperty: 0 },
    fees: { baseFee: "0.20%", otherCharges: "N/A", performanceFee: "N/A", totalEstimated: "0.20%", performanceFeeDetail: null },
    pdsDate: "18 June 2025",
  },
  conservative: {
    objective: "To provide moderate returns and protect capital over the minimum recommended investment timeframe. A diversified fund that primarily invests in fixed interest securities, with a moderate allocation to equities.",
    suitableFor: "Conservative investors seeking lower volatility and more stable returns over the medium term. The fund may experience short-term negative returns, particularly in times of heightened volatility.",
    minTimeframe: "3 years",
    riskIndicator: 2,
    growthPercent: 18,
    incomePercent: 82,
    allocation: { cash: 7, nzFixedInterest: 25, intlFixedInterest: 50, ausEquities: 4, intlEquities: 9, listedProperty: 5, unlistedProperty: 0 },
    fees: { baseFee: "0.85%", otherCharges: "N/A", performanceFee: "N/A", totalEstimated: "0.85%", performanceFeeDetail: null },
    pdsDate: "18 June 2025",
  },
  moderate: {
    objective: "To provide moderate returns and capital growth over the minimum recommended investment timeframe. A diversified fund that primarily invests in fixed interest securities with a significant allocation to equities.",
    suitableFor: "Investors seeking moderate growth with some tolerance for short-term volatility.",
    minTimeframe: "4 years",
    riskIndicator: 3,
    growthPercent: 40,
    incomePercent: 60,
    allocation: { cash: 9, nzFixedInterest: 15, intlFixedInterest: 36, ausEquities: 15, intlEquities: 19, listedProperty: 6, unlistedProperty: 0 },
    fees: { baseFee: "0.95%", otherCharges: "N/A", performanceFee: "0.01%", totalEstimated: "0.96%", performanceFeeDetail: "Moderate may invest in related Milford funds (including Australian Absolute Growth) that charge performance fees. The estimated performance fee component is 0.01% p.a." },
    pdsDate: "18 June 2025",
  },
  balanced: {
    objective: "To provide capital growth over the minimum recommended investment timeframe. A diversified fund that primarily invests in equities, with a significant allocation to fixed interest securities.",
    suitableFor: "Investors seeking a balance between growth potential and capital stability over the medium to long term.",
    minTimeframe: "5 years",
    riskIndicator: 4,
    growthPercent: 61,
    incomePercent: 39,
    allocation: { cash: 8, nzFixedInterest: 6, intlFixedInterest: 25, ausEquities: 24, intlEquities: 30, listedProperty: 7, unlistedProperty: 0 },
    fees: { baseFee: "1.05%", otherCharges: "N/A", performanceFee: "0.02%", totalEstimated: "1.07%", performanceFeeDetail: "Balanced may invest in related Milford funds (including Australian Absolute Growth) that charge performance fees. The estimated performance fee component is 0.02% p.a." },
    pdsDate: "18 June 2025",
  },
  "active growth": {
    objective: "Absolute return style fund. To provide annual returns of 10% (after base fund fee, before tax and performance fee) over the minimum recommended investment timeframe. A diversified fund that primarily invests in equities, with a moderate allocation to fixed interest securities.",
    suitableFor: "Long-term investors comfortable with higher volatility who want active management targeting above-market returns.",
    minTimeframe: "7 years",
    riskIndicator: 5,
    growthPercent: 78,
    incomePercent: 22,
    allocation: { cash: 6, nzFixedInterest: 2, intlFixedInterest: 14, ausEquities: 30, intlEquities: 48, listedProperty: 0, unlistedProperty: 0 },
    fees: { baseFee: "1.05%", otherCharges: "N/A", performanceFee: "0.20%", totalEstimated: "1.25%", performanceFeeDetail: "Performance fee of 15% of excess return above a 10% p.a. hurdle rate, capped at 0.95% of average NAV. Payable only if the fund exceeds its high water mark. Reviewed annually to 31 March." },
    pdsDate: "18 June 2025",
  },
  aggressive: {
    objective: "To maximise capital growth over the minimum recommended investment timeframe. Primarily invests in international equities, with a moderate allocation to Australasian equities.",
    suitableFor: "Long-term investors who can tolerate significant short-term fluctuations for the potential of higher long-term returns.",
    minTimeframe: "10 years",
    riskIndicator: 6,
    growthPercent: 95,
    incomePercent: 5,
    allocation: { cash: 5, nzFixedInterest: 0, intlFixedInterest: 0, ausEquities: 25, intlEquities: 70, listedProperty: 0, unlistedProperty: 0 },
    fees: { baseFee: "1.15%", otherCharges: "N/A", performanceFee: "N/A", totalEstimated: "1.15%", performanceFeeDetail: null },
    pdsDate: "18 June 2025",
  },
};

export function getFundDescription(provider: string, fund: string): FundDescription | null {
  const pLower = provider.toLowerCase().trim();
  if (pLower.includes("fisher")) {
    const key = findFisherFundKey(fund);
    return key ? FISHER_FUND_DESCRIPTIONS[key] || null : null;
  }
  if (pLower.includes("milford")) {
    const key = findMilfordFundKey(fund);
    return key ? MILFORD_FUND_DESCRIPTIONS[key] || null : null;
  }
  return null;
}

// ══════════════════════════════════════════════════════════════
// PUBLIC API
// ══════════════════════════════════════════════════════════════

export async function getProviderData(provider: string, fund: string): Promise<ProviderData> {
  if (!provider || !fund) {
    return emptyProviderData(provider || "Unknown", fund || "Unknown", { feesUrl: "", performanceUrl: "" });
  }

  const cached = getCached(provider, fund);
  if (cached) {
    console.log(`[Providers] Cache hit: ${provider} / ${fund}`);
    return cached;
  }

  console.log(`[Providers] Fetching: ${provider} / ${fund}`);

  const pLower = provider.toLowerCase().trim();
  let data: ProviderData;

  if (pLower.includes("milford")) {
    data = await fetchMilford(fund);
  } else if (pLower.includes("fisher")) {
    data = await fetchFisher(fund);
  } else {
    console.warn(`[Providers] Unsupported provider: ${provider}. Returning nulls.`);
    data = emptyProviderData(provider, fund, { feesUrl: "", performanceUrl: "" });
  }

  setCache(data);
  return data;
}
