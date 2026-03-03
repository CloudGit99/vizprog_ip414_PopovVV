import { readFile, writeFile } from "node:fs/promises";

function parseCell(value: string): string | number {
  const v = value.trim();
  if (/^-?\d+(\.\d+)?$/.test(v)) return Number(v);
  return v;
}

export function csvToJSON(input: string[], delimiter: string): object[] {
  if (!Array.isArray(input) || input.length === 0) {
    throw new Error("Input must contain at least header row");
  }
  if (typeof delimiter !== "string" || delimiter.length === 0) {
    throw new Error("Delimiter must be a non-empty string");
  }

  const headerLine = input[0];
  const headers = headerLine.split(delimiter).map(h => h.trim());

  if (headers.length === 0 || headers.some(h => h.length === 0)) {
    throw new Error("Header must contain column names");
  }

  const result: object[] = [];

  for (let i = 1; i < input.length; i++) {
    const row = input[i];
    if (row.trim().length === 0) continue;

    const cells = row.split(delimiter);

    if (cells.length !== headers.length) {
      throw new Error(
        `Row ${i} has ${cells.length} values but header has ${headers.length}`
      );
    }

    const obj: Record<string, string | number> = {};
    for (let c = 0; c < headers.length; c++) {
      obj[headers[c]] = parseCell(cells[c]);
    }
    result.push(obj);
  }

  return result;
}

export async function formatCSVFileToJSONFile(
  input: string,
  output: string,
  delimiter: string
): Promise<void> {
  const raw = await readFile(input, { encoding: "utf-8" });

  const lines = raw
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n");

  const data = csvToJSON(lines.filter(l => l.length > 0), delimiter);

  const json = JSON.stringify(data, null, 2);
  await writeFile(output, json, { encoding: "utf-8" });
}