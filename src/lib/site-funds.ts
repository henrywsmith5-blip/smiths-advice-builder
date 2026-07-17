// Site fund data — the SAME source the Smiths KiwiSaver site displays
// (Morningstar KiwiSaver 360, Q1 2026, sorted). Gives every fund its full
// return history + fees so the SOA matches what the site shows (no missing
// years / dashes). Keyed by fund id; we match on provider + fund name.
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

/** Annualised (geometric-mean) % p.a. from a list of annual % returns. */
function annualised(annualPcts: number[]): number | null {
  if (!annualPcts.length) return null;
  let prod = 1;
  for (const r of annualPcts) prod *= 1 + r / 100;
  return (Math.pow(prod, 1 / annualPcts.length) - 1) * 100;
}

/** Convert a site fund into the Builder's ProviderData (fees + full performance). */
export function siteFundToProviderData(
  sf: SiteFund,
  provider: string,
  fund: string,
): ProviderData {
  const yrs = (sf.yearlyReturns || [])
    .filter((y) => typeof y.fundPct === "number")
    .sort((a, b) => a.yearEndingMarch - b.yearEndingMarch);
  const years = yrs.map((y) => y.fundPct as number);
  const oneYear = years.length ? years[years.length - 1] : null;
  const threeYear = years.length >= 3 ? annualised(years.slice(-3)) : null;
  const fiveYear = typeof sf.return5yPct === "number" ? sf.return5yPct : years.length >= 5 ? annualised(years.slice(-5)) : null;
  const tenYear = years.length >= 3 ? annualised(years) : null; // uses up to 10 years
  const mgmt = sf.fees?.management?.pct ?? null;
  return {
    provider,
    fund,
    fees: { fundFeePercent: pct(mgmt), adminFee: null, other: pct(mgmt) },
    performance: { oneYear: pct(oneYear), threeYear: pct(threeYear), fiveYear: pct(fiveYear), sinceInception: pct(tenYear) },
    sources: { feesUrl: "", performanceUrl: "" },
    asAtDate: "Morningstar KiwiSaver 360, Q1 2026 (returns to 31 March 2025)",
  };
}
