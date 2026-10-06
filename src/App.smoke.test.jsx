// @vitest-environment jsdom
//
// Safety net for the Block 4 split: renders the REAL app through the
// real entry points (no internals), one smoke test per screen in
// no-key demo mode with the Sales sample. These must stay green
// before, during and after every file move.

import { describe, it, expect, afterEach, beforeAll } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import React from "react";
import App from "./App.jsx";

beforeAll(() => {
  // jsdom has no scrollIntoView (the chat auto-scroll uses it)
  Element.prototype.scrollIntoView = () => {};
});
afterEach(() => {
  cleanup();
  try { localStorage.clear(); } catch { }
});

const enterDemo = () => {
  render(<App />);
  fireEvent.click(screen.getByText("Try the demo"));
};

// Sidebar and top tabs share labels; the first match is the sidebar.
const goTab = (label) => fireEvent.click(screen.getAllByText(label)[0]);

describe("screen smoke tests (no key, Sales sample)", () => {
  it("landing page renders with the demo path", () => {
    render(<App />);
    expect(screen.getByText("Try the demo")).toBeTruthy();
    expect(screen.getByText("Launch LUMIQ")).toBeTruthy();
    expect(screen.getByText(/talks back/)).toBeTruthy();
  });

  it("key setup screen renders with the remember checkbox", () => {
    render(<App />);
    fireEvent.click(screen.getByText("Launch LUMIQ"));
    expect(screen.getByPlaceholderText("Paste your Groq API key")).toBeTruthy();
    expect(screen.getByText("Remember on this device")).toBeTruthy();
    expect(screen.getByText("Continue in Demo Mode")).toBeTruthy();
  });

  it("Overview shows the Sales numbers and a true insight", () => {
    enterDemo();
    expect(screen.getByText("Total · revenue")).toBeTruthy();
    expect(screen.getByText("4.7M")).toBeTruthy(); // 4,677,000 summed in the browser
    expect(screen.getByText("Auto Insights")).toBeTruthy();
    expect(screen.getByText(/Electronics leads revenue/)).toBeTruthy();
  });

  it("Ask shows data-driven chips, the hint line and an honest demo reply", async () => {
    enterDemo();
    goTab("Ask");
    expect(screen.getByText(/You can ask follow-ups like/)).toBeTruthy();
    expect(screen.getByText("New topic")).toBeTruthy();
    expect(screen.getByText("Which month has the highest revenue?")).toBeTruthy();
    const input = screen.getByPlaceholderText("Ask Oracle anything about your data...");
    fireEvent.change(input, { target: { value: "total revenue" } });
    fireEvent.click(screen.getByText("→"));
    expect(await screen.findByText(/then I plan the calculation/)).toBeTruthy();
  });

  it("Report is key-gated with the add-key line", () => {
    enterDemo();
    goTab("Report");
    const btn = screen.getByText("Generate Decision Brief").closest("button");
    expect(btn.disabled).toBe(true);
    expect(screen.getAllByText(/Add a free Groq key/).length).toBeGreaterThan(0);
  });

  it("What-if is a working calculator with no key", () => {
    enterDemo();
    goTab("What-if");
    expect(screen.getByText(/A calculator, not a guess/)).toBeTruthy();
    fireEvent.click(screen.getByText("Apply change"));
    // +10% revenue across all rows: 4,677,000 → 5,144,700
    // (grouping follows the machine locale)
    expect(screen.getByText("Total")).toBeTruthy();
    expect(screen.getByText((5144700).toLocaleString())).toBeTruthy();
    expect(screen.getByText(`+${(467700).toLocaleString()}`)).toBeTruthy();
  });

  it("Data health shows the score, column cards and local matrix without a key", async () => {
    enterDemo();
    goTab("Data health");
    // the honest score: Sales loses 2 points to a real robust outlier
    expect(screen.getByText("98")).toBeTruthy();
    expect(screen.getByText(/1 unusual value in avg_order_value/)).toBeTruthy();
    expect(screen.getAllByText("Completeness")).toHaveLength(8); // merged column cards
    fireEvent.click(screen.getByText("Run Deep Dive"));
    expect(await screen.findByText("Correlation Matrix")).toBeTruthy();
    expect(screen.getByText("Anomaly Detection")).toBeTruthy();
    expect(screen.getAllByText(/Add a free Groq key/).length).toBeGreaterThan(0);
    // Column details is gone as a separate screen
    expect(screen.queryByText("Column details")).toBeNull();
  });

  it("Files shows the upload zone and samples", () => {
    enterDemo();
    goTab("Files");
    expect(screen.getByText("Drop your CSV here")).toBeTruthy();
    expect(screen.getByText("Sample Datasets")).toBeTruthy();
  });
});

describe("dataset switching", () => {
  it("switching to Marketing changes the tiles", () => {
    enterDemo();
    expect(screen.getByText("4.7M")).toBeTruthy();
    fireEvent.click(screen.getAllByText("Marketing Campaign")[0]);
    expect(screen.getByText("Total · spend")).toBeTruthy();
    expect(screen.getByText("216K")).toBeTruthy(); // 2,16,000 total spend
    expect(screen.queryByText("4.7M")).toBeNull();
    expect(screen.queryByText("Total · revenue")).toBeNull();
  });
});
