import PrismLogo from "./PrismLogo.jsx";
import { SAMPLE_DATASETS } from "../data/sampleDatasets.js";

// The app sidebar: workspace links, datasets, settings. Moved
// verbatim from AppShell.
export default function Sidebar({ apiKey, setPage, activeTab, setActiveTab, activeDataset, setActiveDataset, uploadedDatasets, isMobileMenuOpen, setIsMobileMenuOpen }) {
  return (
    <aside className={`app-sidebar ${isMobileMenuOpen ? "open" : ""}`} style={{ width: "220px", background: "#050914", borderRight: "1px solid #1e2d5c", display: "flex", flexDirection: "column", padding: "16px 12px", flexShrink: 0, overflowY: "auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "28px", paddingLeft: "4px" }}>
        <PrismLogo size={28} />
        <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: "17px" }}>LUM<span style={{ color: "#00D4FF" }}>IQ</span></span>
      </div>
      <div style={{ marginBottom: "8px" }}>
        <div style={{ fontSize: "10px", fontFamily: "'DM Mono', monospace", color: "#3d4f7c", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "6px", paddingLeft: "4px" }}>Workspace</div>
        {[{ id: "canvas", icon: "⬡", label: "Overview" }, { id: "oracle", icon: "🔮", label: "Ask" }, { id: "narrative", icon: "📄", label: "Report" }, { id: "scenario", icon: "🌐", label: "What-if" }, { id: "ailab", icon: "🔬", label: "Data health" }, { id: "datadna", icon: "🧬", label: "Column details" }, { id: "data", icon: "🗃️", label: "Files" }].map((t) => (
          <div key={t.id} className={`sidebar-link ${activeTab === t.id ? "active" : ""} `} onClick={() => { setActiveTab(t.id); setIsMobileMenuOpen(false); }}>
            <span style={{ fontSize: "16px" }}>{t.icon}</span><span>{t.label}</span>
            {t.id === "oracle" && <span className="badge badge-violet" style={{ marginLeft: "auto", fontSize: "9px" }}>AI</span>}
            {t.id === "ailab" && <span className="badge badge-cyan" style={{ marginLeft: "auto", fontSize: "9px" }}>NEW</span>}
            {t.id === "datadna" && <span className="badge badge-green" style={{ marginLeft: "auto", fontSize: "9px" }}>NEW</span>}
          </div>
        ))}
      </div>
      <div style={{ marginTop: "16px" }}>
        <div style={{ fontSize: "10px", fontFamily: "'DM Mono', monospace", color: "#3d4f7c", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "6px", paddingLeft: "4px" }}>Datasets</div>
        {Object.values(SAMPLE_DATASETS).map((d) => (
          <div key={d.id} className={`sidebar-link ${activeDataset?.id === d.id ? "active" : ""}`} onClick={() => { setActiveDataset(d); setIsMobileMenuOpen(false); }} style={{ fontSize: "12px" }}>
            <span>{d.icon}</span><span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.name}</span>
          </div>
        ))}
        {(uploadedDatasets || []).map((d) => (
          <div key={d.id} className={`sidebar-link ${activeDataset?.id === d.id ? "active" : ""} `} onClick={() => { setActiveDataset(d); setIsMobileMenuOpen(false); }} style={{ fontSize: "12px" }}>
            <span>📁</span><span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.name}</span>
          </div>
        ))}
      </div>
      <div style={{ marginTop: "auto", paddingTop: "16px", borderTop: "1px solid #1e2d5c" }}>
        <div className="sidebar-link" onClick={() => setPage("setup")} style={{ fontSize: "12px" }}>⚙ API Settings</div>
        <div className="sidebar-link" onClick={() => setPage("landing")} style={{ fontSize: "12px" }}>← Landing Page</div>
        <div style={{ fontSize: "10px", paddingLeft: "4px", marginTop: "8px", marginBottom: "16px" }}>
          {apiKey && apiKey !== "demo" ? <span style={{ color: "#00E5A0" }}>● Groq connected</span> : <span style={{ color: "#FFB627" }}>● Demo mode</span>}
        </div>
        <div style={{ fontSize: "10px", paddingLeft: "4px", color: "#56689d", marginTop: "8px", lineHeight: 1.4 }}>
          &copy; {new Date().getFullYear()} Saksham Srivastava
          <br />
          Email: sakshamsrivastava7000@gmail.com
        </div>
      </div>
    </aside>
  );
}
