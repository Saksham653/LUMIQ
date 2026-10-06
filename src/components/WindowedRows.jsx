import { useState } from "react";

// Our own tiny windowing (F13, no dependency): the scroll container
// tells the table which slice of rows is near the viewport, and
// spacer rows keep the scrollbar length honest. With 100,000 rows
// the DOM holds a few dozen <tr>s, never all of them.
export default function WindowedRows({ count, rowHeight, height, overscan = 8, renderTable }) {
  const [scrollTop, setScrollTop] = useState(0);
  const start = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan);
  const end = Math.min(count, Math.ceil((scrollTop + height) / rowHeight) + overscan);
  return (
    <div
      data-testid="windowed-scroll"
      style={{ height: `${height}px`, overflow: "auto" }}
      onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
    >
      {renderTable({
        start,
        end,
        topPad: start * rowHeight,
        bottomPad: Math.max(0, (count - end) * rowHeight),
      })}
    </div>
  );
}
