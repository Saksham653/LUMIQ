<div align="center">

<img src="https://readme-typing-svg.demolab.com?font=Syne&weight=800&size=42&pause=1000&color=00D4FF&center=true&vCenter=true&width=600&height=80&lines=LUMIQ;Luminous+Intelligence+Queries" alt="LUMIQ" />

<br />

> **Data that talks back.**

<br />

[![Live App](https://img.shields.io/badge/🚀%20Live%20App-lumiq.vercel.app-00D4FF?style=for-the-badge&labelColor=050914)](https://lumiq-saksham-srivastavas-projects-a00eb29a.vercel.app/)
[![Landing Page](https://img.shields.io/badge/🌐%20Landing%20Page-saksham653.github.io-7B4FE8?style=for-the-badge&labelColor=050914)](https://saksham653.github.io/LUMIQ/)

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

**LUMIQ** *(Luminous Intelligence Queries)* is a zero-backend, browser-native AI analytics platform that transforms raw datasets into **living, breathing intelligence**. No servers. No database. No bloat. Just your data and a Groq API key — and suddenly your spreadsheets start talking.

Built on **Groq's ultra-fast inference engine** running **Llama 3.3 70B**, LUMIQ delivers sub-100ms AI responses directly in the browser. You ask questions in plain English. Oracle answers in milliseconds. That's it.

> *Not just charts. Decision intelligence.*

<br />

---

## 🔗 Quick Links

| | |
|---|---|
| 🌐 **Landing Page** | [https://saksham653.github.io/LUMIQ/](https://saksham653.github.io/LUMIQ/) |
| 🚀 **Live Application** | [https://lumiq-saksham-srivastavas-projects-a00eb29a.vercel.app/](https://lumiq-saksham-srivastavas-projects-a00eb29a.vercel.app/) |

<br />

---

## 🌟 Feature Showcase

### ⬡ Canvas — Your Data, Alive

The Canvas is LUMIQ's command center. The moment you load a dataset, it transforms into a real-time analytics dashboard:

- **Smart KPI tiles** — Total, Average, Peak Value with sparklines and donut breakdowns
- **Interactive charts** — Bar, Line, and Area views with adaptive downsampling for massive datasets
- **Sortable, searchable data table** with pagination that handles 50K+ rows without breaking a sweat
- **Auto-Insights engine** — detects statistically significant trends (>20% change) automatically, no prompting needed

---

### 🔮 Crystal Ball — AI-Powered Forecasting

Toggle the Crystal Ball overlay on any metric and watch LUMIQ project the future:

- **Linear regression trendlines** with confidence bands rendered directly on the chart
- **R² goodness-of-fit** displayed inline so you know exactly how much to trust the forecast
- **Groq-generated forecast narrative** — Oracle explains in plain English what the numbers predict, what it means for your business, and what to watch out for

---

### 💬 AI Data Filter — Natural Language Querying

Forget filter dropdowns. Just *describe* what you want:

```
"Show me rows where revenue is over 300,000 and the region is North"
"Find all months with profit margin below 25%"
"Give me the top performing categories only"
```

LUMIQ sends your intent to Groq, which returns a JavaScript arrow function, executes it safely, and instantly updates every chart, metric, and table on the Canvas. The generated filter code is shown transparently so you always know exactly what's happening.

---

### 🗣️ Oracle AI — Conversational Data Intelligence

A full streaming chat interface powered by Groq + Llama 3.3 70B, seeded with your live dataset context:

- Answers questions about your data with **actual numbers**, not vague summaries
- Uses `→` for implications and `•` for key findings — structured for fast reading
- Ends every response with a sharp follow-up question to keep the analysis moving
- Streams token-by-token in real-time — no waiting, no spinners, just instant intelligence

---

### 📄 Decision Brief Generator — Auto Reports

One click. One executive-grade report. Oracle structures its analysis into:

```
HEADLINE        → The single most important thing
WHAT HAPPENED   → Real numbers, real trends  
WHY IT MATTERS  → Business implication
THE RISK        → What could go wrong
RECOMMENDED ACTION → One concrete next step
```

Copy to clipboard or regenerate with a fresh perspective.

---

### 🌐 Scenario Forge — What-If Engine

Ask anything — hypothetical or factual. Oracle returns a structured probabilistic analysis:

- **What-if scenarios** → Optimistic / Base Case / Pessimistic with probability bars
- **Direct questions** → Overview / Key Insight / What To Watch
- Every scenario includes a key driver, impact indicator, and percentage probability
- Works with your live, filtered dataset — not stale data

---

### 🔬 AI Lab — Deep Statistical Analysis

The AI Lab runs a full statistical teardown and sends it to Groq for interpretation:

- **Pearson Correlation Heatmap** — a full N×N matrix showing how every numeric column relates to every other. Positive correlations in cyan. Negative in red.
- **Z-Score Anomaly Detection** — flags outliers with Z-score > 2.8 and plots them as a scatter chart with anomalies highlighted in red
- **AI Interpretation** — Groq reads the raw statistics and writes an executive summary with plain-English business findings

---

### 🧬 Data DNA — Column Profiler

A deep X-ray of every column in your dataset:

- **Type detection** — Numeric vs Categorical, auto-detected
- **Completeness** — non-null ratio, unique value count
- **Statistics** — min, max, mean, median, std deviation for numeric columns
- **Top Values** — frequency ranking for categorical columns
- **Distribution Histogram** — 10-bin visual distribution per column
- **Data Quality Score** — 0–100 composite score based on completeness, variety, and coverage
- Animated donut ring for every column's quality score

---

### 🗃️ Data Manager — Upload Your Own Data

Drop any CSV file and LUMIQ handles the rest:

- Auto-detects column types (numeric vs string)
- Parses all rows, strips whitespace, handles quoted values
- Immediately activates it as a live dataset across all 7 features
- Three curated sample datasets included: **E-Commerce Sales**, **Marketing Campaign**, **Customer Churn**

<br />

---

## ⚡ Tech Stack

```
Frontend    →  React 18 + Vite 5   (zero dependencies beyond React)
AI Engine   →  Groq API            (Llama 3.3 70B, streaming)
Charts      →  Pure SVG            (hand-crafted, no chart library)
Styling     →  Vanilla CSS-in-JS   (no Tailwind, no styled-components)
Fonts       →  Syne + DM Mono + DM Sans (Google Fonts)
Deployment  →  Vercel (app) + GitHub Pages (landing)
```

Zero external UI libraries. Every chart — bar, line, area, donut, heatmap, scatter — is handwritten SVG. That's intentional. It keeps the bundle tiny and the visuals perfectly on-brand.

<br />

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- A free Groq API key from [console.groq.com](https://console.groq.com)

### Run Locally

```bash
# Clone the repo
git clone https://github.com/saksham653/LUMIQ.git
cd LUMIQ

# Install dependencies
npm install

# Start dev server
npm run dev
```

Open `http://localhost:5173` and enter your Groq API key when prompted.

### Build for Production

```bash
npm run build
npm run preview
```

### Environment Variable (Optional)

To skip the API key setup screen, set:

```env
VITE_GROQ_API_KEY=gsk_your_key_here
```

<br />

---

## 📁 Project Structure

```
LUMIQ/
├── src/
│   ├── App.jsx          # Entire application (single-file architecture)
│   └── main.jsx         # React entry point
├── public/
│   └── lumiq-icon.svg   # Prism logo
├── index.html
├── vite.config.js
└── package.json
```

LUMIQ is intentionally a **single-file React app** — `App.jsx` contains every component, every chart, every AI integration, and every screen. No route files, no component folders, no abstraction overhead. Just code.

<br />

---

## 🎨 Design System

| Token | Value | Used For |
|---|---|---|
| `#050914` | Deep Navy | App background |
| `#00D4FF` | Cyan | Primary accent, numeric values |
| `#FFB627` | Gold | Forecasts, narrative highlights |
| `#7B4FE8` | Violet | AI features, Oracle |
| `#00E5A0` | Emerald | Positive trends, success states |
| `Syne 800` | Display font | Headings, labels |
| `DM Mono` | Monospace | Numbers, data, code |
| `DM Sans` | Body font | Prose, descriptions |

<br />

---

## 🔑 API Key

LUMIQ uses the **Groq API** for all AI features. Getting a key is free and takes 30 seconds:

1. Go to [console.groq.com](https://console.groq.com)
2. Sign up and create an API key
3. Paste it into LUMIQ's setup screen

All API calls are made **directly from your browser** — your key never touches any server. You can also run LUMIQ in **Demo Mode** without a key to explore the UI (AI features will be simulated).

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
🌐 [saksham653.github.io/LUMIQ](https://saksham653.github.io/LUMIQ/)

<br />

---

<div align="center">

**If LUMIQ made your data smarter, give it a ⭐ — it takes one second and means the world.**

<br />

[![Star this repo](https://img.shields.io/badge/⭐%20Star%20this%20repo-It%20helps%20a%20lot!-FFB627?style=for-the-badge&labelColor=050914)](https://github.com/saksham653/LUMIQ)

<br />

*Built with obsession by Saksham Srivastava · Powered by Groq · © 2026*

</div>
