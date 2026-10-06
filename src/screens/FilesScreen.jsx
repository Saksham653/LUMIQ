import { useState, useRef } from "react";
import { SAMPLE_DATASETS } from "../data/sampleDatasets.js";
import { uniqueDatasetName } from "../data/dataset.js";
import { buildPreviewAsync, datasetFromPreviewAsync, dropPreviewAsync, cancelAllWork } from "../worker/workerClient.js";
import UploadPreview from "../components/UploadPreview.jsx";

export default function FilesScreen({ activeDataset, setActiveDataset, setActiveTab, uploadedDatasets, addUploadedDataset, deleteEverything, uploadError, setUploadError, fileInputRef }) {
  const [preview, setPreview] = useState(null);
  const [previewTypes, setPreviewTypes] = useState(null);
  const [parsing, setParsing] = useState(null); // { stage, rows, pct }
  const parseToken = useRef(null);

  // Reads a chosen or dropped file into the preview — nothing is
  // loaded until the user confirms. Parsing and type detection run
  // in the data worker (F13), with live row-count progress.
  const handleFile = (file) => {
    if (!file) return;
    setUploadError("");
    if (!/\.csv$/i.test(file.name)) { setUploadError("Please upload a CSV file."); return; }
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const token = crypto.randomUUID();
      parseToken.current = token;
      setParsing({ stage: "Reading rows", rows: 0, pct: 0 });
      try {
        const p = await buildPreviewAsync(ev.target.result, file.name.replace(/\.csv$/i, ""), token, (m) => {
          if (parseToken.current !== token) return;
          setParsing({ stage: m.stage === "typing" ? "Detecting column types" : "Reading rows", rows: m.rows, pct: m.pct });
        });
        if (parseToken.current !== token) return; // cancelled meanwhile
        setParsing(null);
        setPreview(p);
        setPreviewTypes(p.types);
      } catch (err) {
        if (parseToken.current !== token || err?.cancelled) return;
        setParsing(null);
        setUploadError(err?.message || "Could not parse CSV. Please check the format.");
      }
    };
    reader.readAsText(file);
  };

  const cancelParsing = () => {
    parseToken.current = null;
    cancelAllWork();
    setParsing(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const cancelPreview = () => {
    dropPreviewAsync(preview?.token);
    setPreview(null);
    setPreviewTypes(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const loadPreview = async () => {
    const dataset = await datasetFromPreviewAsync(preview, previewTypes);
    // Same display name twice? Show the newcomer as "name (2)" —
    // storage and history key on the id either way.
    const taken = [...(uploadedDatasets || []).map((d) => d.name), ...Object.values(SAMPLE_DATASETS).map((s) => s.name)];
    dataset.name = uniqueDatasetName(dataset.name, taken);
    addUploadedDataset(dataset);
    setActiveDataset(dataset);
    setActiveTab("canvas");
    setPreview(null);
    setPreviewTypes(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const confirmDeleteAll = () => {
    if (window.confirm("Delete everything stored on this device? This removes saved datasets, Ask chats and the remembered key from this browser.")) {
      deleteEverything();
    }
  };

  const datasetCard = (d) => (
    <div key={d.id} className={`glass-card`} style={{ padding: "20px", cursor: "pointer", transition: "all 0.2s", borderColor: activeDataset?.id === d.id ? "#00D4FF44" : "#1e2d5c" }} onClick={() => { setActiveDataset(d); setActiveTab("canvas"); }}>
      <div style={{ fontSize: "28px", marginBottom: "10px" }}>{d.icon}</div>
      <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: "14px", marginBottom: "6px" }}>{d.name}</div>
      <p style={{ color: "#8892b0", fontSize: "12px", marginBottom: "12px" }}>{d.description}</p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>{d.columns.slice(0, 3).map((c) => <span key={c} className="data-pill" style={{ fontSize: "10px" }}>{c}</span>)}</div>
      {activeDataset?.id === d.id && <div style={{ marginTop: "10px" }}><span className="badge badge-cyan">Active</span></div>}
    </div>
  );

  return (
    <div style={{ maxWidth: "780px", margin: "0 auto", animation: "fadeSlide 0.3s ease" }}>
      <div style={{ marginBottom: "24px" }}>
        <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: "20px", fontWeight: 800, marginBottom: "8px" }}>Files</h2>
        <p style={{ color: "#8892b0", fontSize: "13px" }}>Upload your own CSV or choose from sample datasets. Your files and chats stay on this device.</p>
      </div>
      {parsing && (
        <div className="glass-card" style={{ padding: "20px", marginBottom: "24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", gap: "10px" }}>
            <span style={{ fontSize: "13px", color: "#ccd6f6" }}>
              {parsing.stage}… <span style={{ fontFamily: "'DM Mono', monospace", color: "#00D4FF" }}>{parsing.rows.toLocaleString()}</span> rows
            </span>
            <button className="btn-ghost" style={{ fontSize: "12px", padding: "5px 12px" }} onClick={cancelParsing}>Cancel</button>
          </div>
          <div role="progressbar" aria-label="File loading progress" aria-valuenow={parsing.pct} aria-valuemin={0} aria-valuemax={100} style={{ height: "8px", background: "#1e2d5c", borderRadius: "4px", overflow: "hidden" }}>
            <div style={{ width: `${parsing.pct}%`, height: "100%", background: "#00D4FF", borderRadius: "4px", transition: "width 0.15s ease" }} />
          </div>
        </div>
      )}
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
      </div>
      {(uploadedDatasets || []).length > 0 && (
        <>
          <h3 style={{ fontFamily: "'Syne', sans-serif", fontSize: "14px", fontWeight: 700, marginBottom: "14px", color: "#8892b0", textTransform: "uppercase", letterSpacing: "0.5px" }}>Your Files</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "14px", marginBottom: "24px" }}>
            {uploadedDatasets.map(datasetCard)}
          </div>
        </>
      )}
      <h3 style={{ fontFamily: "'Syne', sans-serif", fontSize: "14px", fontWeight: 700, marginBottom: "14px", color: "#8892b0", textTransform: "uppercase", letterSpacing: "0.5px" }}>Sample Datasets</h3>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "14px" }}>
        {Object.values(SAMPLE_DATASETS).map(datasetCard)}
      </div>
      <div style={{ marginTop: "32px", paddingTop: "16px", borderTop: "1px solid #1e2d5c" }}>
        <button className="btn-ghost" style={{ borderColor: "#FF3C3C44", color: "#FF8888" }} onClick={confirmDeleteAll}>
          Delete everything stored on this device
        </button>
        <p style={{ fontSize: "11px", color: "#3d4f7c", marginTop: "8px" }}>Removes saved datasets, Ask chats and the remembered API key from this browser.</p>
      </div>
    </div>
  );
}
