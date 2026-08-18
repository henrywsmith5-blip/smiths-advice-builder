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

/** Strip document noise words so provider + fund names compare cleanly. */
function norm(s: string, stripFundWords = true): string {
  const fundWords = stripFundWords ? "|fund|funds" : "";
  return (s || "")
    .toLowerCase()
    .replace(new RegExp(`\\b(kiwisaver|scheme|schemes|plan|the|a|s${fundWords})\\b`, "g"), " ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function editDistance(a: string, b: string): number {
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const previous = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i += 1) {
    const current = [i];
    for (let j = 1; j <= b.length; j += 1) {
      current[j] = Math.min(
        current[j - 1] + 1,
        previous[j] + 1,
        previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
    for (let j = 0; j <= b.length; j += 1) previous[j] = current[j];
  }
  return previous[b.length];
}

function similarity(a: string, b: string): number {
  if (a === b) return 1;
  const longest = Math.max(a.length, b.length);
  return longest ? 1 - editDistance(a, b) / longest : 0;
}

function tokenSimilarity(a: string, b: string): number {
  const aTokens = a.split(" ").filter(Boolean);
  const bTokens = b.split(" ").filter(Boolean);
  if (!aTokens.length || !bTokens.length) return 0;
  const directional = (from: string[], to: string[]) =>
    from.reduce((sum, token) => sum + Math.max(...to.map((candidate) => similarity(token, candidate))), 0) / from.length;
  return (directional(aTokens, bTokens) + directional(bTokens, aTokens)) / 2;
}

function removeProviderWords(fund: string, provider: string): string {
  const providerWords = new Set(norm(provider, false).split(" ").filter(Boolean));
  return norm(fund).split(" ").filter((word) => !providerWords.has(word)).join(" ");
}

type FundMatch = { fund: SiteFund; score: number };

function closestSiteFund(provider: string, fund: string): FundMatch | null {
  const providerName = norm(provider, false);
  const requestedFund = removeProviderWords(fund, provider);
  if (!providerName || !requestedFund) return null;

  const candidates = FUNDS
    .map((siteFund) => {
      const schemeName = norm(siteFund.schemeName || "", false);
      const providerScore = similarity(providerName, schemeName);
      const candidateFund = removeProviderWords(siteFund.fundName, siteFund.schemeName || provider);
      const fundScore = similarity(requestedFund, candidateFund) * 0.7 + tokenSimilarity(requestedFund, candidateFund) * 0.3;
      return { fund: siteFund, providerScore, score: fundScore };
    })
    .filter((candidate) => candidate.providerScore >= 0.72)
    .sort((a, b) => b.score - a.score);

  const best = candidates[0];
  const runnerUp = candidates[1];
  if (!best || best.score < 0.72) return null;
  // Reject genuinely ambiguous names instead of silently selecting the wrong fund.
  if (runnerUp && best.score - runnerUp.score < 0.06) return null;
  return { fund: best.fund, score: best.score };
}

/** Match spelling mistakes and missing letters to a fund within the named provider. */
export function findSiteFund(provider: string | null | undefined, fund: string | null | undefined): SiteFund | null {
  if (!provider || !fund) return null;
  return closestSiteFund(provider, fund)?.fund || null;
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
// Each entry must match the canonical provider and fund name exactly.
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
  const match = Q2_PERFORMANCE.find(({ tokens }) => tokens.join(" ") === key);
  return match?.returns || null;
}

function titleCase(name: string): string {
  return name.toLowerCase().replace(/\b[a-z]/g, (letter) => letter.toUpperCase());
}

function displayProviderName(schemeName: string): string {
  const name = norm(schemeName, false);
  return titleCase(name)
    .replace(/\bNz\b/g, "NZ")
    .replace(/\bAnz\b/g, "ANZ")
    .replace(/\bAsb\b/g, "ASB")
    .replace(/\bBnz\b/g, "BNZ")
    .replace(/\bAmp\b/g, "AMP")
    .replace(/\bSbs\b/g, "SBS")
    .replace(/\bMas\b/g, "MAS");
}

function displayFundName(siteFund: SiteFund, provider: string): string {
  const canonicalProvider = siteFund.schemeName || provider;
  const providerWords = new Set(norm(canonicalProvider, false).split(" ").filter(Boolean));
  const words = siteFund.fundName
    .split(/\s+/)
    .filter((word) => {
      const clean = word.toLowerCase().replace(/[^a-z0-9]/g, "");
      return clean !== "kiwisaver" && clean !== "scheme" && clean !== "plan" && !providerWords.has(clean);
    });
  return titleCase(words.join(" "));
}

/** Resolve a confidently matched misspelling to the catalogue's canonical fund name. */
export function canonicalKiwisaverFundName(provider: string, fund: string): string {
  const match = closestSiteFund(provider, fund);
  return match ? displayFundName(match.fund, provider) : fund;
}

/** Resolve a confidently matched provider misspelling from the same catalogue entry. */
export function canonicalKiwisaverProviderName(provider: string, fund: string): string {
  const match = closestSiteFund(provider, fund);
  return match?.fund.schemeName ? displayProviderName(match.fund.schemeName) : provider;
}

/** Convert a site fund into the Builder's ProviderData (fees + Q2 performance). */
export function siteFundToProviderData(
  sf: SiteFund,
  provider: string,
  fund: string,
): ProviderData {
  const mgmt = sf.fees?.management?.pct ?? null;
  // Performance is keyed from the matched catalogue names, never raw input text.
  const canonicalProvider = sf.schemeName || provider;
  const canonicalFund = removeProviderWords(sf.fundName, canonicalProvider);
  const q2 = q2Performance(canonicalProvider, canonicalFund);
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
