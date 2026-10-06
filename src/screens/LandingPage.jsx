import PrismLogo from "../components/PrismLogo.jsx";

const LandingPage = ({ setPage, startDemo }) => (
  <div className="landing-hero" style={{ minHeight: "100vh", position: "relative", overflow: "hidden" }}>
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
      {[...Array(20)].map((_, i) => (
        <div key={i} style={{ position: "absolute", width: `${Math.random() * 3 + 1}px`, height: `${Math.random() * 3 + 1}px`, background: i % 3 === 0 ? "#00D4FF" : i % 3 === 1 ? "#FFB627" : "#7B4FE8", borderRadius: "50%", left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%`, opacity: 0.4, animation: `beam ${2 + Math.random() * 3}s ${Math.random() * 2}s ease-in-out infinite` }} />
      ))}
    </div>
    <nav style={{ padding: "20px 60px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #1e2d5c22", position: "relative", zIndex: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <PrismLogo size={36} />
        <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: "22px", letterSpacing: "-0.5px" }}>LUM<span style={{ color: "#00D4FF" }}>IQ</span></span>
      </div>
      <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
        <span className="badge badge-cyan">BETA</span>
        <button className="btn-ghost" onClick={() => setPage("setup")}>Get Started →</button>
      </div>
    </nav>
    <div style={{ maxWidth: "900px", margin: "0 auto", padding: "80px 40px 60px", textAlign: "center", position: "relative", zIndex: 5 }}>
      <div className="prism-logo" style={{ margin: "0 auto 40px", display: "inline-block" }}><PrismLogo size={100} /></div>
      <div style={{ marginBottom: "16px" }}>
        <span className="badge badge-violet" style={{ fontSize: "12px" }}>⚡ Powered by Groq Ultra-Fast Inference · Llama 3 70B</span>
      </div>
      <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize: "clamp(48px, 7vw, 84px)", fontWeight: 800, lineHeight: 1.05, letterSpacing: "-3px", marginBottom: "24px" }}>
        Data that<br />
        <span style={{ background: "linear-gradient(135deg, #00D4FF 0%, #7B4FE8 50%, #FFB627 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>talks back</span>
      </h1>
      <p style={{ fontSize: "18px", color: "#8892b0", lineHeight: 1.7, maxWidth: "600px", margin: "0 auto 40px", fontWeight: 300 }}>
        LUMIQ transforms raw data into living narratives. Not just charts — <strong style={{ color: "#ccd6f6" }}>decision intelligence</strong>. Ask in plain English. Get answers you can check.
      </p>
      <div style={{ display: "flex", gap: "16px", justifyContent: "center", flexWrap: "wrap" }}>
        <button className="btn-primary" style={{ fontSize: "16px", padding: "14px 36px" }} onClick={() => setPage("setup")}>Launch LUMIQ</button>
        <button className="btn-ghost" style={{ padding: "14px 28px" }} onClick={startDemo}>Try the demo</button>
      </div>
    </div>
    <div style={{ display: "flex", justifyContent: "center", gap: "12px", flexWrap: "wrap", padding: "0 40px 40px" }}>
      {[{ icon: "⬡", label: "Overview" }, { icon: "🗣️", label: "Ask" }, { icon: "🔮", label: "Forecast" }, { icon: "💬", label: "AI Data Filter" }, { icon: "🧬", label: "Column details" }, { icon: "🔬", label: "Data health" }, { icon: "🌐", label: "What-if" }, { icon: "🗃️", label: "Files" }].map((f) => (
        <div key={f.label} className="data-pill" style={{ padding: "8px 16px", fontSize: "13px" }}><span>{f.icon}</span><span style={{ color: "#ccd6f6" }}>{f.label}</span></div>
      ))}
    </div>
    <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "40px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "20px" }}>
      {[
        { icon: "🔮", color: "#7B4FE8", badge: "badge-violet", title: "Forecast", tag: "Predictive AI", desc: "Linear regression trendlines project future values with confidence bands. Groq explains what the numbers predict in plain English." },
        { icon: "🧬", color: "#00E5A0", badge: "badge-green", title: "Column details", tag: "Column X-Ray", desc: "Deep statistical profile of every column — type detection, completeness, min/max/mean/median, distribution histograms, and data quality scores." },
        { icon: "💬", color: "#00D4FF", badge: "badge-cyan", title: "AI Data Filter", tag: "Natural Language", desc: "Query your data in plain English. LUMIQ translates your questions into precise filters and updates the entire dashboard instantly." },
        { icon: "🔬", color: "#FF6B6B", badge: "badge-cyan", title: "Data health", tag: "Deep Analysis", desc: "Correlation heatmaps, Z-score anomaly detection, and AI-powered executive summaries of your statistical findings." },
        { icon: "⚡", color: "#FFB627", badge: "badge-gold", title: "Ask", tag: "Groq-Powered", desc: "Ask questions about your data. Every number is calculated from all your rows, and every answer shows its working." },
        { icon: "🌐", color: "#7B4FE8", badge: "badge-violet", title: "What-if", tag: "What-If Engine", desc: "Describe a what-if and get a structured take grounded in your dataset summary — no invented probabilities." },
        { icon: "🗃️", color: "#00D4FF", badge: "badge-cyan", title: "Interactive Explorer", tag: "Data Grid", desc: "Searchable, sortable, paginated data grid for exploring every row of your dataset." },
        { icon: "📄", color: "#00E5A0", badge: "badge-green", title: "Report", tag: "Auto Reports", desc: "One-click AI-generated executive reports that summarize key metrics, trends, and anomalies from your dataset." },
      ].map((f) => (
        <div key={f.title} className="glass-card" style={{ padding: "28px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "14px" }}>
            <div className="feature-icon" style={{ background: `${f.color}15`, border: `1px solid ${f.color}33` }}>{f.icon}</div>
            <div>
              <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: "16px" }}>{f.title}</div>
              <span className={`badge ${f.badge}`}>{f.tag}</span>
            </div>
          </div>
          <p style={{ color: "#8892b0", fontSize: "13px", lineHeight: 1.7 }}>{f.desc}</p>
        </div>
      ))}
    </div>
    <div style={{ textAlign: "center", padding: "40px", borderTop: "1px solid #1e2d5c22" }}>
      <button className="btn-primary" style={{ fontSize: "15px", padding: "14px 40px" }} onClick={() => setPage("setup")}>Start Analyzing for Free →</button>
      <p style={{ marginTop: "12px", fontSize: "12px", color: "#8892b0" }}>Free Groq API key at console.groq.com · Llama 3 70B</p>
      <p style={{ marginTop: "24px", fontSize: "12px", color: "#8892b0" }}>
        &copy; {new Date().getFullYear()} Saksham Srivastava<br />
        Email: sakshamsrivastava7000@gmail.com
      </p>
    </div>
  </div>
);

export default LandingPage;
