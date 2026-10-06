// PNG export of an SVG chart (F17): serialize the SVG, draw it to a
// canvas, hand back a PNG blob. No HTML is created from strings —
// the SVG element is serialized as-is.

export function svgToDataUrl(svgEl) {
  const xml = new XMLSerializer().serializeToString(svgEl);
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(xml);
}

export function exportSvgToPng(svgEl, { width = 1600, background = "#070c1e" } = {}) {
  return new Promise((resolve, reject) => {
    try {
      const viewBox = (svgEl.getAttribute("viewBox") || "0 0 120 100").split(/\s+/).map(Number);
      const ratio = (viewBox[3] || 100) / (viewBox[2] || 120);
      const height = Math.round(width * ratio);
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx.fillStyle = background;
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);
          canvas.toBlob((blob) => {
            if (blob) resolve(blob);
            else reject(new Error("The browser could not create the PNG."));
          }, "image/png");
        } catch (e) {
          reject(e);
        }
      };
      img.onerror = () => reject(new Error("The chart image could not be rendered."));
      img.src = svgToDataUrl(svgEl);
    } catch (e) {
      reject(e);
    }
  });
}
