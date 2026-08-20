// Site fund data — the SAME source the Smiths KiwiSaver site displays.
//
// Q2 fund PERFORMANCE (1/3/5/10-year returns) is the SINGLE SOURCE OF TRUTH for
// the SOA and comes from the Morningstar KiwiSaver 360 Q2 2026 survey (returns to
// 30 June 2026, after fees, before tax). Figures live in the human-editable CSV
// `data/ks-q2-2026-returns.csv` → built to `data/ks-q2-2026-returns.json` via
// `node scripts/build-q2-returns.mjs`. EVERY surveyed fund is covered (266), and
// a fund is matched by robust token-overlap so a name variation never drops the
// figures. An unmatched fund (e.g. Kiwibank — not in the survey) returns null and
// is flagged in validation — the SOA NEVER silently reuses an older report.
import fundsRaw from "./ks-site-funds.data.json";
import q2ReturnsRaw from "./data/ks-q2-2026-returns.json";
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
// Loaded from the CSV-built JSON (ALL 266 surveyed funds). Each row's fund name
// is tokenised once so we can match a case's fund by best token-overlap.
type Q2Row = { fund: string; oneYear: number | null; threeYear: number | null; fiveYear: number | null; tenYear: number | null };
const Q2_ROWS: Array<{ name: string; tokens: Set<string>; returns: Q2Performance }> = (
  q2ReturnsRaw as Q2Row[]
).map((r) => ({
  name: r.fund,
  tokens: new Set(q2Tokens(r.fund)),
  returns: { oneYear: r.oneYear, threeYear: r.threeYear, fiveYear: r.fiveYear, tenYear: r.tenYear },
}));

/** Tokenise a fund/provider string for Q2 matching. Drops only truly generic
 *  words (kiwisaver/scheme/fund) but KEEPS discriminators like "plan"/"two"/
 *  "default" so sibling schemes (Fisher Funds Plan Growth vs Fisher Funds Growth,
 *  ANZ Growth vs ANZ Default Growth) stay distinct instead of tying. */
function q2Tokens(s: string): string[] {
  return (s || "")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2") // split run-together names: "GrowthFund" -> "Growth Fund"
    .toLowerCase()
    .replace(/\b(kiwisaver|scheme|schemes|the|a|s|fund|funds)\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean);
}

/**
 * Resolve a fund's Q2 returns by ROBUST token-overlap — never an exact string
 * match, so a name variant ("ANZ Balanced Fund" vs "ANZ Balanced") still resolves.
 * Scores every catalogue fund by Jaccard similarity against the `provider fund`
 * tokens, takes the best, and requires a clear threshold + margin over the
 * runner-up so a near-sibling ("ANZ Balanced" vs "ANZ Balanced Growth") never
 * wins by accident and an unsurveyed fund (Kiwibank) returns null (→ flagged in
 * validation) rather than a false match.
 */
export function q2Performance(provider: string, fund: string): Q2Performance | null {
  const query = new Set(q2Tokens(`${provider || ""} ${fund || ""}`));
  if (query.size === 0) return null;
  let best: Q2Performance | null = null;
  let bestScore = 0;
  let secondScore = 0;
  for (const row of Q2_ROWS) {
    if (row.tokens.size === 0) continue;
    let inter = 0;
    for (const t of row.tokens) if (query.has(t)) inter += 1;
    const union = new Set([...query, ...row.tokens]).size;
    const score = union === 0 ? 0 : inter / union; // Jaccard
    if (score > bestScore) {
      secondScore = bestScore;
      bestScore = score;
      best = row.returns;
    } else if (score > secondScore) {
      secondScore = score;
    }
  }
  // Strong overlap AND a clear win over the runner-up → confident match.
  // A near-exact match (>=0.8) is safe even if a sibling sits close behind.
  if (bestScore >= 0.8) return best;
  if (bestScore >= 0.5 && bestScore - secondScore >= 0.08) return best;
  return null;
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

/**
 * Overlay a fund's Q2 report RETURNS onto its ProviderData, INDEPENDENT of the
 * Sorted catalogue. This is the guarantee the SOA needs: returns come from the
 * Q2 report whenever the fund is in the survey — even if `findSiteFund` couldn't
 * match the fund for fees/holdings, and even when there is no ProviderData at all
 * (a minimal record is built so the figures still render). A fund NOT in the Q2
 * survey keeps null performance — the SOA flags it and NEVER invents a number.
 */
export function withQ2Performance(
  pd: ProviderData | null,
  provider: string,
  fund: string,
): ProviderData | null {
  const q2 = q2Performance(provider, fund);
  if (!q2) return pd; // unsurveyed fund → leave blank (flagged downstream), never guess
  const performance = {
    oneYear: pct(q2.oneYear),
    threeYear: pct(q2.threeYear),
    fiveYear: pct(q2.fiveYear),
    sinceInception: pct(q2.tenYear),
  };
  if (pd) return { ...pd, performance };
  return {
    provider,
    fund,
    fees: { fundFeePercent: null, adminFee: null, other: null },
    performance,
    sources: { feesUrl: "", performanceUrl: "" },
    asAtDate: "Morningstar KiwiSaver 360, Q2 2026 (returns to 30 June 2026; after fees and before tax)",
  };
}
