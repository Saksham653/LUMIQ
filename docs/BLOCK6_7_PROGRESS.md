# Blocks 6 & 7 — progress

## Part A checkpoint (B6-1 … B6-4) — DONE, all green

Branch `block-6-7`. Full suite: **226 tests, 27 files, all passing.**
Build: green, `dist/assets/index-*.js` 301.10 kB → **94.89 kB gzip** (single chunk, before the B7-1 split).
`grep -rn "dangerouslySetInnerHTML|innerHTML|new Function|eval(" src` (non-test): nothing.
No CSP changes so far. No new runtime dependencies (papaparse already present).

### B6-1 — honest forecast (F12) — commit `157d482`
- `src/engine/forecast.js`: `buildForecast` needs **8+ points**, trains on all but the
  last 3, checks itself on those 3 (`errorPct`); over 30% off → `tooIrregular`, the UI
  says "too irregular for a reliable forecast" and **no AI call is made**.
- Confidence band = holdout RMSE × √(step), drawn as before.
- Chart narrative box shows the check line: "Checked on the last 3 points: off by about X%."
- `insights.js` and the Forecast-button gating share the same 8-point floor.
- Tests: perfect line (0% error), noisy-but-usable, irregular (flat-then-spike),
  too-few-points, band widens monotonically.

### B6-2 — What-if is a calculator (F14) — commit `78359ec`
- `src/engine/whatIf.js`: `computeWhatIf` applies the % change by the F9 aggregation
  rule (sums summed, rate-like columns averaged), optional group filter, blanks skipped.
- `WhatIfScreen` rewritten: measure/%/group selects → before/after/change table,
  computed instantly, **no key needed**. "Explain this" (with a key) sends only the
  small result table, reply runs through the number checker.
- `useScenario.js` (the old "ask the AI to imagine it" hook) deleted.
- Tests: hand-computed (+10% revenue, North: 935,000 → 1,028,500; total 4,770,500),
  rate-average case, blank handling, describe strings.

### B6-3 — one Data health screen (F15) — commit `e157765`
- `src/engine/dataHealth.js`: 100-point score with listed deductions — empties
  (1 pt per % per column), repeats (0.5), mixed-type text (5), robust MAD outliers
  (2 each, cap 10). Every deduction is a plain sentence ("6 of 100 cells in revenue
  are empty").
- Data health screen = score + deductions + the old Column-details cards
  (`ColumnCards.jsx`) + the existing deep-dive blocks. `ColumnDetailsScreen` deleted,
  sidebar/topbar entries removed.
- Honest numbers: Sales scores **98** (one real robust outlier in avg_order_value) —
  verified by hand, not forced to 100.

### B6-4 — report, exports and print (F17) — commit `9e3d24a`
- `src/engine/reportData.js`: every headline number computed in the browser with a
  footnote saying exactly how ("Sum of revenue across all 12 rows (blank cells
  skipped)."). Rate-like columns averaged, never summed.
- Report screen rewritten: numbered headline grid + footnotes list; works fully
  **without a key**. With a key, the AI summary is worded ONLY from the numbered
  engine facts and re-checked by the number checker (unmatched numbers flagged).
- Print: `@media print` stylesheet (A4, chrome hidden, ink-friendly); "🖨 Print or
  save as PDF" button.
- Exports: "⬇ Download filtered data (CSV)" on the data table (papaparse unparse,
  quoted commas round-trip) and "⬇ PNG" on the Visualization card (SVG → canvas → blob).
- Tests: footnote per number, totals/averages hand-checked (4,677,000 / 25.325),
  CSV round-trip incl. "Lucknow, UP" and blanks, PNG blob + aspect ratio with
  stubbed Image/canvas, image-error path, smoke test for the keyless Report UI.

### Leftovers / notes for Part B
- None blocking. The Report AI summary reuses the existing `useNarrative` hook
  (prompt now carries only the numbered facts — raw rows still never leave the browser).
- Bundle is one chunk (94.89 kB gzip); B7-1/B7-2 will add the worker split and the
  CDN-loaded SheetJS without touching this budget.

## Part B (B7-1 … B7-5) — DONE, all green

Final numbers (re-measured after the last commit):
**252 unit tests** (31 files) · **6/6 Playwright flows** (9.1 s) ·
build green — main **98.78 kB gzip** (vite) / 96.5 KB (zlib), worker chunk 26.9 kB,
Excel chunk 163.12 kB gzip loaded on demand · `node scripts/perf.mjs`: 100k×20
load + typing **1,726 ms Node** (target 3,000) · browser drop→preview **1,604 ms**
(perf.spec.js) · banned-pattern grep (`dangerouslySetInnerHTML|innerHTML|new
Function|eval(`) over src: **nothing** · **zero CSP changes** (`git diff main...HEAD
-- vercel.json` is empty) · Lighthouse accessibility **100** on the production preview.

### B7-1 — big files without freezing (F13) — commit `e551588`
- Parsing, type detection and plan running moved into a same-origin module
  worker (`new Worker(new URL(...), { type: "module" })`, no blob workers).
  Worker caches rows: Ask plans on a fresh upload copy nothing.
- Progress bar with live row counts (1 MB chunks) + working Cancel.
- Own ~25-line windowing in the data table: 100,000 rows ≈ 22–31 `<tr>`s.
- Found and fixed en route: papaparse newline detection breaks on tiny first
  chunks; spreading 100k parse errors blew the worker stack; my first perf
  CSV was malformed (unquoted ₹1,234) — perf.mjs now exits nonzero on parse
  errors so timings can never be measured on garbage again.

### B7-2 — Excel (F6 completion) — commit `9ff1c84`
- SheetJS **0.20.3** pinned from the official `cdn.sheetjs.com` tarball (npm
  xlsx 0.18.x not used). Dynamic `import()` only — verified in-browser: zero
  xlsx network requests until an .xlsx is chosen.
- Sheet picker, Excel dates → real dates (round-to-second drift guard),
  blank/merged headers → "Column 3", duplicate headers de-collided.
- Main bundle cost: +1.52 kB gzip of picker/branching UI, zero SheetJS bytes.

### B7-3 — accessibility — commit `1192ccf`
- Real buttons everywhere, focus-visible ring, labels on icon-only controls,
  "View as table" + text description on every chart (main, 2 sparklines,
  donuts, heatmap, anomaly scatter), all HTML text ≥12 px, AA contrast
  measured in-browser on all six screens (violet → #a78bfa was the one real
  fix), reduced-motion kills animations, 360 px with no sideways scroll.
- vitest-axe on all 8 screens: 0 serious/critical. Lighthouse a11y: **100**.

### B7-4 — end-to-end tests — commit `86f19b6`
- Playwright, Chromium only, against `vite preview` (production CSP live).
  Groq mocked by route interception; no real key anywhere.
- The 5 required flows + a perf spec that re-measures the browser target
  (1,604 ms this run). Separate `e2e` job added to ci.yml.

### B7-5 — docs — commit `55ec465`
- README rewritten to the shipped app; a "Measured, not promised" table with
  only measured claims + repro commands; Privacy section added.
- PRD: Status cell on all 18 F-rows — **15 Done, 3 Partly done**
  (F8: accuracy set is 23 questions, not 50 · F10: with Forecast off the
  chart still follows table sort · F13: unusual values listed but not yet
  clickable through to rows) — plus measured results under the Targets table.
