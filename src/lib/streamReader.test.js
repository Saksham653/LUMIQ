import { describe, it, expect } from "vitest";
import { createStreamReader } from "./streamReader.js";

const sseEvent = (content) =>
  `data: ${JSON.stringify({ choices: [{ delta: { content } }] })}\n\n`;

const DELTAS = ["The ", "quick ", "brown ", "fox — ", "₹1,20,000 ", "😀 ", "done."];
const FULL_TEXT = DELTAS.join("");
const PAYLOAD = DELTAS.map(sseEvent).join("") + "data: [DONE]\n\n";

// Feeds the payload split into the given chunks and returns the
// reassembled text, exactly as callGroq consumes the parser.
function consume(chunks) {
  const reader = createStreamReader();
  let text = "";
  for (const chunk of chunks) {
    for (const delta of reader.push(chunk)) text += delta;
    if (reader.finished) break;
  }
  for (const delta of reader.flush()) text += delta;
  return text;
}

describe("createStreamReader (F5)", () => {
  it("reads the whole payload in one chunk", () => {
    expect(consume([PAYLOAD])).toBe(FULL_TEXT);
  });

  it("gives the same text for EVERY possible two-chunk split", () => {
    for (let i = 0; i <= PAYLOAD.length; i++) {
      const text = consume([PAYLOAD.slice(0, i), PAYLOAD.slice(i)]);
      expect(text, `split at ${i}`).toBe(FULL_TEXT);
    }
  });

  it("gives the same text for 500 random multi-chunk splits", () => {
    for (let trial = 0; trial < 500; trial++) {
      const chunks = [];
      let pos = 0;
      while (pos < PAYLOAD.length) {
        const size = 1 + Math.floor(Math.random() * 20);
        chunks.push(PAYLOAD.slice(pos, pos + size));
        pos += size;
      }
      expect(consume(chunks)).toBe(FULL_TEXT);
    }
  });

  it("handles one-character chunks (worst case)", () => {
    expect(consume(PAYLOAD.split(""))).toBe(FULL_TEXT);
  });

  it("handles CRLF line endings", () => {
    const crlf = PAYLOAD.replace(/\n/g, "\r\n");
    expect(consume([crlf])).toBe(FULL_TEXT);
    for (let i = 0; i <= crlf.length; i += 7) {
      expect(consume([crlf.slice(0, i), crlf.slice(i)])).toBe(FULL_TEXT);
    }
  });

  it("flush() recovers a final line with no trailing newline", () => {
    const noTrailing = DELTAS.map(sseEvent).join("") + `data: ${JSON.stringify({ choices: [{ delta: { content: "tail" } }] })}`;
    expect(consume([noTrailing])).toBe(FULL_TEXT + "tail");
  });

  it("stops at [DONE] and ignores anything after it", () => {
    const withTrailer = PAYLOAD + sseEvent("should never appear");
    expect(consume([withTrailer])).toBe(FULL_TEXT);
  });

  it("ignores comments, event lines and malformed JSON without losing the rest", () => {
    const messy =
      ": keep-alive comment\n" +
      "event: message\n" +
      sseEvent("a") +
      "data: {broken json\n" +
      sseEvent("b") +
      "data: [DONE]\n\n";
    expect(consume([messy])).toBe("ab");
  });

  it("treats missing delta content as empty, not as lost text", () => {
    const payload =
      sseEvent("x") +
      `data: ${JSON.stringify({ choices: [{ delta: {} }] })}\n\n` +
      sseEvent("y") +
      "data: [DONE]\n\n";
    expect(consume([payload])).toBe("xy");
  });
});
