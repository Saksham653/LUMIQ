import { Fragment } from "react";
import { verifyNumbers } from "../ai/numberCheck.js";

// Renders AI text as React elements: **bold**, *italic* / _italic_,
// `inline code`, bullet and numbered lists, and simple pipe tables.
// Everything is built from text nodes — no HTML is ever created from
// strings, so markup inside the text shows as plain characters.
// When `candidates` is given, every number in plain text runs is
// checked against it (ai/numberCheck) and unmatched numbers keep the
// dashed "not verified" marker from Block 2, even inside bold or
// italic text.

const INLINE_RE = /(\*\*[^*\n]+\*\*|\*[^*\n]+\*|_[^_\n]+_|`[^`\n]+`)/g;
const BULLET_RE = /^\s*[-•]\s+|^\s*\*\s+/;
const NUMBERED_RE = /^\s*\d+[.)]\s+/;
const TABLE_ROW_RE = /^\s*\|.*\|\s*$/;
const TABLE_SEPARATOR_RE = /^:?-{2,}:?$/;

function MarkedText({ text, candidates }) {
  if (!candidates || !candidates.length) return text;
  const { segments } = verifyNumbers(text, candidates);
  return segments.map((s, i) =>
    s.number !== undefined && !s.verified ? (
      <span key={i} title="Not verified — this number does not match the calculation" style={{ color: "#FFB627", borderBottom: "1px dashed #FFB627" }}>{s.text}<sup style={{ fontSize: "9px" }}>?</sup></span>
    ) : (
      <Fragment key={i}>{s.text}</Fragment>
    )
  );
}

function Inline({ text, candidates }) {
  return text.split(INLINE_RE).map((part, i) => {
    if (!part) return null;
    if (part.length > 4 && part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i}><MarkedText text={part.slice(2, -2)} candidates={candidates} /></strong>;
    }
    if (part.length > 2 && part.startsWith("`") && part.endsWith("`")) {
      return <code key={i} style={{ fontFamily: "'DM Mono', monospace", background: "#050914", border: "1px solid #1e2d5c", borderRadius: "4px", padding: "0 4px", fontSize: "0.9em" }}>{part.slice(1, -1)}</code>;
    }
    if (part.length > 2 && ((part.startsWith("*") && part.endsWith("*")) || (part.startsWith("_") && part.endsWith("_")))) {
      return <em key={i}><MarkedText text={part.slice(1, -1)} candidates={candidates} /></em>;
    }
    return <MarkedText key={i} text={part} candidates={candidates} />;
  });
}

function TableBlock({ rows, candidates }) {
  const cells = rows.map((line) => line.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => c.trim()));
  const hasHeader = cells.length > 1 && cells[1].every((c) => TABLE_SEPARATOR_RE.test(c));
  const header = hasHeader ? cells[0] : null;
  const body = hasHeader ? cells.slice(2) : cells;
  const cellStyle = { padding: "4px 10px", borderBottom: "1px solid #1e2d5c33", textAlign: "left" };
  return (
    <div style={{ overflowX: "auto", margin: "6px 0" }}>
      <table style={{ borderCollapse: "collapse", fontSize: "0.95em", border: "1px solid #1e2d5c", borderRadius: "6px" }}>
        {header && (
          <thead>
            <tr>{header.map((c, i) => <th key={i} style={{ ...cellStyle, color: "#8892b0", fontFamily: "'DM Mono', monospace", fontSize: "0.85em", textTransform: "uppercase", borderBottom: "1px solid #1e2d5c" }}>{c}</th>)}</tr>
          </thead>
        )}
        <tbody>
          {body.map((row, r) => (
            <tr key={r}>{row.map((c, i) => <td key={i} style={cellStyle}><Inline text={c} candidates={candidates} /></td>)}</tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function RichText({ text, candidates }) {
  const lines = String(text ?? "").split(/\r?\n/);
  const blocks = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (/^\s*$/.test(line)) {
      blocks.push({ type: "gap" });
      i++;
    } else if (TABLE_ROW_RE.test(line)) {
      const rows = [];
      while (i < lines.length && TABLE_ROW_RE.test(lines[i])) { rows.push(lines[i]); i++; }
      blocks.push({ type: "table", rows });
    } else if (BULLET_RE.test(line)) {
      const items = [];
      while (i < lines.length && BULLET_RE.test(lines[i])) { items.push(lines[i].replace(BULLET_RE, "")); i++; }
      blocks.push({ type: "ul", items });
    } else if (NUMBERED_RE.test(line)) {
      const items = [];
      while (i < lines.length && NUMBERED_RE.test(lines[i])) { items.push(lines[i].replace(NUMBERED_RE, "")); i++; }
      blocks.push({ type: "ol", items });
    } else {
      blocks.push({ type: "p", text: line });
      i++;
    }
  }

  return blocks.map((b, k) => {
    if (b.type === "gap") return <div key={k} style={{ height: "0.55em" }} />;
    if (b.type === "table") return <TableBlock key={k} rows={b.rows} candidates={candidates} />;
    if (b.type === "ul" || b.type === "ol") {
      const List = b.type === "ul" ? "ul" : "ol";
      return (
        <List key={k} style={{ margin: "4px 0", paddingLeft: "20px" }}>
          {b.items.map((item, j) => <li key={j} style={{ marginBottom: "2px" }}><Inline text={item} candidates={candidates} /></li>)}
        </List>
      );
    }
    return <div key={k}><Inline text={b.text} candidates={candidates} /></div>;
  });
}
