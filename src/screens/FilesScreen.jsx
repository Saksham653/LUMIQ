import { useState } from "react";
import { SAMPLE_DATASETS } from "../data/sampleDatasets.js";
import { buildUploadPreview, datasetFromPreview } from "../data/uploadPreview.js";
import UploadPreview from "../components/UploadPreview.jsx";

export default function FilesScreen({ activeDataset, setActiveDataset, setActiveTab, uploadedData, setUploadedData, uploadError, setUploadError, fileInputRef }) {
  const [preview, setPreview] = useState(null);
  const [previewTypes, setPreviewTypes] = useState(null);

  // Reads a chosen or dropped file into the preview — nothing is
  // loaded until the user confirms.
  const handleFile = (file) => {
    if (!file) return;
    setUploadError("");
    if (!file.name.endsWith(".csv")) { setUploadError("Please upload a CSV file."); return; }
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        // papaparse-backed: quoted commas, CRLF and a BOM are fine,
        // and column types are decided from all rows (see src/data/)
        const p = buildUploadPreview(ev.target.result, file.name.replace(/\.csv$/i, ""));
        setPreview(p);
        setPreviewTypes(p.types);
      } catch (err) {
        setUploadError(err?.message || "Could not parse CSV. Please check the format.");
      }
    };
    reader.readAsText(file);
  };

  const cancelPreview = () => {
    setPreview(null);
    setPreviewTypes(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const loadPreview = () => {
    const dataset = datasetFromPreview(preview, previewTypes);
    setUploadedData(dataset);
    setActiveDataset(dataset);
    setActiveTab("canvas");
    cancelPreview();
  };

  return (
    <div style={{ maxWidth: "780px", margin: "0 auto", animation: "fadeSlide 0.3s ease" }}>
      <div style={{ marginBottom: "24px" }}>
        <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: "20px", fontWeight: 800, marginBottom: "8px" }}>Files</h2>
        <p style={{ color: "#8892b0", fontSize: "13px" }}>Upload your own CSV or choose from sample datasets</p>
      </div>
      {preview && (
        <UploadPreview preview={preview} types={previewTypes} setTypes={setPreviewTypes} onLoad={loadPreview} onCancel={cancelPreview} />
      )}
      <div
        className="upload-zone"
        style={{ marginBottom: "24px" }}
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); handleFile(e.dataTransfer?.files?.[0]); }}
      >
        <input type="file" ref={fileInputRef} accept=".csv" style={{ display: "none" }} onChange={(e) => handleFile(e.target.files[0])} />
        <div style={{ fontSize: "36px", marginBottom: "12px" }}>📂</div>
        <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: "16px", marginBottom: "8px" }}>Drop your CSV here</div>
        <p style={{ color: "#8892b0", fontSize: "13px" }}>or click to browse files</p>
        {uploadError && <p style={{ color: "#ff4444", fontSize: "12px", marginTop: "10px" }}>{uploadError}</p>}
        {uploadedData && <p style={{ color: "#00E5A0", fontSize: "12px", marginTop: "10px" }}>✓ Loaded: {uploadedData.name} ({uploadedData.data.length} rows)</p>}
      </div>
      <h3 style={{ fontFamily: "'Syne', sans-serif", fontSize: "14px", fontWeight: 700, marginBottom: "14px", color: "#8892b0", textTransform: "uppercase", letterSpacing: "0.5px" }}>Sample Datasets</h3>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "14px" }}>
        {Object.values(SAMPLE_DATASETS).map((d) => (
          <div key={d.name} className={`glass-card`} style={{ padding: "20px", cursor: "pointer", transition: "all 0.2s", borderColor: activeDataset?.name === d.name ? "#00D4FF44" : "#1e2d5c" }} onClick={() => { setActiveDataset(d); setActiveTab("canvas"); }}>
            <div style={{ fontSize: "28px", marginBottom: "10px" }}>{d.icon}</div>
            <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: "14px", marginBottom: "6px" }}>{d.name}</div>
            <p style={{ color: "#8892b0", fontSize: "12px", marginBottom: "12px" }}>{d.description}</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>{d.columns.slice(0, 3).map((c) => <span key={c} className="data-pill" style={{ fontSize: "10px" }}>{c}</span>)}</div>
            {activeDataset?.name === d.name && <div style={{ marginTop: "10px" }}><span className="badge badge-cyan">Active</span></div>}
          </div>
        ))}
      </div>
    </div>
  );
}
