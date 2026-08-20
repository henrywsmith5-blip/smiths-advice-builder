// Build the runtime JSON from the human-editable CSV source of truth.
//   Source:  src/lib/data/ks-q2-2026-returns.csv   (Morningstar KiwiSaver 360 Q2 2026, to 30 Jun 2026)
//   Output:  src/lib/data/ks-q2-2026-returns.json  (imported by src/lib/site-funds.ts)
// Run after editing the CSV:  node scripts/build-q2-returns.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const dir = dirname(fileURLToPath(import.meta.url));
const csvPath = join(dir, "..", "src", "lib", "data", "ks-q2-2026-returns.csv");
const jsonPath = join(dir, "..", "src", "lib", "data", "ks-q2-2026-returns.json");

const num = (s) => (s === undefined || s.trim() === "" ? null : Number(s));
// tiny CSV parser (no quoted commas in this data — fund names have none)
const lines = readFileSync(csvPath, "utf8").trim().split(/\r?\n/);
const header = lines[0].split(",");
const idx = (k) => header.indexOf(k);
const rows = lines.slice(1).map((line) => {
  const c = line.split(",");
  return {
    fund: c[idx("fund")].trim(),
    oneYear: num(c[idx("oneYear")]),
    threeYear: num(c[idx("threeYear")]),
    fiveYear: num(c[idx("fiveYear")]),
    tenYear: num(c[idx("tenYear")]),
  };
}).filter((r) => r.fund);

writeFileSync(jsonPath, JSON.stringify(rows, null, 1) + "\n");
console.log(`built ${rows.length} funds -> ${jsonPath}`);
