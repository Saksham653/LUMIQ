// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import React, { useState } from "react";
import ErrorBoundary from "./ErrorBoundary.jsx";

afterEach(cleanup);
beforeEach(() => {
  // A forced crash legitimately logs; keep the test output readable.
  vi.spyOn(console, "error").mockImplementation(() => { });
});

function Bomb() {
  throw new Error("boom: forced crash for the test");
}

describe("ErrorBoundary (B4-4)", () => {
  it("renders children when nothing crashes", () => {
    render(
      <ErrorBoundary>
        <div>healthy content</div>
      </ErrorBoundary>
    );
    expect(screen.getByText("healthy content")).toBeTruthy();
    expect(screen.queryByText(/Something went wrong/)).toBeNull();
  });

  it("a forced crash shows the friendly screen, not a blank page", () => {
    render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>
    );
    expect(screen.getByText("Something went wrong on this screen")).toBeTruthy();
    expect(screen.getByText("Copy details")).toBeTruthy();
    expect(screen.getByText("Go back to Overview")).toBeTruthy();
  });

  it("Copy details puts the message and stack on the clipboard", () => {
    const writeText = vi.fn();
    Object.assign(navigator, { clipboard: { writeText } });
    render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>
    );
    fireEvent.click(screen.getByText("Copy details"));
    expect(writeText).toHaveBeenCalledTimes(1);
    const copied = writeText.mock.calls[0][0];
    expect(copied).toContain("boom: forced crash for the test");
    expect(copied.length).toBeGreaterThan(40); // message plus stack
    expect(screen.getByText("Copied ✓")).toBeTruthy();
  });

  it("Go back recovers and calls onRecover", () => {
    const onRecover = vi.fn();
    function Harness() {
      const [broken, setBroken] = useState(true);
      return (
        <ErrorBoundary onRecover={() => { setBroken(false); onRecover(); }}>
          {broken ? <Bomb /> : <div>recovered content</div>}
        </ErrorBoundary>
      );
    }
    render(<Harness />);
    fireEvent.click(screen.getByText("Go back to Overview"));
    expect(onRecover).toHaveBeenCalledTimes(1);
    expect(screen.getByText("recovered content")).toBeTruthy();
    expect(screen.queryByText(/Something went wrong/)).toBeNull();
  });

  it("a crash inside one boundary leaves siblings alive", () => {
    render(
      <div>
        <div>sidebar stays</div>
        <ErrorBoundary>
          <Bomb />
        </ErrorBoundary>
      </div>
    );
    expect(screen.getByText("sidebar stays")).toBeTruthy();
    expect(screen.getByText("Something went wrong on this screen")).toBeTruthy();
  });
});
