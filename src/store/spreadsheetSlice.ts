import { createSlice } from "@reduxjs/toolkit";
import type {
  CellData,
  CellStyle,
  CellStyles,
  SpreadsheetDocument,
} from "../services/documentService";

/**
 * Позиция одной ячейки в человекочитаемых координатах таблицы.
 */
export type CellPosition = {
  row: number;
  column: string;
};

/**
 * Восстанавливаемая часть состояния таблицы для undo и redo.
 */
type SpreadsheetSnapshot = {
  cells: CellData;
  cellStyles: CellStyles;
  rowCount: number;
  columnCount: number;
};

/**
 * Redux state активного документа таблицы.
 */
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

/**
 * Преобразует индекс столбца с нуля в название столбца таблицы.
 *
 * Пример: 0 -> A, 25 -> Z, 26 -> AA.
 */
function getColumnName(index: number): string {
  let columnName = "";
  let currentIndex = index;

  while (currentIndex >= 0) {
    columnName = String.fromCharCode((currentIndex % 26) + 65) + columnName;
    currentIndex = Math.floor(currentIndex / 26) - 1;
  }

  return columnName;
}

/**
 * Преобразует название столбца таблицы в индекс с нуля.
 *
 * Пример: A -> 0, Z -> 25, AA -> 26.
 */
function getColumnIndex(columnName: string): number {
  let index = 0;

  for (let i = 0; i < columnName.length; i += 1) {
    index = index * 26 + (columnName.charCodeAt(i) - 64);
  }

  return index - 1;
}

/**
 * Собирает id ячейки из названия столбца и номера строки.
 */
function getCellId(column: string, row: number): string {
  return `${column}${row}`;
}

/**
 * Разбирает id ячейки вроде "B12" на столбец и строку.
 */
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

/**
 * Копирует поля таблицы, которые должны участвовать в undo/redo.
 */
function takeSnapshot(state: SpreadsheetState): SpreadsheetSnapshot {
  return {
    cells: { ...state.cells },
    cellStyles: { ...state.cellStyles },
    rowCount: state.rowCount,
    columnCount: state.columnCount,
  };
}

/**
 * Восстанавливает поля таблицы из snapshot.
 */
function applySnapshot(state: SpreadsheetState, snapshot: SpreadsheetSnapshot) {
  state.cells = snapshot.cells;
  state.cellStyles = snapshot.cellStyles;
  state.rowCount = snapshot.rowCount;
  state.columnCount = snapshot.columnCount;
}

/**
 * Сохраняет текущее состояние таблицы перед пользовательским изменением.
 */
function pushHistory(state: SpreadsheetState) {
  state.past.push(takeSnapshot(state));
  state.future = [];
  state.hasUnsavedChanges = true;
}

/**
 * Slice, который хранит данные активной таблицы, форматирование, выделение и историю.
 */
const spreadsheetSlice = createSlice({
  name: "spreadsheet",
  initialState,
  reducers: {
    /**
     * Загружает выбранный документ в редактор и сбрасывает временное состояние.
     */
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
    /**
     * Очищает активную таблицу, когда документ не открыт.
     */
    clearSpreadsheet(state) {
      Object.assign(state, initialState);
    },
    /**
     * Выбирает одну ячейку и сбрасывает конец диапазона.
     */
    setSelectedCell(state, action: { payload: CellPosition | null }) {
      state.selectedCell = action.payload;
      state.rangeEnd = null;
    },
    /**
     * Сохраняет второй угол выделенного диапазона.
     */
    setRangeEnd(state, action: { payload: CellPosition | null }) {
      state.rangeEnd = action.payload;
    },
    /**
     * Записывает исходное значение ячейки и добавляет прошлое состояние в undo history.
     */
    setCellValue(
      state,
      action: { payload: { cellId: string; value: string } },
    ) {
      pushHistory(state);
      state.cells[action.payload.cellId] = action.payload.value;
    },
    /**
     * Очищает значение одной ячейки и добавляет прошлое состояние в undo history.
     */
    clearCell(state, action: { payload: string }) {
      pushHistory(state);
      state.cells[action.payload] = "";
    },
    /**
     * Добавляет форматирование к ячейке и сохраняет уже существующие поля стиля.
     */
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
    /**
     * Полностью заменяет таблицу, в основном после импорта CSV.
     */
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
    /**
     * Вставляет строку и сдвигает существующие ячейки/стили вниз от целевой строки.
     */
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
    /**
     * Удаляет строку и сдвигает ячейки/стили ниже нее вверх.
     */
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
    /**
     * Вставляет столбец и сдвигает существующие ячейки/стили вправо.
     */
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
    /**
     * Удаляет столбец и сдвигает ячейки/стили справа влево.
     */
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
    /**
     * Помечает текущую таблицу как сохраненную.
     */
    markSpreadsheetSaved(state) {
      state.hasUnsavedChanges = false;
    },
    /**
     * Восстанавливает последний snapshot из прошлой истории.
     */
    undo(state) {
      const previous = state.past.pop();

      if (!previous) {
        return;
      }

      state.future.push(takeSnapshot(state));
      applySnapshot(state, previous);
      state.hasUnsavedChanges = true;
    },
    /**
     * Повторно применяет последний snapshot из будущей истории.
     */
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
