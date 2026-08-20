// Bulletproof check: confirms the Q2 CSV/JSON resolves every fund the SOA needs.
// Replicates the EXACT norm + Jaccard matcher in src/lib/site-funds.ts.
// Run in CI / after any CSV edit:  node scripts/verify-q2-coverage.mjs
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
const dir = dirname(fileURLToPath(import.meta.url));
const rows = JSON.parse(readFileSync(join(dir, "..", "src", "lib", "data", "ks-q2-2026-returns.json"), "utf8"));

const norm = (s) => (s || "").toLowerCase()
  .replace(/\b(kiwisaver|scheme|schemes|plan|the|a|s|fund|funds)\b/g, " ")
  .replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
const toks = (s) => norm(s).split(" ").filter(Boolean);
const CAT = rows.map((r) => ({ name: r.fund, tokens: new Set(toks(r.fund)), r }));
function q2(provider, fund) {
  const q = new Set(toks(`${provider || ""} ${fund || ""}`));
  if (!q.size) return null;
  let best = null, bestScore = 0, second = 0, bestName = "";
  for (const row of CAT) {
    if (!row.tokens.size) continue;
    let inter = 0; for (const t of row.tokens) if (q.has(t)) inter++;
    const union = new Set([...q, ...row.tokens]).size;
    const score = union ? inter / union : 0;
    if (score > bestScore) { second = bestScore; bestScore = score; best = row.r; bestName = row.name; }
    else if (score > second) second = score;
  }
  if (bestScore >= 0.8) return { ...best, _m: bestName };
  if (bestScore >= 0.5 && bestScore - second >= 0.08) return { ...best, _m: bestName };
  return null;
}
// [provider, fund, expect: 'match'|'null', expected oneYear (if match)]
const CASES = [
  ["Booster", "Geared Growth", "match", 19.8],
  ["Booster", "KiwiSaver Scheme Geared Growth Fund", "match", 19.8],
  ["Milford", "Conservative Fund", "match", 2.4],
  ["Milford", "Active Growth", "match", 7.8],
  ["Generate", "Focused Growth Fund", "match", 16.5],
  ["ANZ", "Balanced Fund", "match", 11.3],
  ["ANZ", "Balanced Growth Fund", "match", 14.1],
  ["ASB", "Growth Fund", "match", 16.9],
  ["ASB", "Conservative Fund", "match", 7.9],
  ["Westpac", "Balanced Fund", "match", 13.9],
  ["BNZ", "Growth Fund", "match", 16.1],
  ["Simplicity", "Growth Fund", "match", 17.6],
  ["AMP", "Aggressive Fund", "match", 21.4],
  ["Kiwibank", "Growth Fund", "null", null],
];
let fail = 0;
for (const [p, f, exp, ey] of CASES) {
  const r = q2(p, f);
  const ok = exp === "null" ? r === null : (r && Math.abs(r.oneYear - ey) < 0.001);
  if (!ok) fail++;
  console.log(`${ok ? "✓" : "✗ FAIL"}  ${p} ${f}  ->  ${r ? `${r._m} (1y=${r.oneYear})` : "null"}${exp === "null" ? "  [expected null]" : `  [expected 1y=${ey}]`}`);
}
console.log(`\n${CASES.length - fail}/${CASES.length} passed`);
process.exit(fail ? 1 : 0);
