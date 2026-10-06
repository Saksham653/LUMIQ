// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { svgToDataUrl, exportSvgToPng } from "./exportChart.js";

function makeSvg() {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 120 100");
  const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  rect.setAttribute("width", "10");
  svg.appendChild(rect);
  return svg;
}

describe("chart PNG export (F17)", () => {
  let origGetContext, origToBlob, drawn;

  beforeEach(() => {
    drawn = { size: null, drewImage: false };
    // jsdom has no canvas rasterizer or image loader — stub both so
    // the export pipeline (serialize → load → draw → blob) is exercised.
    vi.stubGlobal(
      "Image",
      class {
        set src(v) {
          this._src = v;
          queueMicrotask(() => this.onload?.());
        }
        get src() {
          return this._src;
        }
      }
    );
    origGetContext = HTMLCanvasElement.prototype.getContext;
    origToBlob = HTMLCanvasElement.prototype.toBlob;
    HTMLCanvasElement.prototype.getContext = function () {
      return {
        fillStyle: "",
        fillRect: () => {},
        drawImage: () => {
          drawn.drewImage = true;
        },
      };
    };
    HTMLCanvasElement.prototype.toBlob = function (cb, type) {
      drawn.size = { width: this.width, height: this.height };
      cb(new Blob(["fake-png-bytes"], { type }));
    };
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    HTMLCanvasElement.prototype.getContext = origGetContext;
    HTMLCanvasElement.prototype.toBlob = origToBlob;
  });

  it("svgToDataUrl serializes the SVG element as a data URL", () => {
    const url = svgToDataUrl(makeSvg());
    expect(url.startsWith("data:image/svg+xml")).toBe(true);
    expect(decodeURIComponent(url)).toContain("viewBox=\"0 0 120 100\"");
  });

  it("exportSvgToPng returns an image blob at the viewBox aspect ratio", async () => {
    const blob = await exportSvgToPng(makeSvg(), { width: 1200 });
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe("image/png");
    expect(blob.size).toBeGreaterThan(0);
    expect(drawn.drewImage).toBe(true);
    // 1200 wide at a 120x100 viewBox → 1000 tall
    expect(drawn.size).toEqual({ width: 1200, height: 1000 });
  });

  it("rejects instead of hanging when the image cannot load", async () => {
    vi.stubGlobal(
      "Image",
      class {
        set src(v) {
          queueMicrotask(() => this.onerror?.());
        }
      }
    );
    await expect(exportSvgToPng(makeSvg())).rejects.toThrow(/could not be rendered/);
  });
});
