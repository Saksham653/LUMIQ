// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import React from "react";
import DataTable from "./DataTable.jsx";

afterEach(cleanup);

const COUNT = 1000;
const ROW_HEIGHT = 33;
const ds = {
  name: "big",
  columns: ["idx", "value"],
  data: Array.from({ length: COUNT }, (_, i) => ({ idx: i, value: i * 10 })),
  columnTypes: { idx: { type: "number" }, value: { type: "number" } },
};

const renderTable = () =>
  render(
    <DataTable
      ds={ds}
      processedData={ds.data}
      sortConfig={null}
      handleSort={() => {}}
      searchQuery=""
      setSearchQuery={() => {}}
    />
  );

describe("windowed data table (F13)", () => {
  it("renders only the rows near the viewport, not all 1,000", () => {
    renderTable();
    const dataRows = document.querySelectorAll("tbody tr:not([aria-hidden])");
    expect(dataRows.length).toBeLessThan(60);
    expect(screen.getByText(/Showing 1,000 of 1,000 rows/)).toBeTruthy();
  });

  it("keeps the scrollbar honest with a spacer worth the hidden rows", () => {
    renderTable();
    const spacers = document.querySelectorAll('tbody tr[aria-hidden="true"]');
    expect(spacers.length).toBe(1); // nothing above at scrollTop 0, one below
    const totalSpacerPx = [...spacers].reduce((s, el) => s + parseInt(el.style.height, 10), 0);
    const dataRows = document.querySelectorAll("tbody tr:not([aria-hidden])");
    expect(totalSpacerPx + dataRows.length * ROW_HEIGHT).toBe(COUNT * ROW_HEIGHT);
  });

  it("scrolling swaps in the rows at that position", () => {
    renderTable();
    expect(screen.queryByText("500")).toBeNull(); // row 500 not in the DOM yet
    const scroller = screen.getByTestId("windowed-scroll");
    fireEvent.scroll(scroller, { target: { scrollTop: 500 * ROW_HEIGHT } });
    expect(screen.getByText("500")).toBeTruthy(); // idx cell of row 500
    expect(screen.queryByText(/^0$/)).toBeNull(); // first row left the DOM
    const dataRows = document.querySelectorAll("tbody tr:not([aria-hidden])");
    expect(dataRows.length).toBeLessThan(60);
  });
});
