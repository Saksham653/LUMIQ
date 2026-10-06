import { Component } from "react";

// Catches a render crash in the subtree it wraps, so one broken
// screen never blanks the whole app. Shows a plain-words message, a
// "Copy details" button (error message + stack) and a way back.
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null, copied: false };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // Never swallowed silently — always visible in the console too.
    console.error("LUMIQ screen crashed:", error, info?.componentStack || "");
  }

  copyDetails = () => {
    const e = this.state.error;
    const text = `${e?.message || String(e)}\n\n${e?.stack || "(no stack)"}`;
    try {
      navigator.clipboard?.writeText(text);
      this.setState({ copied: true });
    } catch {
      // Clipboard unavailable — the details stay visible in the console.
    }
  };

  recover = () => {
    this.setState({ error: null, copied: false });
    this.props.onRecover?.();
  };

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div style={{ maxWidth: "520px", margin: "60px auto", padding: "28px", background: "#0a1128", border: "1px solid #FF3C3C44", borderRadius: "16px", textAlign: "center", color: "#e2e8f0", fontFamily: "'DM Sans', sans-serif" }}>
        <div style={{ fontSize: "36px", marginBottom: "12px" }}>⚠️</div>
        <h3 style={{ fontFamily: "'Syne', sans-serif", fontSize: "18px", marginBottom: "8px" }}>Something went wrong on this screen</h3>
        <p style={{ color: "#8892b0", fontSize: "13px", marginBottom: "20px", lineHeight: 1.6 }}>The rest of LUMIQ keeps working. Copy the details if you want to report this.</p>
        <div style={{ display: "flex", gap: "10px", justifyContent: "center", flexWrap: "wrap" }}>
          <button className="btn-ghost" onClick={this.copyDetails}>{this.state.copied ? "Copied ✓" : "Copy details"}</button>
          <button className="btn-primary" onClick={this.recover}>{this.props.actionLabel || "Go back to Overview"}</button>
        </div>
      </div>
    );
  }
}
