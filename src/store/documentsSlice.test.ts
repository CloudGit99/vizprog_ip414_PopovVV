import { describe, expect, it } from "vitest";
import documentsReducer, {
  deleteDocument,
  loadDocuments,
  setActiveDocumentId,
} from "./documentsSlice";
import type { SpreadsheetDocument } from "../services/documentService";

const document: SpreadsheetDocument = {
  id: "doc-1",
  userId: "mock-user-1",
  title: "Test",
  createdAt: "2026-05-27T00:00:00.000Z",
  updatedAt: "2026-05-27T00:00:00.000Z",
  rowCount: 10,
  columnCount: 5,
  cells: {},
};

describe("documentsSlice", () => {
  it("loads documents", () => {
    const state = documentsReducer(
      undefined,
      loadDocuments.fulfilled([document], "request-id"),
    );

    expect(state.items).toEqual([document]);
    expect(state.loadingStatus).toBe("idle");
  });

  it("sets and clears active document after delete", () => {
    const loadedState = documentsReducer(
      undefined,
      loadDocuments.fulfilled([document], "request-id"),
    );
    const activeState = documentsReducer(
      loadedState,
      setActiveDocumentId(document.id),
    );
    const deletedState = documentsReducer(
      activeState,
      deleteDocument.fulfilled(document.id, "request-id", document.id),
    );

    expect(activeState.activeDocumentId).toBe(document.id);
    expect(deletedState.items).toEqual([]);
    expect(deletedState.activeDocumentId).toBe(null);
  });
});
