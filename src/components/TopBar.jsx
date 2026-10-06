// The sticky top bar: mobile menu button, tab buttons, dataset pill
// and the connect-key shortcut. Moved verbatim from AppShell.
export default function TopBar({ ds, apiKey, setPage, activeTab, setActiveTab, setIsMobileMenuOpen }) {
  return (
    <div style={{ background: "#050914ee", backdropFilter: "blur(10px)", borderBottom: "1px solid #1e2d5c", padding: "12px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 50 }}>
      <div style={{ display: "flex", alignItems: "center", gap: "12px", maxWidth: "70%" }}>
        <button className="mobile-menu-btn" onClick={() => setIsMobileMenuOpen(true)}>☰</button>
        <div style={{ display: "flex", gap: "4px" }} className="top-tabs">
          {[{ id: "canvas", label: "Overview" }, { id: "oracle", label: "Ask" }, { id: "narrative", label: "Report" }, { id: "scenario", label: "What-if" }, { id: "ailab", label: "Data health" }, { id: "datadna", label: "Column details" }, { id: "data", label: "Files" }].map((t) => (
            <button key={t.id} className={`tab-btn ${activeTab === t.id ? "active" : ""} `} onClick={() => setActiveTab(t.id)}>{t.label}</button>
          ))}
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        {ds && <div className="data-pill">{ds.icon} {ds.name} · {ds.data.length} rows</div>}
        {(!apiKey || apiKey === "demo") && <button className="btn-ghost" style={{ fontSize: "12px", padding: "6px 14px" }} onClick={() => setPage("setup")}>Connect Groq ⚡</button>}
      </div>
    </div>
  );
}
