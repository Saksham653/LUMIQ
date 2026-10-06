import { useState } from "react";
import PrismLogo from "../components/PrismLogo.jsx";
import { writeStoredApiKey } from "../lib/apiKeyStorage.js";

const ApiKeySetup = ({ setPage, apiKeyInput, setApiKeyInput, setApiKey, startDemo }) => {
  const [rememberKey, setRememberKey] = useState(false);

  const launch = () => {
    const key = apiKeyInput.trim();
    if (!key) return;
    setApiKey(key);
    writeStoredApiKey(key, rememberKey);
    setPage("app");
  };

  return (
  <div style={{ maxWidth: "480px", margin: "0 auto", padding: "60px 20px" }}>
    <div style={{ textAlign: "center", marginBottom: "40px" }}>
      <div className="prism-logo" style={{ marginBottom: "20px", display: "inline-block" }}><PrismLogo size={64} /></div>
      <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: "28px", fontWeight: 800, marginBottom: "10px" }}>Connect <span style={{ color: "#00D4FF" }}>Oracle</span></h2>
      <p style={{ color: "#8892b0", fontSize: "14px", lineHeight: 1.6 }}>Enter your free Groq API key to power Oracle. Get one free at <span style={{ color: "#00D4FF" }}>console.groq.com</span></p>
    </div>
    <div className="glass-card" style={{ padding: "28px" }}>
      <label style={{ display: "block", fontSize: "12px", fontFamily: "'DM Mono', monospace", color: "#8892b0", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "1px" }}>Groq API Key</label>
      <input type="password" placeholder="Paste your Groq API key" value={apiKeyInput} onChange={(e) => setApiKeyInput(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") launch(); }}
        style={{ width: "100%", marginBottom: "12px" }} />
      <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", color: "#8892b0", marginBottom: "16px", cursor: "pointer" }}>
        <input type="checkbox" checked={rememberKey} onChange={(e) => setRememberKey(e.target.checked)} style={{ accentColor: "#00D4FF" }} />
        Remember on this device
      </label>
      <p style={{ fontSize: "12px", color: "#8892b0", marginBottom: "16px", lineHeight: 1.5 }}>
        Your key stays in this browser. Unticked, it is kept in memory for this session only; ticked, it is saved in this browser's local storage. Avoid ticking it on a shared computer.
      </p>
      <button className="btn-primary" style={{ width: "100%" }} onClick={launch} disabled={!apiKeyInput.trim()}>Launch LUMIQ →</button>
      <button className="btn-ghost" style={{ width: "100%", marginTop: "10px" }} onClick={() => { setApiKey("demo"); writeStoredApiKey("", false); startDemo(); }}>Continue in Demo Mode</button>
    </div>
    <div style={{ marginTop: "20px", display: "flex", gap: "8px", flexWrap: "wrap", justifyContent: "center" }}>
      {["Free tier", "Llama 3 70B", "Privacy-first"].map((t) => (<div key={t} className="data-pill">{t}</div>))}
    </div>
    <div style={{ marginTop: "16px", textAlign: "center" }}>
      <button onClick={() => setPage("landing")} style={{ background: "none", border: "none", color: "#8892b0", cursor: "pointer", fontSize: "12px" }}>← Back to home</button>
    </div>
  </div>
  );
};

export default ApiKeySetup;
