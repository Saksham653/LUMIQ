// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import React from "react";
import RichText from "./RichText.jsx";

afterEach(cleanup);

describe("RichText (F18)", () => {
  it("renders bold, italic and inline code as elements", () => {
    const { container } = render(<RichText text={"This is **important**, *subtle*, _quiet_ and `code`."} />);
    expect(container.querySelector("strong").textContent).toBe("important");
    const ems = [...container.querySelectorAll("em")].map((e) => e.textContent);
    expect(ems).toEqual(["subtle", "quiet"]);
    expect(container.querySelector("code").textContent).toBe("code");
    // the raw markers are gone from the visible text
    expect(container.textContent).not.toContain("**");
    expect(container.textContent).not.toContain("`");
  });

  it("renders bullet and numbered lists", () => {
    const { container } = render(<RichText text={"Intro:\n- first\n- second\n• third\n1. one\n2) two"} />);
    expect(container.querySelectorAll("ul li")).toHaveLength(3);
    expect(container.querySelectorAll("ol li")).toHaveLength(2);
    expect(container.textContent).not.toContain("- first");
  });

  it("renders a simple pipe table with header and cells", () => {
    const text = "| region | total |\n|---|---|\n| South | 1,331,000 |\n| North | 935,000 |";
    const { container } = render(<RichText text={text} />);
    expect(container.querySelectorAll("table")).toHaveLength(1);
    expect(container.querySelectorAll("th")).toHaveLength(2);
    expect(container.querySelectorAll("td")).toHaveLength(4);
    expect(screen.getByText("South")).toBeTruthy();
    expect(container.textContent).not.toContain("---");
  });

  it("handles mixed formats in one answer", () => {
    const text = "**South** leads:\n- share: *28.46%*\n\n| a | b |\n|---|---|\n| 1 | `x` |";
    const { container } = render(<RichText text={text} />);
    expect(container.querySelector("strong")).toBeTruthy();
    expect(container.querySelector("em")).toBeTruthy();
    expect(container.querySelectorAll("ul li")).toHaveLength(1);
    expect(container.querySelectorAll("table td")).toHaveLength(2);
    expect(container.querySelector("code").textContent).toBe("x");
  });

  it("never creates HTML from strings — <script> shows as plain text", () => {
    const payload = "<script>alert(1)</script> and **<img src=x onerror=alert(2)>**";
    const { container } = render(<RichText text={payload} />);
    expect(container.querySelector("script")).toBeNull();
    expect(container.querySelector("img")).toBeNull();
    expect(container.textContent).toContain("<script>alert(1)</script>");
    expect(container.querySelector("strong").textContent).toBe("<img src=x onerror=alert(2)>");
  });

  it("keeps the not-verified markers inside formatted text", () => {
    const candidates = [1331000, 28.46];
    const { container } = render(
      <RichText text={"**South** made **1,331,000** (28.46%), about 999 units\n- exactly 1.33M here"} candidates={candidates} />
    );
    // verified numbers carry no marker, even inside bold
    const bolds = [...container.querySelectorAll("strong")].map((b) => b.textContent);
    expect(bolds).toContain("1,331,000");
    // the invented 999 is flagged with the dashed marker + ? sup
    const flagged = [...container.querySelectorAll("span[title]")];
    expect(flagged).toHaveLength(1);
    expect(flagged[0].textContent).toBe("999?");
    expect(flagged[0].getAttribute("title")).toContain("Not verified");
    // marker logic also runs inside list items (1.33M ≈ 1,331,000 → verified)
    expect(container.querySelectorAll("ul li")).toHaveLength(1);
  });

  it("no candidates means no markers at all", () => {
    const { container } = render(<RichText text={"totally 999 invented"} />);
    expect(container.querySelector("span[title]")).toBeNull();
  });
});
