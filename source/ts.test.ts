import { describe, it, expect, vi } from "vitest";
import { beforeEach } from "vitest";

beforeEach(() => {
  vi.clearAllMocks();
});

vi.mock("node:fs/promises", () => {
  return {
    readFile: vi.fn(),
    writeFile: vi.fn(),
  };
});

import { csvToJSON, formatCSVFileToJSONFile } from "./ts";
import { readFile, writeFile } from "node:fs/promises";

describe("csvToJSON", () => {
  it("parses correct CSV input into array of objects (keeps column order)", () => {
    const res = csvToJSON(
      ["p1;p2;p3;p4", "1;A;b;c", "2;B;v;d"],
      ";"
    );

    expect(res).toEqual([
      { p1: 1, p2: "A", p3: "b", p4: "c" },
      { p1: 2, p2: "B", p3: "v", p4: "d" },
    ]);
  });

  it("throws error when input is empty", () => {
    expect(() => csvToJSON([], ";")).toThrowError();
  });

  it("throws error when delimiter is empty", () => {
    expect(() => csvToJSON(["a;b", "1;2"], "")).toThrowError();
  });

  it("throws error when a row has different number of columns than header", () => {
    expect(() =>
      csvToJSON(["a;b;c", "1;2"], ";")
    ).toThrowError();
  });

  it("trims header names and parses numeric cells", () => {
    const res = csvToJSON(["  id ; name ", " 10 ; John "], ";");
    expect(res).toEqual([{ id: 10, name: "John" }]);
  });
});

describe("formatCSVFileToJSONFile", () => {
  it("reads CSV, converts to JSON, writes JSON with correct args", async () => {
    const readMock = vi.mocked(readFile);
    const writeMock = vi.mocked(writeFile);

    readMock.mockResolvedValueOnce("p1;p2\n1;A\n2;B\n");

    await formatCSVFileToJSONFile("in.csv", "out.json", ";");

    expect(readMock).toHaveBeenCalledTimes(1);
    expect(readMock).toHaveBeenCalledWith("in.csv", { encoding: "utf-8" });

    expect(writeMock).toHaveBeenCalledTimes(1);

    const expectedObj = [
      { p1: 1, p2: "A" },
      { p1: 2, p2: "B" },
    ];
    const expectedJson = JSON.stringify(expectedObj, null, 2);

    expect(writeMock).toHaveBeenCalledWith(
      "out.json",
      expectedJson,
      { encoding: "utf-8" }
    );
  });

  it("propagates error if csv is invalid (writeFile should not be called)", async () => {
    const readMock = vi.mocked(readFile);
    const writeMock = vi.mocked(writeFile);

    readMock.mockResolvedValueOnce("a;b;c\n1;2\n");

    await expect(
      formatCSVFileToJSONFile("bad.csv", "out.json", ";")
    ).rejects.toThrowError();

    expect(writeMock).not.toHaveBeenCalled();
  });
});