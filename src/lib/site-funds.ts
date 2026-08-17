// Site fund data — the SAME source the Smiths KiwiSaver site displays.
// Q2 performance overrides below come from Morningstar KiwiSaver 360,
// Q2 2026 (returns to 30 June 2026). Keyed by provider + fund name so the
// SOA never silently reuses an older report's performance figures.
import fundsRaw from "./ks-site-funds.data.json";
import type { ProviderData } from "@/lib/llm/kiwisaver-schemas";

interface YearReturn { yearEndingMarch: number; fundPct: number | null; avgPct: number | null }
export interface SiteFund {
  fundName: string;
  schemeName?: string;
  riskIndicator?: number;
  growthAssetsPct?: number;
  incomeAssetsPct?: number;
  yearlyReturns?: YearReturn[];
  return5yPct?: number | null;
  return5yAvgPct?: number | null;
  fees?: { management?: { pct?: number | null; avgPct?: number | null; dollar30k?: number | null } };
}

const FUNDS: SiteFund[] = Object.values(fundsRaw as Record<string, SiteFund>);

/** Strip scheme/plan noise words so provider + fund tokens match cleanly. */
function norm(s: string): string {
  return (s || "")
    .toLowerCase()
    .replace(/\b(kiwisaver|scheme|schemes|plan|fund|funds|the|a|s)\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Fuzzy-match a provider + fund name to a site fund entry. */
export function findSiteFund(provider: string | null | undefined, fund: string | null | undefined): SiteFund | null {
  const provTokens = norm(provider || "").split(" ").filter((t) => t.length > 2);
  const fundTokens = norm(fund || "").split(" ").filter((t) => t.length > 2);
  if (!provTokens.length && !fundTokens.length) return null;
  let best: SiteFund | null = null;
  let bestScore = 0;
  for (const sf of FUNDS) {
    const name = norm(`${sf.fundName} ${sf.schemeName || ""}`);
    let score = 0;
    for (const t of provTokens) if (name.includes(t)) score += 2;
    for (const t of fundTokens) if (name.includes(t)) score += 3;
    if (score > bestScore) { bestScore = score; best = sf; }
  }
  // Require both a provider and a fund token to have matched (score >= 5).
  return bestScore >= 5 ? best : null;
}

function pct(n: number | null | undefined): string | null {
  return n === null || n === undefined || Number.isNaN(n) ? null : `${n.toFixed(2)}%`;
}

type Q2Performance = {
  oneYear: number | null;
  threeYear: number | null;
  fiveYear: number | null;
  tenYear: number | null;
};

// Morningstar's Q2 report publishes total returns after fees and before tax.
// Token matching handles provider and fund names with different suffixes.
const Q2_PERFORMANCE: Array<{ tokens: string[]; returns: Q2Performance }> = [
  { tokens: ["booster", "geared", "growth"], returns: { oneYear: 19.8, threeYear: 15.0, fiveYear: 8.2, tenYear: 12.1 } },
  { tokens: ["anz", "high", "growth"], returns: { oneYear: 19.7, threeYear: null, fiveYear: null, tenYear: null } },
  { tokens: ["booster", "high", "growth"], returns: { oneYear: 16.6, threeYear: 12.6, fiveYear: 7.6, tenYear: 9.9 } },
  { tokens: ["booster", "shielded", "growth"], returns: { oneYear: 15.8, threeYear: 11.8, fiveYear: 6.8, tenYear: null } },
  { tokens: ["booster", "socially", "responsible", "high", "growth"], returns: { oneYear: 17.0, threeYear: 13.9, fiveYear: 8.5, tenYear: 11.0 } },
  { tokens: ["generate", "focused", "growth"], returns: { oneYear: 16.5, threeYear: 15.4, fiveYear: 8.6, tenYear: 11.1 } },
  { tokens: ["milford", "aggressive"], returns: { oneYear: 10.9, threeYear: 11.9, fiveYear: 7.7, tenYear: null } },
  { tokens: ["booster", "growth"], returns: { oneYear: 13.6, threeYear: 10.6, fiveYear: 6.2, tenYear: 8.5 } },
  { tokens: ["generate", "growth"], returns: { oneYear: 13.7, threeYear: 13.0, fiveYear: 7.3, tenYear: 9.5 } },
  { tokens: ["milford", "active", "growth"], returns: { oneYear: 7.8, threeYear: 10.7, fiveYear: 7.5, tenYear: 10.2 } },
  { tokens: ["booster", "balanced"], returns: { oneYear: 10.8, threeYear: 8.9, fiveYear: 4.9, tenYear: 6.8 } },
  { tokens: ["generate", "balanced"], returns: { oneYear: 11.6, threeYear: 10.9, fiveYear: null, tenYear: null } },
  { tokens: ["milford", "balanced"], returns: { oneYear: 6.6, threeYear: 8.8, fiveYear: 6.0, tenYear: 8.2 } },
  { tokens: ["booster", "moderate"], returns: { oneYear: 7.2, threeYear: 6.5, fiveYear: 3.2, tenYear: 4.5 } },
  { tokens: ["generate", "moderate"], returns: { oneYear: 8.9, threeYear: 9.1, fiveYear: 5.2, tenYear: 5.7 } },
  { tokens: ["milford", "moderate"], returns: { oneYear: 4.3, threeYear: 7.4, fiveYear: 4.6, tenYear: null } },
  { tokens: ["booster", "conservative"], returns: { oneYear: 5.9, threeYear: 6.1, fiveYear: 3.0, tenYear: 3.9 } },
  { tokens: ["generate", "conservative"], returns: { oneYear: 6.6, threeYear: 7.4, fiveYear: null, tenYear: null } },
  { tokens: ["milford", "conservative"], returns: { oneYear: 2.4, threeYear: 6.2, fiveYear: 3.4, tenYear: 4.7 } },
];

function q2Performance(provider: string, fund: string): Q2Performance | null {
  const key = norm(`${provider} ${fund}`);
  const match = Q2_PERFORMANCE.find(({ tokens }) => tokens.every((token) => key.includes(token)));
  return match?.returns || null;
}

/** Convert a site fund into the Builder's ProviderData (fees + Q2 performance). */
export function siteFundToProviderData(
  sf: SiteFund,
  provider: string,
  fund: string,
): ProviderData {
  const mgmt = sf.fees?.management?.pct ?? null;
  const q2 = q2Performance(provider, fund);
  return {
    provider,
    fund,
    fees: { fundFeePercent: pct(mgmt), adminFee: null, other: pct(mgmt) },
    // Do not fall back to an older report. An unmapped fund shows no
    // performance values until its figures are added from the Q2 report.
    performance: q2
      ? { oneYear: pct(q2.oneYear), threeYear: pct(q2.threeYear), fiveYear: pct(q2.fiveYear), sinceInception: pct(q2.tenYear) }
      : { oneYear: null, threeYear: null, fiveYear: null, sinceInception: null },
    sources: { feesUrl: "", performanceUrl: "" },
    asAtDate: q2
      ? "Morningstar KiwiSaver 360, Q2 2026 (returns to 30 June 2026; after fees and before tax)"
      : "Morningstar KiwiSaver 360 Q2 2026 (fund-specific figures not available in the configured Q2 mapping)",
  };
}
