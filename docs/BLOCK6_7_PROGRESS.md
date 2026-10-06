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

## Part B (B7-1 … B7-5) — pending
