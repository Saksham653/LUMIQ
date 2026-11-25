import { describe, it, expect } from "vitest";
import { parseCsvText, parseCsvTextChunked, parseCsvGrid, parseCsvGridAsync } from "./csv.js";

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

describe("parseCsvGridAsync (import on a phone)", () => {
  it("produces exactly what parseCsvGrid produces, with small and large chunks", async () => {
    const lines = ["region,amount,note"];
    for (let i = 0; i < 2000; i++) lines.push(`R${i % 7},${i * 3},"a\nb ${i}"`);
    const runs = [
      [TRICKY, 16],
      [TRICKY, 1 << 20],
      [lines.join("\n"), 4096],
      [lines.join("\r\n"), 4096],
      [lines.join("\n"), 1 << 20],
    ];
    for (const [text, chunkSize] of runs) {
      const chunked = await parseCsvGridAsync(text, { chunkSize });
      expect(chunked.grid).toEqual(parseCsvGrid(text).grid);
    }
  });

  it("reports progress and can be cancelled between chunks", async () => {
    const lines = ["a,b"];
    for (let i = 0; i < 3000; i++) lines.push(`${i},${i}`);
    const seen = [];
    let cancel = false;
    const run = parseCsvGridAsync(lines.join("\n"), {
      chunkSize: 512,
      onProgress: (rows) => {
        seen.push(rows);
        if (rows > 200) cancel = true;
      },
      isCancelled: () => cancel,
    });
    await expect(run).rejects.toMatchObject({ code: "cancelled" });
    expect(seen.length).toBeGreaterThan(1);
  });

  it("stops at once when a file has too many rows", async () => {
    const lines = ["a"];
    for (let i = 0; i < 500; i++) lines.push(String(i));
    await expect(parseCsvGridAsync(lines.join("\n"), { chunkSize: 256, maxRows: 100 })).rejects.toMatchObject({ code: "too-many-rows" });
    await expect(parseCsvGridAsync(lines.join("\n"), { chunkSize: 256, maxRows: 500 })).resolves.toMatchObject({ grid: expect.any(Array) });
  });

  it("an empty text gives an empty grid", async () => {
    expect((await parseCsvGridAsync("")).grid).toEqual([]);
    expect(parseCsvGrid("").grid).toEqual([]);
  });
});
