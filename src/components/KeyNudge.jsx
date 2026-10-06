// The one line shown wherever a feature needs a key (demo / no-key
// mode), with a button that opens the key screen.
export default function KeyNudge({ setPage }) {
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: "10px", flexWrap: "wrap", padding: "10px 14px", background: "#7B4FE81a", border: "1px solid #7B4FE833", borderRadius: "8px", fontSize: "12px", color: "#ccd6f6" }}>
      <span>Add a free Groq key to ask questions in your own words.</span>
      <button className="btn-ghost" style={{ fontSize: "11px", padding: "4px 12px" }} onClick={() => setPage("setup")}>Add key</button>
    </div>
  );
}
