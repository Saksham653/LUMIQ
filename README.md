# LUMIQ — Luminous Intelligence Queries
### AI-Powered Data Analytics · Groq Edition

> *"Where data stops being something you look at, and starts being something that talks back."*

---

## 🚀 Quick Start

### 1. Install dependencies
```bash
npm install
```

### 2. Run the dev server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 3. Get your free Groq API key
Go to [console.groq.com](https://console.groq.com) → Sign up free → Create API Key

Paste it in the LUMIQ setup screen when prompted.

---

## ✨ Features

| Feature | Description |
|---|---|
| **🧠 Oracle AI** | Conversational data analyst powered by Groq's Llama 3 70B — sub-100ms responses |
| **📄 Narrative Generator** | Transforms raw data into executive Decision Briefs |
| **🔮 Scenario Forge** | What-if scenario modeling with probabilistic outcome trees |
| **⬡ Canvas** | Auto-insights, KPI cards, and interactive SVG charts |
| **🗃️ Data Manager** | Upload any CSV — up to 32K+ rows supported |

---

## ⚙️ Tech Stack

- **React 18** + **Vite** — Fast development & build
- **Groq API** — `llama3-70b-8192` model, real-time streaming
- **Pure CSS-in-JS** — No external UI libraries, full custom design
- **Custom SVG Charts** — No chart library dependencies

---

## 📁 Project Structure

```
lumiq/
├── index.html              # Entry point
├── vite.config.js          # Vite configuration
├── package.json
├── public/
│   └── lumiq-icon.svg      # Prism logo favicon
└── src/
    ├── main.jsx            # React root mount
    └── App.jsx             # Full application (single file)
```

---

## 🔑 Using the Groq API

LUMIQ uses Groq's OpenAI-compatible API with streaming:

```javascript
const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${YOUR_GROQ_API_KEY}`,
  },
  body: JSON.stringify({
    model: "llama3-70b-8192",
    messages: [...],
    stream: true,
    max_tokens: 1024,
  }),
});
```

The key is passed in at runtime via the setup screen — never hardcoded.

---

## 🏗️ Build for Production

```bash
npm run build
```

Output goes to `dist/` — deploy to Vercel, Netlify, or any static host.

---

## 🎨 Design System

| Token | Value | Usage |
|---|---|---|
| Navy | `#050914` | App background |
| Cyan | `#00D4FF` | Primary accent, data highlights |
| Gold | `#FFB627` | Narratives, warnings |
| Violet | `#7B4FE8` | AI features, prism side |
| Green | `#00E5A0` | Success, growth metrics |

Fonts: **Syne** (headings) + **DM Mono** (data/code) + **DM Sans** (body)

---

## 📜 License

MIT — built as a reimagination of the RATH open-source project.

---

*LUMIQ — Luminous Intelligence Queries*
