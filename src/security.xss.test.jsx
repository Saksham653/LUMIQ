// @vitest-environment jsdom
//
// B4-8: AI text and file content can never become page code. A CSV
// cell (or an AI answer) containing <script>alert(1)</script> must
// render as plain visible text — no script element, no alert.

import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import React from "react";
import DataTable from "./components/DataTable.jsx";
import AskScreen from "./screens/AskScreen.jsx";
import ShowTheWork from "./components/ShowTheWork.jsx";
import { buildDataset } from "./data/dataset.js";

afterEach(cleanup);

const PAYLOAD = "<script>alert(1)</script>";

const ds = buildDataset({
  name: "xss",
  icon: "",
  description: "",
  columns: ["note", "v"],
  rows: [
    { note: PAYLOAD, v: 10 },
    { note: "<img src=x onerror=alert(2)>", v: 20 },
  ],
});

describe("a malicious CSV cell renders as plain text", () => {
  it("in the data table", () => {
    const alertSpy = vi.fn();
    window.alert = alertSpy;
    const { container } = render(
      <DataTable
        ds={ds}
        processedData={ds.data}
        paginatedData={ds.data}
        sortConfig={null}
        handleSort={() => { }}
        searchQuery=""
        setSearchQuery={() => { }}
        pageIdx={0}
        setPageIdx={() => { }}
        totalPages={1}
        rowsPerPage={10}
      />
    );
    expect(screen.getByText(PAYLOAD)).toBeTruthy();
    expect(screen.getByText("<img src=x onerror=alert(2)>")).toBeTruthy();
    expect(container.querySelector("script")).toBeNull();
    expect(container.querySelector("img")).toBeNull();
    expect(alertSpy).not.toHaveBeenCalled();
  });
});

describe("a malicious Ask answer renders as plain text", () => {
  const stub = {
    ds,
    apiKey: "real-looking-key",
    setPage: () => { },
    oracleInput: "",
    setOracleInput: () => { },
    oracleLoading: false,
    sendOracleMessage: () => { },
    oracleAbortRef: { current: null },
    oracleLastFailed: null,
    chatEndRef: { current: null },
  };

  it("as plain content and inside verified segments", () => {
    const { container } = render(
      <AskScreen
        {...stub}
        oracleMessages={[
          { role: "user", content: "try xss" },
          { role: "assistant", content: PAYLOAD, streaming: false },
          {
            role: "assistant",
            content: `prefix ${PAYLOAD}`,
            streaming: false,
            segments: [{ text: "prefix " }, { text: PAYLOAD, number: 1, verified: false }],
            unverified: 1,
          },
        ]}
      />
    );
    expect(screen.getAllByText(new RegExp("alert\\(1\\)")).length).toBeGreaterThan(0);
    expect(container.querySelector("script")).toBeNull();
  });

  it("inside the Show-the-work proof table", () => {
    const { container } = render(
      <ShowTheWork
        proof={{
          steps: [`Kept rows where note is "${PAYLOAD}"`],
          table: [{ note: PAYLOAD, total: 10 }],
          rowsUsed: 1,
          totalRows: 2,
          sent: [{ label: "Plan request", text: `question about ${PAYLOAD}` }],
        }}
      />
    );
    expect(screen.getAllByText(new RegExp("alert\\(1\\)")).length).toBeGreaterThan(0);
    expect(container.querySelector("script")).toBeNull();
  });
});
