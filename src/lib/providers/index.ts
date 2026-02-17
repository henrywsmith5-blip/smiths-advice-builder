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

function emptyProviderData(provider: string, fund: string, sources: { feesUrl: string; performanceUrl: string }): ProviderData {
  const nzDate = new Date().toLocaleDateString("en-NZ", {
    timeZone: "Pacific/Auckland",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  return {
    provider,
    fund,
    fees: { fundFeePercent: null, adminFee: null, other: null },
    performance: { oneYear: null, threeYear: null, fiveYear: null, sinceInception: null },
    sources,
    asAtDate: nzDate,
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

// ── MILFORD ──────────────────────────────────────────────────

const MILFORD_FEES_URL = "https://milfordasset.com/information-hub/fees";
const MILFORD_PERF_URL = "https://milfordasset.com/funds-performance/view-performance";

async function fetchMilford(fund: string): Promise<ProviderData> {
  const sources = { feesUrl: MILFORD_FEES_URL, performanceUrl: MILFORD_PERF_URL };
  const data = emptyProviderData("Milford", fund, sources);

  const fundLower = fund.toLowerCase();

  // Fetch fees page
  const feesHtml = await fetchPage(MILFORD_FEES_URL);
  if (feesHtml) {
    try {
      const $ = cheerio.load(feesHtml);
      $("table tr, .fee-row, [class*=fee]").each((_, el) => {
        const text = $(el).text().toLowerCase();
        if (text.includes(fundLower) || text.includes("kiwisaver")) {
          const cells = $(el).find("td");
          cells.each((i, cell) => {
            const cellText = $(cell).text().trim();
            if (cellText.includes("%") && !data.fees.fundFeePercent) {
              data.fees.fundFeePercent = cellText;
            }
          });
        }
      });
    } catch (err) {
      console.warn("[Providers] Milford fees parse error:", err);
    }
  }

  // Fetch performance page
  const perfHtml = await fetchPage(MILFORD_PERF_URL);
  if (perfHtml) {
    try {
      const $ = cheerio.load(perfHtml);
      $("table tr").each((_, el) => {
        const text = $(el).text().toLowerCase();
        if (text.includes(fundLower)) {
          const cells = $(el).find("td");
          const values: string[] = [];
          cells.each((_, cell) => {
            const v = $(cell).text().trim();
            if (v.includes("%")) values.push(v);
          });
          if (values.length >= 1) data.performance.oneYear = values[0] || null;
          if (values.length >= 2) data.performance.threeYear = values[1] || null;
          if (values.length >= 3) data.performance.fiveYear = values[2] || null;
          if (values.length >= 4) data.performance.sinceInception = values[3] || null;
        }
      });
    } catch (err) {
      console.warn("[Providers] Milford performance parse error:", err);
    }
  }

  return data;
}

// ── FISHER FUNDS ─────────────────────────────────────────────

const FISHER_FEES_URL = "https://fisherfunds.co.nz/kiwisaver/fees-and-expenses";
const FISHER_PERF_URL = "https://fisherfunds.co.nz/funds-and-performance";

async function fetchFisher(fund: string): Promise<ProviderData> {
  const sources = { feesUrl: FISHER_FEES_URL, performanceUrl: FISHER_PERF_URL };
  const data = emptyProviderData("Fisher Funds", fund, sources);

  const fundLower = fund.toLowerCase();

  const feesHtml = await fetchPage(FISHER_FEES_URL);
  if (feesHtml) {
    try {
      const $ = cheerio.load(feesHtml);
      $("table tr, .fee-row, [class*=fee]").each((_, el) => {
        const text = $(el).text().toLowerCase();
        if (text.includes(fundLower) || text.includes("growth")) {
          const cells = $(el).find("td");
          cells.each((_, cell) => {
            const cellText = $(cell).text().trim();
            if (cellText.includes("%") && !data.fees.fundFeePercent) {
              data.fees.fundFeePercent = cellText;
            }
          });
        }
      });
    } catch (err) {
      console.warn("[Providers] Fisher fees parse error:", err);
    }
  }

  const perfHtml = await fetchPage(FISHER_PERF_URL);
  if (perfHtml) {
    try {
      const $ = cheerio.load(perfHtml);
      $("table tr").each((_, el) => {
        const text = $(el).text().toLowerCase();
        if (text.includes(fundLower)) {
          const cells = $(el).find("td");
          const values: string[] = [];
          cells.each((_, cell) => {
            const v = $(cell).text().trim();
            if (v.includes("%")) values.push(v);
          });
          if (values.length >= 1) data.performance.oneYear = values[0] || null;
          if (values.length >= 2) data.performance.threeYear = values[1] || null;
          if (values.length >= 3) data.performance.fiveYear = values[2] || null;
          if (values.length >= 4) data.performance.sinceInception = values[3] || null;
        }
      });
    } catch (err) {
      console.warn("[Providers] Fisher performance parse error:", err);
    }
  }

  return data;
}

// ── PUBLIC API ────────────────────────────────────────────────

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
    // Unsupported provider - return empty with null fields
    console.warn(`[Providers] Unsupported provider: ${provider}. Returning nulls.`);
    data = emptyProviderData(provider, fund, { feesUrl: "", performanceUrl: "" });
  }

  setCache(data);
  return data;
}
