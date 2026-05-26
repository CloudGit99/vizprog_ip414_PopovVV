import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { documentService } from "../services/documentService";
import { markSpreadsheetSaved } from "./spreadsheetSlice";
import { setSaveStatus } from "./uiSlice";
import type {
  CreateDocumentData,
  SpreadsheetDocument,
} from "../services/documentService";

type DocumentsState = {
  items: SpreadsheetDocument[];
  activeDocumentId: string | null;
  loadingStatus: "idle" | "loading" | "error";
};

type DocumentsRootState = {
  auth: {
    user: {
      id: string;
    } | null;
  };
  documents: DocumentsState;
  spreadsheet: {
    cells: SpreadsheetDocument["cells"];
    cellStyles: SpreadsheetDocument["cellStyles"];
    rowCount: number;
    columnCount: number;
  };
};

const initialState: DocumentsState = {
  items: [],
  activeDocumentId: null,
  loadingStatus: "idle",
};

export const loadDocuments = createAsyncThunk(
  "documents/loadDocuments",
  async (_, { getState }) => {
    const state = getState() as DocumentsRootState;

    if (!state.auth.user) {
      return [];
    }

    return documentService.getDocuments(state.auth.user.id);
  },
);

export const createDocument = createAsyncThunk(
  "documents/createDocument",
  async (data: CreateDocumentData, { getState }) => {
    const state = getState() as DocumentsRootState;

    if (!state.auth.user) {
      throw new Error("Unauthorized");
    }

    return documentService.createDocument(state.auth.user.id, data);
  },
);

export const renameDocument = createAsyncThunk(
  "documents/renameDocument",
  async (data: { id: string; title: string }) => {
    return documentService.patchDocument(data.id, {
      title: data.title,
    });
  },
);

export const deleteDocument = createAsyncThunk(
  "documents/deleteDocument",
  async (id: string) => {
    await documentService.deleteDocument(id);

    return id;
  },
);

export const duplicateDocument = createAsyncThunk(
  "documents/duplicateDocument",
  async (id: string) => {
    return documentService.duplicateDocument(id);
  },
);

export const saveActiveDocument = createAsyncThunk(
  "documents/saveActiveDocument",
  async (_, { dispatch, getState }) => {
    const state = getState() as DocumentsRootState;
    const activeDocument = state.documents.items.find(
      (document) => document.id === state.documents.activeDocumentId,
    );

    if (!activeDocument) {
      return null;
    }

    dispatch(setSaveStatus("saving"));

    try {
      const savedDocument = await documentService.patchDocument(activeDocument.id, {
        title: activeDocument.title,
        rowCount: state.spreadsheet.rowCount,
        columnCount: state.spreadsheet.columnCount,
        cells: state.spreadsheet.cells,
        cellStyles: state.spreadsheet.cellStyles,
      });

      dispatch(markSpreadsheetSaved());
      dispatch(setSaveStatus("saved"));

      return savedDocument;
    } catch (error) {
      dispatch(setSaveStatus("error"));

      throw error;
    }
  },
);

const documentsSlice = createSlice({
  name: "documents",
  initialState,
  reducers: {
    setActiveDocumentId(state, action: { payload: string | null }) {
      state.activeDocumentId = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadDocuments.pending, (state) => {
        state.loadingStatus = "loading";
      })
      .addCase(loadDocuments.fulfilled, (state, action) => {
        state.items = action.payload;
        state.loadingStatus = "idle";
      })
      .addCase(loadDocuments.rejected, (state) => {
        state.loadingStatus = "error";
      })
      .addCase(createDocument.fulfilled, (state, action) => {
        state.items = [action.payload, ...state.items];
        state.activeDocumentId = action.payload.id;
      })
      .addCase(renameDocument.fulfilled, (state, action) => {
        state.items = state.items.map((document) =>
          document.id === action.payload.id ? action.payload : document,
        );
      })
      .addCase(deleteDocument.fulfilled, (state, action) => {
        state.items = state.items.filter(
          (document) => document.id !== action.payload,
        );

        if (state.activeDocumentId === action.payload) {
          state.activeDocumentId = null;
        }
      })
      .addCase(duplicateDocument.fulfilled, (state, action) => {
        state.items = [action.payload, ...state.items];
      })
      .addCase(saveActiveDocument.fulfilled, (state, action) => {
        const savedDocument = action.payload;

        if (!savedDocument) {
          return;
        }

        state.items = state.items.map((document) =>
          document.id === savedDocument.id ? savedDocument : document,
        );
      })
      .addCase(saveActiveDocument.rejected, () => {});
  },
});

export const { setActiveDocumentId } = documentsSlice.actions;

export default documentsSlice.reducer;
