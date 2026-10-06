import { useState, useRef } from "react";
import { SAMPLE_DATASETS } from "../data/sampleDatasets.js";
import { uniqueDatasetName } from "../data/dataset.js";
import { buildPreviewFromGrid } from "../data/uploadPreview.js";
import { isExcelFile, readExcelWorkbook, excelSheetToGrid } from "../data/excel.js";
import { buildPreviewAsync, datasetFromPreviewAsync, dropPreviewAsync, cancelAllWork } from "../worker/workerClient.js";
import UploadPreview from "../components/UploadPreview.jsx";

export default function FilesScreen({ activeDataset, setActiveDataset, setActiveTab, uploadedDatasets, addUploadedDataset, deleteEverything, uploadError, setUploadError, fileInputRef }) {
  const [preview, setPreview] = useState(null);
  const [previewTypes, setPreviewTypes] = useState(null);
  const [parsing, setParsing] = useState(null); // { stage, rows, pct }
  const [sheetPick, setSheetPick] = useState(null); // { book, baseName }
  const parseToken = useRef(null);

  const showPreview = (p) => {
    setParsing(null);
    setPreview(p);
    setPreviewTypes(p.types);
  };

  // One Excel sheet → the same preview a CSV gets. SheetJS itself
  // (pinned from cdn.sheetjs.com) loads inside excel.js via dynamic
  // import(), only when an Excel file is actually chosen (B7-2).
  const pickSheet = async (book, sheetName, baseName) => {
    setSheetPick(null);
    setParsing({ stage: `Reading sheet "${sheetName}"`, rows: 0, pct: 50 });
    try {
      const grid = await excelSheetToGrid(book, sheetName);
      showPreview(buildPreviewFromGrid(grid.columns, grid.rows, book.sheetNames.length > 1 ? `${baseName} — ${sheetName}` : baseName));
    } catch (err) {
      setParsing(null);
      setUploadError(err?.message || "Could not read this sheet.");
    }
  };

  // Reads a chosen or dropped file into the preview — nothing is
  // loaded until the user confirms. CSV parsing and type detection
  // run in the data worker (F13), with live row-count progress.
  const handleFile = (file) => {
    if (!file) return;
    setUploadError("");
    const isExcel = isExcelFile(file.name);
    if (!isExcel && !/\.csv$/i.test(file.name)) { setUploadError("Please upload a CSV or Excel (.xlsx / .xls) file."); return; }
    const reader = new FileReader();
    reader.onload = async (ev) => {
      if (isExcel) {
        setParsing({ stage: "Reading Excel file", rows: 0, pct: 30 });
        try {
          const book = await readExcelWorkbook(ev.target.result);
          const baseName = file.name.replace(/\.(xlsx|xls)$/i, "");
          if (book.sheetNames.length > 1) {
            setParsing(null);
            setSheetPick({ book, baseName });
          } else {
            await pickSheet(book, book.sheetNames[0], baseName);
          }
        } catch (err) {
          setParsing(null);
          setUploadError(err?.message || "Could not read this Excel file.");
        }
        return;
      }
      const token = crypto.randomUUID();
      parseToken.current = token;
      setParsing({ stage: "Reading rows", rows: 0, pct: 0 });
      try {
        const p = await buildPreviewAsync(ev.target.result, file.name.replace(/\.csv$/i, ""), token, (m) => {
          if (parseToken.current !== token) return;
          setParsing({ stage: m.stage === "typing" ? "Detecting column types" : "Reading rows", rows: m.rows, pct: m.pct });
        });
        if (parseToken.current !== token) return; // cancelled meanwhile
        showPreview(p);
      } catch (err) {
        if (parseToken.current !== token || err?.cancelled) return;
        setParsing(null);
        setUploadError(err?.message || "Could not parse CSV. Please check the format.");
      }
    };
    if (isExcel) reader.readAsArrayBuffer(file);
    else reader.readAsText(file);
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

  // A real button (B7-3): keyboard-reachable, announced as one.
  const datasetCard = (d) => (
    <button key={d.id} type="button" className={`glass-card`} style={{ padding: "20px", cursor: "pointer", transition: "all 0.2s", textAlign: "left", color: "inherit", font: "inherit", background: "transparent", borderColor: activeDataset?.id === d.id ? "#00D4FF44" : "#1e2d5c" }} onClick={() => { setActiveDataset(d); setActiveTab("canvas"); }}>
      <span aria-hidden="true" style={{ display: "block", fontSize: "28px", marginBottom: "10px" }}>{d.icon}</span>
      <span style={{ display: "block", fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: "14px", marginBottom: "6px" }}>{d.name}</span>
      <span style={{ display: "block", color: "#8892b0", fontSize: "12px", marginBottom: "12px" }}>{d.description}</span>
      <span style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>{d.columns.slice(0, 3).map((c) => <span key={c} className="data-pill" style={{ fontSize: "12px" }}>{c}</span>)}</span>
      {activeDataset?.id === d.id && <span style={{ display: "block", marginTop: "10px" }}><span className="badge badge-cyan">Active</span></span>}
    </button>
  );

  return (
    <div style={{ maxWidth: "780px", margin: "0 auto", animation: "fadeSlide 0.3s ease" }}>
      <div style={{ marginBottom: "24px" }}>
        <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: "20px", fontWeight: 800, marginBottom: "8px" }}>Files</h2>
        <p style={{ color: "#8892b0", fontSize: "13px" }}>Upload a CSV or Excel file, or choose from sample datasets. Your files and chats stay on this device.</p>
      </div>
      {sheetPick && (
        <div className="glass-card" style={{ padding: "20px", marginBottom: "24px" }}>
          <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: "14px", marginBottom: "6px" }}>This file has {sheetPick.book.sheetNames.length} sheets</div>
          <p style={{ color: "#8892b0", fontSize: "12px", marginBottom: "12px" }}>Pick the one to load:</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
            {sheetPick.book.sheetNames.map((s) => (
              <button key={s} className="btn-ghost" style={{ fontSize: "12px", padding: "8px 14px" }} onClick={() => pickSheet(sheetPick.book, s, sheetPick.baseName)}>
                📄 {s}
              </button>
            ))}
            <button className="btn-ghost" style={{ fontSize: "12px", padding: "8px 14px", borderColor: "#FF3C3C44", color: "#FF8888" }} onClick={() => { setSheetPick(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}>
              Cancel
            </button>
          </div>
        </div>
      )}
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
      <input type="file" ref={fileInputRef} accept=".csv,.xlsx,.xls" style={{ display: "none" }} onChange={(e) => handleFile(e.target.files[0])} aria-label="Choose a CSV or Excel file" />
      <button
        type="button"
        className="upload-zone"
        style={{ display: "block", width: "100%", marginBottom: "8px", background: "transparent", color: "inherit", font: "inherit" }}
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); handleFile(e.dataTransfer?.files?.[0]); }}
      >
        <span aria-hidden="true" style={{ display: "block", fontSize: "36px", marginBottom: "12px" }}>📂</span>
        <span style={{ display: "block", fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: "16px", marginBottom: "8px" }}>Drop your CSV or Excel file here</span>
        <span style={{ display: "block", color: "#8892b0", fontSize: "13px" }}>or click to browse files</span>
      </button>
      <div role="alert" style={{ marginBottom: "16px" }}>
        {uploadError && <p style={{ color: "#FF8888", fontSize: "12px", margin: 0 }}>{uploadError}</p>}
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
        <p style={{ fontSize: "12px", color: "#8892b0", marginTop: "8px" }}>Removes saved datasets, Ask chats and the remembered API key from this browser.</p>
      </div>
    </div>
  );
}
