import { createSlice } from "@reduxjs/toolkit";
import type {
  CellData,
  CellStyle,
  CellStyles,
  SpreadsheetDocument,
} from "../services/documentService";

export type CellPosition = {
  row: number;
  column: string;
};

type SpreadsheetSnapshot = {
  cells: CellData;
  cellStyles: CellStyles;
  rowCount: number;
  columnCount: number;
};

type SpreadsheetState = SpreadsheetSnapshot & {
  selectedCell: CellPosition | null;
  rangeEnd: CellPosition | null;
  hasUnsavedChanges: boolean;
  past: SpreadsheetSnapshot[];
  future: SpreadsheetSnapshot[];
};

const initialSnapshot: SpreadsheetSnapshot = {
  cells: {},
  cellStyles: {},
  rowCount: 0,
  columnCount: 0,
};

const initialState: SpreadsheetState = {
  ...initialSnapshot,
  selectedCell: null,
  rangeEnd: null,
  hasUnsavedChanges: false,
  past: [],
  future: [],
};

function getColumnName(index: number): string {
  let columnName = "";
  let currentIndex = index;

  while (currentIndex >= 0) {
    columnName = String.fromCharCode((currentIndex % 26) + 65) + columnName;
    currentIndex = Math.floor(currentIndex / 26) - 1;
  }

  return columnName;
}

function getColumnIndex(columnName: string): number {
  let index = 0;

  for (let i = 0; i < columnName.length; i += 1) {
    index = index * 26 + (columnName.charCodeAt(i) - 64);
  }

  return index - 1;
}

function getCellId(column: string, row: number): string {
  return `${column}${row}`;
}

function parseCellId(cellId: string): CellPosition {
  const match = cellId.match(/^([A-Z]+)(\d+)$/);

  if (!match) {
    throw new Error(`Invalid cell id: ${cellId}`);
  }

  return {
    column: match[1],
    row: Number(match[2]),
  };
}

function takeSnapshot(state: SpreadsheetState): SpreadsheetSnapshot {
  return {
    cells: { ...state.cells },
    cellStyles: { ...state.cellStyles },
    rowCount: state.rowCount,
    columnCount: state.columnCount,
  };
}

function applySnapshot(state: SpreadsheetState, snapshot: SpreadsheetSnapshot) {
  state.cells = snapshot.cells;
  state.cellStyles = snapshot.cellStyles;
  state.rowCount = snapshot.rowCount;
  state.columnCount = snapshot.columnCount;
}

function pushHistory(state: SpreadsheetState) {
  state.past.push(takeSnapshot(state));
  state.future = [];
  state.hasUnsavedChanges = true;
}

const spreadsheetSlice = createSlice({
  name: "spreadsheet",
  initialState,
  reducers: {
    loadSpreadsheet(state, action: { payload: SpreadsheetDocument }) {
      state.cells = { ...action.payload.cells };
      state.cellStyles = { ...(action.payload.cellStyles ?? {}) };
      state.rowCount = action.payload.rowCount;
      state.columnCount = action.payload.columnCount;
      state.selectedCell = null;
      state.rangeEnd = null;
      state.hasUnsavedChanges = false;
      state.past = [];
      state.future = [];
    },
    clearSpreadsheet(state) {
      Object.assign(state, initialState);
    },
    setSelectedCell(state, action: { payload: CellPosition | null }) {
      state.selectedCell = action.payload;
      state.rangeEnd = null;
    },
    setRangeEnd(state, action: { payload: CellPosition | null }) {
      state.rangeEnd = action.payload;
    },
    setCellValue(
      state,
      action: { payload: { cellId: string; value: string } },
    ) {
      pushHistory(state);
      state.cells[action.payload.cellId] = action.payload.value;
    },
    clearCell(state, action: { payload: string }) {
      pushHistory(state);
      state.cells[action.payload] = "";
    },
    setCellStyle(
      state,
      action: { payload: { cellId: string; style: CellStyle } },
    ) {
      pushHistory(state);
      state.cellStyles[action.payload.cellId] = {
        ...(state.cellStyles[action.payload.cellId] ?? {}),
        ...action.payload.style,
      };
    },
    replaceSpreadsheet(
      state,
      action: {
        payload: {
          cells: CellData;
          cellStyles?: CellStyles;
          rowCount: number;
          columnCount: number;
        };
      },
    ) {
      pushHistory(state);
      state.cells = action.payload.cells;
      state.cellStyles = action.payload.cellStyles ?? {};
      state.rowCount = action.payload.rowCount;
      state.columnCount = action.payload.columnCount;
    },
    insertRowAt(state, action: { payload: number }) {
      const targetRow = action.payload;
      const nextCells: CellData = {};
      const nextStyles: CellStyles = {};

      pushHistory(state);

      Object.entries(state.cells).forEach(([cellId, value]) => {
        const { column, row } = parseCellId(cellId);

        if (row >= targetRow) {
          nextCells[getCellId(column, row + 1)] = value;
          nextStyles[getCellId(column, row + 1)] =
            state.cellStyles[cellId] ?? {};
        } else {
          nextCells[cellId] = value;
          nextStyles[cellId] = state.cellStyles[cellId] ?? {};
        }
      });

      state.cells = nextCells;
      state.cellStyles = nextStyles;
      state.rowCount += 1;
    },
    deleteRowAt(state, action: { payload: number }) {
      const targetRow = action.payload;
      const nextCells: CellData = {};
      const nextStyles: CellStyles = {};

      if (state.rowCount <= 1) {
        return;
      }

      pushHistory(state);

      Object.entries(state.cells).forEach(([cellId, value]) => {
        const { column, row } = parseCellId(cellId);

        if (row === targetRow) {
          return;
        }

        if (row > targetRow) {
          nextCells[getCellId(column, row - 1)] = value;
          nextStyles[getCellId(column, row - 1)] =
            state.cellStyles[cellId] ?? {};
        } else {
          nextCells[cellId] = value;
          nextStyles[cellId] = state.cellStyles[cellId] ?? {};
        }
      });

      state.cells = nextCells;
      state.cellStyles = nextStyles;
      state.rowCount -= 1;
    },
    insertColumnAt(state, action: { payload: string }) {
      const targetColumnIndex = getColumnIndex(action.payload);
      const nextCells: CellData = {};
      const nextStyles: CellStyles = {};

      pushHistory(state);

      Object.entries(state.cells).forEach(([cellId, value]) => {
        const { column, row } = parseCellId(cellId);
        const columnIndex = getColumnIndex(column);

        if (columnIndex >= targetColumnIndex) {
          nextCells[getCellId(getColumnName(columnIndex + 1), row)] = value;
          nextStyles[getCellId(getColumnName(columnIndex + 1), row)] =
            state.cellStyles[cellId] ?? {};
        } else {
          nextCells[cellId] = value;
          nextStyles[cellId] = state.cellStyles[cellId] ?? {};
        }
      });

      state.cells = nextCells;
      state.cellStyles = nextStyles;
      state.columnCount += 1;
    },
    deleteColumnAt(state, action: { payload: string }) {
      const targetColumnIndex = getColumnIndex(action.payload);
      const nextCells: CellData = {};
      const nextStyles: CellStyles = {};

      if (state.columnCount <= 1) {
        return;
      }

      pushHistory(state);

      Object.entries(state.cells).forEach(([cellId, value]) => {
        const { column, row } = parseCellId(cellId);
        const columnIndex = getColumnIndex(column);

        if (columnIndex === targetColumnIndex) {
          return;
        }

        if (columnIndex > targetColumnIndex) {
          nextCells[getCellId(getColumnName(columnIndex - 1), row)] = value;
          nextStyles[getCellId(getColumnName(columnIndex - 1), row)] =
            state.cellStyles[cellId] ?? {};
        } else {
          nextCells[cellId] = value;
          nextStyles[cellId] = state.cellStyles[cellId] ?? {};
        }
      });

      state.cells = nextCells;
      state.cellStyles = nextStyles;
      state.columnCount -= 1;
    },
    markSpreadsheetSaved(state) {
      state.hasUnsavedChanges = false;
    },
    undo(state) {
      const previous = state.past.pop();

      if (!previous) {
        return;
      }

      state.future.push(takeSnapshot(state));
      applySnapshot(state, previous);
      state.hasUnsavedChanges = true;
    },
    redo(state) {
      const next = state.future.pop();

      if (!next) {
        return;
      }

      state.past.push(takeSnapshot(state));
      applySnapshot(state, next);
      state.hasUnsavedChanges = true;
    },
  },
});

export const {
  clearSpreadsheet,
  clearCell,
  deleteColumnAt,
  deleteRowAt,
  insertColumnAt,
  insertRowAt,
  loadSpreadsheet,
  markSpreadsheetSaved,
  redo,
  replaceSpreadsheet,
  setCellValue,
  setCellStyle,
  setRangeEnd,
  setSelectedCell,
  undo,
} = spreadsheetSlice.actions;

export default spreadsheetSlice.reducer;
