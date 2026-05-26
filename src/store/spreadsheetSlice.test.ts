import { describe, expect, it } from "vitest";
import spreadsheetReducer, {
  loadSpreadsheet,
  redo,
  setCellValue,
  undo,
} from "./spreadsheetSlice";
import type { SpreadsheetDocument } from "../services/documentService";

const document: SpreadsheetDocument = {
  id: "doc-1",
  userId: "mock-user-1",
  title: "Test",
  createdAt: "2026-05-27T00:00:00.000Z",
  updatedAt: "2026-05-27T00:00:00.000Z",
  rowCount: 10,
  columnCount: 5,
  cells: {
    A1: "1",
  },
};

describe("spreadsheetSlice", () => {
  it("loads document data", () => {
    const state = spreadsheetReducer(undefined, loadSpreadsheet(document));

    expect(state.cells.A1).toBe("1");
    expect(state.rowCount).toBe(10);
    expect(state.columnCount).toBe(5);
    expect(state.hasUnsavedChanges).toBe(false);
  });

  it("updates cell and supports undo/redo", () => {
    const loadedState = spreadsheetReducer(undefined, loadSpreadsheet(document));
    const updatedState = spreadsheetReducer(
      loadedState,
      setCellValue({ cellId: "A1", value: "2" }),
    );
    const undoState = spreadsheetReducer(updatedState, undo());
    const redoState = spreadsheetReducer(undoState, redo());

    expect(updatedState.cells.A1).toBe("2");
    expect(updatedState.hasUnsavedChanges).toBe(true);
    expect(undoState.cells.A1).toBe("1");
    expect(redoState.cells.A1).toBe("2");
  });
});
