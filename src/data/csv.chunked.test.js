import { describe, it, expect } from "vitest";
import { parseCsvText, parseCsvTextChunked } from "./csv.js";

const TRICKY =
  "﻿city,revenue,note\r\n" +
  '"Lucknow, UP",1200,ok\r\n' +
  "Delhi,,blank revenue\r\n" +
  "\r\n" +
  'Pune,900,"said ""hi"""\r\n';

describe("parseCsvTextChunked (F13)", () => {
  it("produces exactly what parseCsvText produces", () => {
    const whole = parseCsvText(TRICKY);
    const chunked = parseCsvTextChunked(TRICKY, () => {}, { chunkSize: 16 });
    expect(chunked.columns).toEqual(whole.columns);
    expect(chunked.rows).toEqual(whole.rows);
  });

  it("reports progress with growing row counts and a final full cursor", () => {
    const calls = [];
    parseCsvTextChunked(TRICKY, (rows, cursor, total) => calls.push({ rows, cursor, total }), { chunkSize: 16 });
    expect(calls.length).toBeGreaterThan(1); // small chunks → several reports
    for (let i = 1; i < calls.length; i++) {
      expect(calls[i].rows).toBeGreaterThanOrEqual(calls[i - 1].rows);
      expect(calls[i].cursor).toBeGreaterThanOrEqual(calls[i - 1].cursor);
    }
    const last = calls[calls.length - 1];
    expect(last.rows).toBe(3);
    expect(last.total).toBe(TRICKY.replace(/^﻿/, "").length);
  });

  it("matches on a larger generated file too", () => {
    const lines = ["region,amount"];
    for (let i = 0; i < 500; i++) lines.push(`R${i % 7},${i * 3}`);
    const text = lines.join("\n");
    const whole = parseCsvText(text);
    const chunked = parseCsvTextChunked(text, () => {}, { chunkSize: 256 });
    expect(chunked.rows).toEqual(whole.rows);
    expect(chunked.rows).toHaveLength(500);
  });
});
