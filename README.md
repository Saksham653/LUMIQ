<div align="center">

<img src="https://readme-typing-svg.demolab.com?font=Syne&weight=800&size=42&pause=1000&color=00D4FF&center=true&vCenter=true&width=600&height=80&lines=LUMIQ;Luminous+Intelligence+Queries" alt="LUMIQ" />

<br />

> **Ask your spreadsheet a question in plain words and get an answer you can check.**

<br />

[![Live App](https://img.shields.io/badge/🚀%20Live%20App-lumiq--silk.vercel.app-00D4FF?style=for-the-badge&labelColor=050914)](https://lumiq-silk.vercel.app/)

<br />

[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=white)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-5-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Groq](https://img.shields.io/badge/Groq-Llama%203.3%2070B-F55036?style=flat-square)](https://console.groq.com/)
[![License](https://img.shields.io/badge/License-MIT-00E5A0?style=flat-square)](LICENSE)
[![Stars](https://img.shields.io/github/stars/saksham653/LUMIQ?style=flat-square&color=FFB627)](https://github.com/saksham653/LUMIQ/stargazers)

<br />

---

</div>

<br />

## ✨ What is LUMIQ?

**LUMIQ** is a browser-only data app: drop in a CSV or Excel file and ask questions in plain English. The rule that makes it different: **numbers come from code, words come from AI**. Every figure on screen is calculated in your browser on all of your rows; the AI only decides *what* to calculate and words the result — and every number it states is checked against the real calculation before you see it.

There is no backend. Your rows never leave your device (see [Privacy](#-privacy)).

<br />

---

## 📏 Measured, not promised

Every performance or quality claim in this README was measured on this build (Oct 6, 2026 — dev machine, Node 24 / Chromium 153; CI re-runs the same suites on every push):

| Claim | Measured |
|---|---|
| Answer accuracy | **23 of 23** hand-computed accuracy cases exactly right (totals, averages, groupings, shares, medians, filters across the 3 samples) |
| Unverified AI numbers | Always marked — a number the checker cannot match to the calculation gets a visible "not verified" warning |
| 100,000 × 20 file (12.9 MB) | Load + type detection **1,772 ms** in Node, **1,751–1,889 ms** in Chromium (parsed in a Web Worker — the page never freezes; target was 3,000 ms) |
| Main bundle | **98.76 kB gzip** (plus a 26.9 kB worker chunk; the Excel reader is its own 163 kB gzip chunk fetched only when you open an Excel file) |
| Accessibility | Lighthouse accessibility **100** on the production preview; axe reports **0 serious/critical** violations on all 8 screens; AA contrast measured in-browser on every screen |
| Tests | **252 unit tests + 6 Playwright end-to-end flows**, run in CI on every push |

Reproduce them yourself: `npm test`, `npm run build && node scripts/perf.mjs`, `npm run test:e2e`.

<br />

---

## 🌟 What each screen does

### ⬡ Overview
Metric tiles (totals summed, rate-like columns averaged — a profit margin is never "totalled"), a hand-drawn SVG chart with PNG export, honest auto-insights computed on the filtered rows, and a windowed data table that keeps ~30 DOM rows even with 100,000 loaded. The AI Data Filter turns "revenue over 300,000 in North" into a validated filter plan — never code — and applies it to everything at once.

### 🗣️ Ask
The proof-flow screen. Your question goes out with a **schema summary only** (column names, types, per-column stats — no rows). The AI returns a small calculation plan; LUMIQ validates it against your real columns, runs it on **every row in your browser**, streams the AI's wording of the result, and marks any number that doesn't match the result table as *not verified*. **Show the work** lists the steps, the result table and "Based on N of M rows"; **What was sent** shows the exact text that left your browser. Follow-ups ("and by category?") modify the previous plan; **New topic** starts fresh.

### 📄 Report
One printable page. Every headline number is computed by the engine and carries a numbered footnote saying exactly how ("Sum of revenue across all 12 rows (blank cells skipped)."). With a key, an optional AI summary is worded only from those footnoted numbers and re-checked by the number checker. **🖨 Print or save as PDF** uses a real A4 print stylesheet.

### 🌐 What-if
A calculator, not a guess. Pick a measure, a change ("+10%") and optionally a group ("only North"); the browser recalculates before/after/change for every group and the total. No invented probabilities — with a key, "Explain this" lets the AI word the already-calculated table.

### 🔮 Forecast (on the Overview chart)
Only offered when the data has a real time column with at least 8 points. It trains on all but the last 3 points, tests itself on those 3, and tells you the result in plain words ("Checked on the last 3 points: off by about 12%"). More than 30% off → it says the data is too irregular and refuses, with no AI call. The band widens the further out it projects.

### 🔬 Data health
One screen, no key needed: a 100-point score where **every lost point is listed in plain words** ("6 of 100 cells in revenue are empty", "1 unusual value in avg_order_value"), per-column profile cards, and a deep dive with a correlation heatmap and a median-based unusual-value scatter. Honest by design — even our own Sales sample scores 98, not 100.

### 🗃️ Files
Drop a **CSV or Excel** file. Big files parse in a Web Worker with a live row-count progress bar and a Cancel button. Excel (.xlsx/.xls, SheetJS pinned from the official CDN build) gets a sheet picker, real dates instead of serial numbers, and "Column 3" names for blank headers. Every upload shows a preview first — row/column counts, detected types you can override, plain warnings — and nothing loads until you confirm. Your datasets, Ask history and open screen persist in the browser (IndexedDB); one button deletes everything.

### ♿ Accessibility
Everything clickable is a real button, reachable by keyboard with a visible focus ring. Every chart has a **"View as table"** toggle and a text description. Text is at least 12 px, contrast meets WCAG AA, animations stop under `prefers-reduced-motion`, and the layout works at 360 px with no sideways scrolling.

<br />

---

## 🔒 Privacy

- **Your rows stay on this device.** Files are parsed, stored (IndexedDB) and calculated entirely in your browser. There is no server.
- **What is sent to the AI** (only when you connect your own Groq key, and only for AI features): your question, the column names/types with small per-column summaries, the validated calculation plan, and the small result table the engine produced. Never the rows. Every Ask answer has a **"What was sent"** link showing the exact text that left the browser.
- **Your key** is held in memory for the session; "Remember on this device" (opt-in) stores it in your browser's localStorage. It is sent only to `api.groq.com` — the Content-Security-Policy forbids the page from talking to anywhere else.
- **Delete everything stored on this device** (on Files) removes saved datasets, Ask history and the remembered key in one click.
- No key? Demo Mode keeps working: every chart, tile, insight, health score, what-if calculation and report number is computed locally.

<br />

---

## ⚡ Tech Stack

```
Frontend    →  React 18 + Vite 5
Runtime deps→  react, react-dom, papaparse, xlsx (SheetJS 0.20.3, pinned
               from cdn.sheetjs.com, loaded only when an Excel file is opened)
AI          →  Groq API (Llama 3.3 70B, streaming), your own key, browser → Groq directly
Charts      →  Hand-written SVG (no chart library)
Workers     →  Parsing, type detection and plan running run off the main thread
Tests       →  Vitest (252) + Playwright (6 flows, Chromium, Groq mocked)
Deployment  →  Vercel only (production from main, previews from branches), CSP in vercel.json
```

<br />

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- Optional: a free Groq API key from [console.groq.com](https://console.groq.com) for the AI features

### Run Locally

```bash
git clone https://github.com/saksham653/LUMIQ.git
cd LUMIQ
npm install
npm run dev
```

Open `http://localhost:3000` (the dev server port set in `vite.config.js`). Try the demo without a key, or connect yours.

### Checks

```bash
npm test               # 252 unit tests
npm run build          # production build
npm run preview        # serves the build with the real CSP headers
node scripts/perf.mjs  # 100k×20 speed + bundle-size measurements
npm run test:e2e       # 6 Playwright flows against the production build
```

### Deploy

LUMIQ deploys to **Vercel only**: every push to `main` is production, every branch push gets a preview URL. `vercel.json` sets the security headers — a Content-Security-Policy that lets the page talk only to itself and `https://api.groq.com` (scripts from itself only, which also covers the module Web Worker; styles/fonts only from Google Fonts; `frame-ancestors 'none'`), plus `X-Content-Type-Options: nosniff` and `Referrer-Policy: no-referrer`. CI runs the unit tests, the build and the Playwright suite on every push.

<br />

---

## 📁 Project Structure

```
LUMIQ/
├── src/
│   ├── App.jsx            # Shell: state, routing between screens
│   ├── screens/           # Overview, Ask, Report, What-if, Data health, Files, setup
│   ├── components/        # Tiles, tables, chart/table toggle, upload preview, …
│   ├── charts/            # Hand-written SVG charts
│   ├── engine/            # runPlan, validatePlan, insights, forecast, whatIf,
│   │                      #   dataHealth, reportData (+ accuracy tests)
│   ├── ai/                # Groq client, prompts, schema summary, number checker
│   ├── data/              # CSV (papaparse), Excel (SheetJS), types, samples
│   ├── worker/            # The data worker + client (parse/type/plan off-thread)
│   ├── hooks/             # Oracle chat, narrative, forecast, persistence, …
│   └── lib/               # Stats, filter plans, stream reader, exports, styles
├── e2e/                   # Playwright flows (Groq mocked by route interception)
├── scripts/perf.mjs       # The measured speed numbers
├── docs/PRD.md            # The fix plan, with a Status line per requirement
└── vercel.json            # CSP + deploy headers
```

No file is longer than 300 lines.

<br />

---

## 🎨 Design System

| Token | Value | Used For |
|---|---|---|
| `#050914` | Deep Navy | App background |
| `#00D4FF` | Cyan | Primary accent, numeric values |
| `#FFB627` | Gold | Forecasts, narrative highlights |
| `#7B4FE8` | Violet | AI features (text uses `#a78bfa` for AA contrast) |
| `#00E5A0` | Emerald | Positive trends, success states |
| `Syne 800` | Display font | Headings, labels |
| `DM Mono` | Monospace | Numbers, data, code |
| `DM Sans` | Body font | Prose, descriptions |

<br />

---

## 🔑 API Key

AI features use the **Groq API** with your own free key:

1. Go to [console.groq.com](https://console.groq.com)
2. Sign up and create an API key
3. Paste it into LUMIQ's setup screen

Calls go **directly from your browser to Groq** — no server in between. The key stays in memory unless you tick **"Remember on this device"**. Demo Mode works without any key; AI-only controls explain what a key would add.

<br />

---

## 🤝 Contributing

Pull requests are welcome. For significant changes, open an issue first to discuss what you'd like to change.

1. Fork the repository
2. Create your feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

<br />

---

## 📬 Contact

**Saksham Srivastava**

✉️ [sakshamsrivastava7000@gmail.com](mailto:sakshamsrivastava7000@gmail.com)
🌐 [lumiq-silk.vercel.app](https://lumiq-silk.vercel.app/)

<br />

---

<div align="center">

**If LUMIQ made your data smarter, give it a ⭐ — it takes one second and means the world.**

<br />

[![Star this repo](https://img.shields.io/badge/⭐%20Star%20this%20repo-It%20helps%20a%20lot!-FFB627?style=for-the-badge&labelColor=050914)](https://github.com/saksham653/LUMIQ)

<br />

*Built with obsession by Saksham Srivastava · Powered by Groq · © 2026*

</div>
