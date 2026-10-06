// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import React from "react";
import FilesScreen from "./FilesScreen.jsx";
import { numericColumns } from "../data/dataset.js";

afterEach(cleanup);

const CSV = "name,amount\nA,10\nB,\nC,30\n";
const csvFile = () => new File([CSV], "mini.csv", { type: "text/csv" });

function setup() {
  const setActiveDataset = vi.fn();
  const setActiveTab = vi.fn();
  const setUploadedData = vi.fn();
  const setUploadError = vi.fn();
  render(
    <FilesScreen
      activeDataset={null}
      setActiveDataset={setActiveDataset}
      setActiveTab={setActiveTab}
      uploadedData={null}
      setUploadedData={setUploadedData}
      uploadError=""
      setUploadError={setUploadError}
      fileInputRef={{ current: null }}
    />
  );
  return { setActiveDataset, setActiveTab, setUploadedData };
}

describe("FilesScreen upload preview (B5-4)", () => {
  it("a chosen file shows the preview with counts, rows, warnings — nothing loads yet", async () => {
    const { setActiveDataset } = setup();
    const input = document.querySelector('input[type="file"]');
    fireEvent.change(input, { target: { files: [csvFile()] } });

    expect(await screen.findByText("mini")).toBeTruthy();
    expect(screen.getByText("3 rows · 2 columns")).toBeTruthy();
    expect(screen.getByText("⚠ 1 empty cell in amount")).toBeTruthy();
    expect(screen.getByText("Load")).toBeTruthy();
    expect(screen.getByText("Cancel")).toBeTruthy();
    expect(screen.getByText("A")).toBeTruthy(); // first rows visible
    expect(setActiveDataset).not.toHaveBeenCalled();
  });

  it("Load activates the dataset with the overridden type", async () => {
    const { setActiveDataset, setActiveTab } = setup();
    fireEvent.change(document.querySelector('input[type="file"]'), { target: { files: [csvFile()] } });
    await screen.findByText("Load");

    // override amount from number to text, then back via the dropdown
    const select = screen.getByLabelText("Type of amount");
    expect(select.value).toBe("number");
    fireEvent.change(select, { target: { value: "text" } });
    fireEvent.click(screen.getByText("Load"));

    expect(setActiveDataset).toHaveBeenCalledTimes(1);
    const ds = setActiveDataset.mock.calls[0][0];
    expect(ds.columnTypes.amount.type).toBe("text");
    expect(numericColumns(ds)).toEqual([]); // the tiles would have no numeric metric
    expect(setActiveTab).toHaveBeenCalledWith("canvas");
  });

  it("Cancel discards the preview without loading", async () => {
    const { setActiveDataset } = setup();
    fireEvent.change(document.querySelector('input[type="file"]'), { target: { files: [csvFile()] } });
    await screen.findByText("Cancel");
    fireEvent.click(screen.getByText("Cancel"));
    expect(screen.queryByText("Load")).toBeNull();
    expect(setActiveDataset).not.toHaveBeenCalled();
  });

  it("drag and drop reaches the same preview", async () => {
    setup();
    const zone = screen.getByText("Drop your CSV here").closest(".upload-zone");
    fireEvent.drop(zone, { dataTransfer: { files: [csvFile()] } });
    expect(await screen.findByText("3 rows · 2 columns")).toBeTruthy();
  });
});
