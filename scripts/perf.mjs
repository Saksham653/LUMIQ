// Speed check (F13): generates a 100,000 x 20 CSV with mixed types
// and blanks, then measures the exact code the app runs — parse,
// type detection, coercion and one grouped plan. Targets: under
// 3,000 ms for load + typing, main bundle under 150 KB gzip.
// Run: node scripts/perf.mjs

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { parseCsvText } from "../src/data/csv.js";
import { detectColumnTypes, coerceRows } from "../src/data/columnTypes.js";
import { runPlan } from "../src/engine/runPlan.js";

const ROWS = 100_000;

// Deterministic PRNG so every run measures the same file.
let seed = 42;
const rand = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
const pick = (arr) => arr[Math.floor(rand() * arr.length)];
const blank = () => rand() < 0.03; // ~3% blanks

const REGIONS = ["North", "South", "East", "West", "Central", "NE", "NW", "SE", "SW", "Metro", "Rural", "Online"];
const PRODUCTS = Array.from({ length: 50 }, (_, i) => `Product ${i + 1}`);
const CHANNELS = ["Web", "Store", "Partner", "Phone", "App"];
const CITIES = ['"Lucknow, UP"', '"Mumbai, MH"', "Delhi", "Pune", "Chennai", "Kolkata"];
const STATUSES = ["open", "closed", "pending"];

function makeCsv() {
  const header = "order_id,date,month,region,product,channel,city,revenue,units,price,discount_pct,cost,profit_margin,score,customer_count,rating,status,notes,ref_code,misc";
  const lines = [header];
  for (let i = 0; i < ROWS; i++) {
    const d = new Date(2023, Math.floor(rand() * 24), 1 + Math.floor(rand() * 28));
    lines.push([
      i + 1,
      `${d.getFullYear()}-${String(d.getMonth() % 12 + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`,
      ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][d.getMonth() % 12],
      pick(REGIONS),
      pick(PRODUCTS),
      pick(CHANNELS),
      blank() ? "" : pick(CITIES),
      blank() ? "" : `"₹${(1000 + Math.floor(rand() * 900000)).toLocaleString("en-US")}"`,
      blank() ? "" : Math.floor(rand() * 500),
      (10 + rand() * 990).toFixed(2),
      blank() ? "" : `${(rand() * 40).toFixed(1)}%`,
      Math.floor(rand() * 80000),
      (5 + rand() * 45).toFixed(2),
      Math.floor(rand() * 100),
      blank() ? "" : Math.floor(rand() * 5000),
      (1 + rand() * 4).toFixed(1),
      pick(STATUSES),
      blank() ? "" : "routine order",
      `REF-${Math.floor(rand() * 1e6)}`,
      rand() < 0.5 ? "A" : "B",
    ].join(","));
  }
  return lines.join("\r\n");
}

const fmt = (ms) => `${Math.round(ms)} ms`;
const time = (label, fn) => {
  const t0 = performance.now();
  const out = fn();
  const ms = performance.now() - t0;
  console.log(`  ${label.padEnd(34)} ${fmt(ms).padStart(9)}`);
  return [out, ms];
};

console.log(`Generating ${ROWS.toLocaleString("en-US")} x 20 CSV (mixed types, ~3% blanks)…`);
const csv = makeCsv();
console.log(`  CSV size: ${(csv.length / 1024 / 1024).toFixed(1)} MB\n`);

console.log("Node timings (same functions the app ships):");
const [{ columns, rows, errors }, tParse] = time("parse (papaparse, quoted commas)", () => parseCsvText(csv));
if (errors.length > 0) {
  console.log(`  !! ${errors.length} parse errors — the generated CSV is malformed, timings are void`);
  console.log(`  first: ${JSON.stringify(errors[0])}`);
  process.exit(1);
}
const [types, tTypes] = time("type detection (all rows)", () => detectColumnTypes(rows, columns));
const [data, tCoerce] = time("coerce to typed cells", () => coerceRows(rows, columns, types));
const loadMs = tParse + tTypes + tCoerce;

const [planOut, tPlan] = time("grouped plan (sum revenue by region)", () =>
  runPlan(data, columns, {
    groupBy: ["region"],
    measures: [{ op: "sum", column: "revenue", as: "total_revenue" }],
    sort: { by: "total_revenue", dir: "desc" },
  })
);

console.log(`\n  rows parsed: ${rows.length.toLocaleString("en-US")}, groups: ${planOut.table.length}`);
console.log(`  load + typing total: ${fmt(loadMs)}  →  target 3,000 ms: ${loadMs < 3000 ? "PASS" : `MISS by ${fmt(loadMs - 3000)}`}`);
console.log(`  grouped plan: ${fmt(tPlan)}`);

// Bundle budget — measured from the real build output when present.
const assets = "dist/assets";
if (existsSync(assets)) {
  console.log("\nBundle sizes (gzip):");
  let mainOk = null;
  for (const f of readdirSync(assets).filter((f) => f.endsWith(".js"))) {
    const gz = gzipSync(readFileSync(`${assets}/${f}`)).length;
    const isMain = f.startsWith("index-");
    if (isMain) mainOk = gz < 150 * 1024;
    console.log(`  ${f.padEnd(34)} ${(gz / 1024).toFixed(1).padStart(7)} KB${isMain ? `  →  target 150 KB: ${gz < 150 * 1024 ? "PASS" : "MISS"}` : ""}`);
  }
  if (mainOk === null) console.log("  (no index-*.js found — run npm run build first)");
} else {
  console.log("\nBundle sizes: dist/ not found — run npm run build first.");
}
