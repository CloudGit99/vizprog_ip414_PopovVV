import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import {
  createDocument,
  deleteDocument,
  duplicateDocument,
  loadDocuments,
  renameDocument,
  saveActiveDocument,
  setActiveDocumentId,
} from "../../store/documentsSlice";
import {
  clearSpreadsheet,
  deleteColumnAt,
  deleteRowAt,
  insertColumnAt,
  insertRowAt,
  loadSpreadsheet,
  redo,
  replaceSpreadsheet,
  clearCell,
  setCellValue,
  setCellStyle,
  setRangeEnd,
  setSelectedCell,
  undo,
} from "../../store/spreadsheetSlice";
import {
  closeCreateModal,
  openCreateModal,
  setSaveStatus,
} from "../../store/uiSlice";
import type {
  CellData,
  CellStyle,
  SpreadsheetDocument,
} from "../../services/documentService";
import type { CellPosition } from "../../store/spreadsheetSlice";
import "./Spreadsheet.css";

const INITIAL_ROW_COUNT = 1000;
const INITIAL_COLUMN_COUNT = 26;
const DEFAULT_COLUMN_WIDTH = 100;
const DEFAULT_ROW_HEIGHT = 28;
const MIN_COLUMN_WIDTH = 60;
const MIN_ROW_HEIGHT = 24;

type ContextMenuState = {
  x: number;
  y: number;
  row: number;
  column: string;
} | null;

/**
 * Props компонента Spreadsheet.
 *
 * Если documentId не передан, компонент показывает режим dashboard со списком документов.
 * Если documentId есть, компонент открывает режим редактора конкретного документа.
 */
type SpreadsheetProps = {
  documentId?: string;
};

/**
 * Преобразует индекс столбца с нуля в название столбца таблицы.
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
 * Разбирает id ячейки вроде "A1" на координаты строки и столбца.
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
 * Читает ячейку как число для формул.
 *
 * Пустые или нечисловые значения считаются 0.
 */
function getCellNumberValue(cells: CellData, cellId: string): number {
  const value = cells[cellId];

  if (!value) {
    return 0;
  }

  const numberValue = Number(value);

  return Number.isNaN(numberValue) ? 0 : numberValue;
}

/**
 * Возвращает все id ячеек внутри прямоугольного диапазона.
 */
function getCellsInRange(startCell: string, endCell: string): string[] {
  const start = parseCellId(startCell);
  const end = parseCellId(endCell);

  const startRow = Math.min(start.row, end.row);
  const endRow = Math.max(start.row, end.row);

  const startColumnIndex = Math.min(
    getColumnIndex(start.column),
    getColumnIndex(end.column),
  );

  const endColumnIndex = Math.max(
    getColumnIndex(start.column),
    getColumnIndex(end.column),
  );

  const cellIds: string[] = [];

  for (let row = startRow; row <= endRow; row += 1) {
    for (
      let columnIndex = startColumnIndex;
      columnIndex <= endColumnIndex;
      columnIndex += 1
    ) {
      cellIds.push(getCellId(getColumnName(columnIndex), row));
    }
  }

  return cellIds;
}

/**
 * Считает поддерживаемые формулы таблицы.
 *
 * Поддерживаемый синтаксис: SUM(A1:B2), AVERAGE(A1:B2) и простые выражения +, -, *.
 */
function calculateFormula(cells: CellData, formula: string): string {
  const expression = formula.slice(1).trim();

  const sumMatch = expression.match(/^SUM\(([A-Z]+\d+):([A-Z]+\d+)\)$/);

  if (sumMatch) {
    const cellIds = getCellsInRange(sumMatch[1], sumMatch[2]);

    const sum = cellIds.reduce(
      (result, cellId) => result + getCellNumberValue(cells, cellId),
      0,
    );

    return String(sum);
  }

  const averageMatch = expression.match(/^AVERAGE\(([A-Z]+\d+):([A-Z]+\d+)\)$/);

  if (averageMatch) {
    const cellIds = getCellsInRange(averageMatch[1], averageMatch[2]);

    const sum = cellIds.reduce(
      (result, cellId) => result + getCellNumberValue(cells, cellId),
      0,
    );

    return String(sum / cellIds.length);
  }

  const simpleMatch = expression.match(
    /^([A-Z]+\d+|\d+(?:\.\d+)?)([+\-*])([A-Z]+\d+|\d+(?:\.\d+)?)$/,
  );

  if (simpleMatch) {
    const left = simpleMatch[1];
    const operator = simpleMatch[2];
    const right = simpleMatch[3];

    const leftValue = /^[A-Z]+\d+$/.test(left)
      ? getCellNumberValue(cells, left)
      : Number(left);

    const rightValue = /^[A-Z]+\d+$/.test(right)
      ? getCellNumberValue(cells, right)
      : Number(right);

    if (operator === "+") {
      return String(leftValue + rightValue);
    }

    if (operator === "-") {
      return String(leftValue - rightValue);
    }

    if (operator === "*") {
      return String(leftValue * rightValue);
    }
  }

  return "#ERROR";
}

/**
 * Возвращает видимое значение ячейки.
 *
 * Исходные формулы вычисляются перед отображением.
 */
function getDisplayValue(cells: CellData, cellId: string): string {
  const value = cells[cellId] ?? "";

  if (value.startsWith("=")) {
    return calculateFormula(cells, value);
  }

  return value;
}

/**
 * Применяет числовой формат или формат даты к видимому значению.
 */
function formatCellValue(value: string, style: CellStyle): string {
  if (!value || value.startsWith("=")) {
    return value;
  }

  const numberValue = Number(value);

  if (style.numberFormat === "percent" && !Number.isNaN(numberValue)) {
    return `${numberValue}%`;
  }

  if (style.numberFormat === "currency" && !Number.isNaN(numberValue)) {
    return `${numberValue.toLocaleString("ru-RU")} ₽`;
  }

  if (style.numberFormat === "date") {
    const date = new Date(value);

    if (!Number.isNaN(date.getTime())) {
      return date.toLocaleDateString("ru-RU");
    }
  }

  return value;
}

/**
 * Форматирует ISO-дату для метаданных документа.
 */
function formatDate(value: string): string {
  return new Date(value).toLocaleString("ru-RU");
}

/**
 * Преобразует объект cells в прямоугольный массив строк для CSV-экспорта.
 */
function getRowsFromCells(document: SpreadsheetDocument): string[][] {
  const rows: string[][] = [];

  for (let row = 1; row <= document.rowCount; row += 1) {
    const values: string[] = [];

    for (let columnIndex = 0; columnIndex < document.columnCount; columnIndex += 1) {
      values.push(document.cells[getCellId(getColumnName(columnIndex), row)] ?? "");
    }

    rows.push(values);
  }

  return rows;
}

/**
 * Экранирует одно значение по правилам CSV.
 */
function escapeCsvValue(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replaceAll('"', '""')}"`;
  }

  return value;
}

/**
 * Парсит CSV-текст с поддержкой значений в кавычках и экранированных кавычек.
 */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let value = "";
  let isQuoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const nextChar = text[index + 1];

    if (char === '"' && isQuoted && nextChar === '"') {
      value += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      isQuoted = !isQuoted;
      continue;
    }

    if (char === "," && !isQuoted) {
      row.push(value);
      value = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !isQuoted) {
      if (char === "\r" && nextChar === "\n") {
        index += 1;
      }

      row.push(value);
      rows.push(row);
      row = [];
      value = "";
      continue;
    }

    value += char;
  }

  row.push(value);

  if (row.some((cell) => cell !== "")) {
    rows.push(row);
  }

  return rows;
}

/**
 * Скачивает текстовое содержимое как файл браузера.
 */
function downloadFile(fileName: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = fileName;
  link.click();

  URL.revokeObjectURL(url);
}

/**
 * Главный компонент таблицы.
 *
 * Объединяет режим dashboard, открытие документа, редактирование таблицы,
 * формулы, форматирование, импорт/экспорт, контекстное меню и горячие клавиши.
 */
function Spreadsheet({ documentId }: SpreadsheetProps) {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const documents = useAppSelector((state) => state.documents.items);
  const activeDocumentId = useAppSelector(
    (state) => state.documents.activeDocumentId,
  );
  const loadingStatus = useAppSelector((state) => state.documents.loadingStatus);
  const currentUser = useAppSelector((state) => state.auth.user);
  const isCreateModalOpen = useAppSelector(
    (state) => state.ui.isCreateModalOpen,
  );
  const saveStatus = useAppSelector((state) => state.ui.saveStatus);
  const {
    cells,
    cellStyles,
    columnCount,
    hasUnsavedChanges,
    rangeEnd,
    rowCount,
    selectedCell,
  } = useAppSelector((state) => state.spreadsheet);
  const [newTitle, setNewTitle] = useState("Новый документ");
  const [newRowCount, setNewRowCount] = useState(INITIAL_ROW_COUNT);
  const [newColumnCount, setNewColumnCount] = useState(INITIAL_COLUMN_COUNT);
  const [editingCell, setEditingCell] = useState<CellPosition | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [contextMenu, setContextMenu] = useState<ContextMenuState>(null);
  const [isMissingDocument, setIsMissingDocument] = useState(false);
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});
  const [rowHeights, setRowHeights] = useState<Record<number, number>>({});

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const spreadsheetRef = useRef<HTMLDivElement | null>(null);
  const documentMeta = documents.find(
    (document) => document.id === activeDocumentId,
  );
  const activeDocument = documentMeta
    ? {
        ...documentMeta,
        cells,
        rowCount,
        columnCount,
      }
    : null;

  const columns = useMemo(
    () =>
      Array.from({ length: columnCount }, (_, index) => getColumnName(index)),
    [columnCount],
  );

  // eslint-disable-next-line react-hooks/incompatible-library
  const rowVirtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => scrollContainerRef.current,
    estimateSize: (index) => rowHeights[index + 1] ?? DEFAULT_ROW_HEIGHT,
    overscan: 10,
  });

  const virtualRows = rowVirtualizer.getVirtualItems();

  const selectedCellId = selectedCell
    ? getCellId(selectedCell.column, selectedCell.row)
    : null;

  const formulaBarValue =
    activeDocument && selectedCellId ? (cells[selectedCellId] ?? "") : "";

  const selectedStyle = selectedCellId ? (cellStyles[selectedCellId] ?? {}) : {};

  /**
   * Открывает документ в редакторе таблицы и сбрасывает временное UI-состояние.
   */
  const openDocument = useCallback(
    (document: SpreadsheetDocument) => {
      dispatch(setActiveDocumentId(document.id));
      dispatch(loadSpreadsheet(document));
      setEditingCell(null);
      setColumnWidths({});
      setRowHeights({});
      dispatch(setSaveStatus("saved"));
    },
    [dispatch],
  );

  useEffect(() => {
    void dispatch(loadDocuments());
  }, [dispatch]);

  useEffect(() => {
    if (!documentId) {
      dispatch(setActiveDocumentId(null));
      dispatch(clearSpreadsheet());
      return;
    }

    const document = documents.find((item) => item.id === documentId);

    if (document) {
      openDocument(document);
      setIsMissingDocument(false);
      return;
    }

    if (loadingStatus === "idle") {
      setIsMissingDocument(true);
    }
  }, [dispatch, documentId, documents, loadingStatus, openDocument]);

  useEffect(() => {
    function handleBeforeUnload(event: BeforeUnloadEvent) {
      if (!hasUnsavedChanges) {
        return;
      }

      event.preventDefault();
      event.returnValue = "";
    }

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges]);

  useEffect(() => {
    function handleShortcut(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.code === "KeyS") {
        event.preventDefault();
        void dispatch(saveActiveDocument());
      }
    }

    window.addEventListener("keydown", handleShortcut);

    return () => window.removeEventListener("keydown", handleShortcut);
  }, [dispatch]);

  /**
   * Создает новый документ таблицы из значений модального окна.
   */
  async function handleCreateDocument() {
    const title = newTitle.trim();

    if (!title) {
      return;
    }

    const document = await dispatch(
      createDocument({
        title,
        rowCount: Math.max(1, newRowCount),
        columnCount: Math.max(1, newColumnCount),
      }),
    ).unwrap();

    openDocument(document);
    navigate(`/documents/${document.id}`);
    dispatch(closeCreateModal());
    setNewTitle("Новый документ");
    setNewRowCount(INITIAL_ROW_COUNT);
    setNewColumnCount(INITIAL_COLUMN_COUNT);
  }

  /**
   * Переименовывает документ после ввода нового названия.
   */
  async function handleRenameDocument(document: SpreadsheetDocument) {
    const title = window.prompt("Новое название", document.title)?.trim();

    if (!title) {
      return;
    }

    await dispatch(renameDocument({ id: document.id, title }));
  }

  /**
   * Удаляет документ и очищает редактор, если этот документ был активным.
   */
  async function handleDeleteDocument(document: SpreadsheetDocument) {
    if (!window.confirm(`Удалить "${document.title}"?`)) {
      return;
    }

    await dispatch(deleteDocument(document.id));

    if (activeDocument?.id === document.id) {
      dispatch(clearSpreadsheet());
    }
  }

  /**
   * Создает копию выбранного документа.
   */
  async function handleDuplicateDocument(document: SpreadsheetDocument) {
    await dispatch(duplicateDocument(document.id));
  }

  /**
   * Переводит ячейку в режим редактирования через input.
   */
  function startEditing(row: number, column: string) {
    if (!activeDocument) {
      return;
    }

    const cellId = getCellId(column, row);

    setEditingCell({
      row,
      column,
    });

    setInputValue(cells[cellId] ?? "");
  }

  /**
   * Сохраняет введенное значение в Redux и возвращает фокус на таблицу.
   */
  function saveCell() {
    if (!editingCell) {
      return;
    }

    const cellId = getCellId(editingCell.column, editingCell.row);

    dispatch(setCellValue({ cellId, value: inputValue }));

    setEditingCell(null);
    window.requestAnimationFrame(() => {
      spreadsheetRef.current?.focus();
    });
  }

  /**
   * Выходит из режима редактирования без записи значения в Redux.
   */
  function cancelEditing() {
    setEditingCell(null);
  }

  /**
   * Обновляет выбранную ячейку из строки формулы.
   */
  function updateSelectedCellValue(value: string) {
    if (!selectedCellId) {
      return;
    }

    dispatch(setCellValue({ cellId: selectedCellId, value }));
  }

  /**
   * Применяет изменения форматирования к выбранной ячейке.
   */
  function applySelectedStyle(style: CellStyle) {
    if (!selectedCellId) {
      return;
    }

    dispatch(setCellStyle({ cellId: selectedCellId, style }));
  }

  /**
   * Возвращает id текущих выбранных ячеек.
   *
   * Если выбран диапазон, возвращает все ячейки этого диапазона.
   */
  function getSelectedRangeCells() {
    if (!selectedCell) {
      return [];
    }

    if (!rangeEnd) {
      return [getCellId(selectedCell.column, selectedCell.row)];
    }

    return getCellsInRange(
      getCellId(selectedCell.column, selectedCell.row),
      getCellId(rangeEnd.column, rangeEnd.row),
    );
  }

  /**
   * Копирует выбранные значения в clipboard и при необходимости очищает исходные ячейки.
   */
  async function copySelectedCells(cut: boolean) {
    const cellIds = getSelectedRangeCells();

    if (cellIds.length === 0) {
      return;
    }

    const text = cellIds.map((cellId) => cells[cellId] ?? "").join("\t");

    await navigator.clipboard.writeText(text);

    if (cut) {
      cellIds.forEach((cellId) => dispatch(clearCell(cellId)));
    }
  }

  /**
   * Перемещает выбранную ячейку на смещение строки/столбца в границах документа.
   */
  function moveSelection(rowOffset: number, columnOffset: number) {
    if (!activeDocument || !selectedCell) {
      return;
    }

    const currentColumnIndex = getColumnIndex(selectedCell.column);
    const nextRow = selectedCell.row + rowOffset;
    const nextColumnIndex = currentColumnIndex + columnOffset;

    if (
      nextRow < 1 ||
      nextRow > activeDocument.rowCount ||
      nextColumnIndex < 0 ||
      nextColumnIndex >= activeDocument.columnCount
    ) {
      return;
    }

    dispatch(
      setSelectedCell({
        row: nextRow,
        column: getColumnName(nextColumnIndex),
      }),
    );
  }

  /**
   * Обрабатывает горячие клавиши уровня таблицы.
   *
   * Горячие клавиши игнорируются, пока пользователь редактирует input внутри ячейки.
   */
  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (editingCell || !selectedCell) {
      return;
    }

    if ((event.ctrlKey || event.metaKey) && event.code === "KeyZ") {
      event.preventDefault();
      dispatch(undo());
    }

    if ((event.ctrlKey || event.metaKey) && event.code === "KeyY") {
      event.preventDefault();
      dispatch(redo());
    }

    if ((event.ctrlKey || event.metaKey) && event.code === "KeyB") {
      event.preventDefault();
      applySelectedStyle({ bold: !selectedStyle.bold });
    }

    if ((event.ctrlKey || event.metaKey) && event.code === "KeyI") {
      event.preventDefault();
      applySelectedStyle({ italic: !selectedStyle.italic });
    }

    if ((event.ctrlKey || event.metaKey) && event.code === "KeyU") {
      event.preventDefault();
      applySelectedStyle({ underline: !selectedStyle.underline });
    }

    if ((event.ctrlKey || event.metaKey) && event.code === "KeyC") {
      event.preventDefault();
      void copySelectedCells(false);
    }

    if ((event.ctrlKey || event.metaKey) && event.code === "KeyX") {
      event.preventDefault();
      void copySelectedCells(true);
    }

    if ((event.ctrlKey || event.metaKey) && event.code === "KeyV") {
      event.preventDefault();
      const targetCellId = selectedCellId;

      if (!targetCellId) {
        return;
      }

      void navigator.clipboard.readText().then((text) => {
        dispatch(setCellValue({ cellId: targetCellId, value: text }));
      });
    }

    if ((event.ctrlKey || event.metaKey) && event.code === "KeyA") {
      event.preventDefault();
      dispatch(setRangeEnd({ row: rowCount, column: getColumnName(columnCount - 1) }));
    }

    if (event.key === "Delete" || event.key === "Backspace") {
      event.preventDefault();
      getSelectedRangeCells().forEach((cellId) => dispatch(clearCell(cellId)));
    }

    if (event.key === "Enter") {
      startEditing(selectedCell.row, selectedCell.column);
    }

    if (event.key === "Tab") {
      event.preventDefault();
      moveSelection(0, 1);
    }

    if (event.key === "Escape") {
      dispatch(setSelectedCell(null));
      dispatch(setRangeEnd(null));
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      moveSelection(-1, 0);
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      moveSelection(1, 0);
    }

    if (event.key === "ArrowLeft") {
      event.preventDefault();
      moveSelection(0, -1);
    }

    if (event.key === "ArrowRight") {
      event.preventDefault();
      moveSelection(0, 1);
    }
  }

  /**
   * Выбирает одну ячейку или расширяет диапазон выделения через Shift.
   */
  function handleCellClick(row: number, column: string, shiftKey: boolean) {
    const nextCell = {
      row,
      column,
    };

    if (shiftKey && selectedCell) {
      dispatch(setRangeEnd(nextCell));
      return;
    }

    dispatch(setSelectedCell(nextCell));
    dispatch(setRangeEnd(null));
  }

  /**
   * Скрывает контекстное меню строк/столбцов.
   */
  function closeContextMenu() {
    setContextMenu(null);
  }

  /**
   * Сохраняет измененную ширину столбца с ограничением минимальной ширины.
   */
  function resizeColumn(column: string, width: number) {
    setColumnWidths((previous) => ({
      ...previous,
      [column]: Math.max(MIN_COLUMN_WIDTH, width),
    }));
  }

  /**
   * Сохраняет измененную высоту строки с ограничением минимальной высоты.
   */
  function resizeRow(row: number, height: number) {
    setRowHeights((previous) => ({
      ...previous,
      [row]: Math.max(MIN_ROW_HEIGHT, height),
    }));

    window.requestAnimationFrame(() => {
      rowVirtualizer.measure();
    });
  }

  /**
   * Вставляет строку и сдвигает локально сохраненные высоты строк.
   */
  function handleInsertRowAt(targetRow: number) {
    dispatch(insertRowAt(targetRow));

    setRowHeights((previousHeights) => {
      const nextHeights: Record<number, number> = {};

      Object.entries(previousHeights).forEach(([rowKey, height]) => {
        const row = Number(rowKey);

        if (row >= targetRow) {
          nextHeights[row + 1] = height;
        } else {
          nextHeights[row] = height;
        }
      });

      return nextHeights;
    });

    window.requestAnimationFrame(() => {
      rowVirtualizer.measure();
    });
  }

  /**
   * Удаляет строку и сдвигает локально сохраненные высоты строк.
   */
  function handleDeleteRowAt(targetRow: number) {
    dispatch(deleteRowAt(targetRow));

    setRowHeights((previousHeights) => {
      const nextHeights: Record<number, number> = {};

      Object.entries(previousHeights).forEach(([rowKey, height]) => {
        const row = Number(rowKey);

        if (row === targetRow) {
          return;
        }

        if (row > targetRow) {
          nextHeights[row - 1] = height;
        } else {
          nextHeights[row] = height;
        }
      });

      return nextHeights;
    });

    window.requestAnimationFrame(() => {
      rowVirtualizer.measure();
    });
  }

  /**
   * Вставляет столбец и сдвигает локально сохраненные ширины столбцов.
   */
  function handleInsertColumnAt(targetColumn: string) {
    const targetColumnIndex = getColumnIndex(targetColumn);

    dispatch(insertColumnAt(targetColumn));

    setColumnWidths((previousWidths) => {
      const nextWidths: Record<string, number> = {};

      Object.entries(previousWidths).forEach(([column, width]) => {
        const columnIndex = getColumnIndex(column);

        if (columnIndex >= targetColumnIndex) {
          nextWidths[getColumnName(columnIndex + 1)] = width;
        } else {
          nextWidths[column] = width;
        }
      });

      return nextWidths;
    });
  }

  /**
   * Удаляет столбец и сдвигает локально сохраненные ширины столбцов.
   */
  function handleDeleteColumnAt(targetColumn: string) {
    const targetColumnIndex = getColumnIndex(targetColumn);

    dispatch(deleteColumnAt(targetColumn));

    setColumnWidths((previousWidths) => {
      const nextWidths: Record<string, number> = {};

      Object.entries(previousWidths).forEach(([column, width]) => {
        const columnIndex = getColumnIndex(column);

        if (columnIndex === targetColumnIndex) {
          return;
        }

        if (columnIndex > targetColumnIndex) {
          nextWidths[getColumnName(columnIndex - 1)] = width;
        } else {
          nextWidths[column] = width;
        }
      });

      return nextWidths;
    });
  }

  /**
   * Действие контекстного меню для вставки строки.
   */
  function addRow() {
    const targetRow = contextMenu?.row ?? selectedCell?.row;

    if (!targetRow) {
      return;
    }

    handleInsertRowAt(targetRow);
    closeContextMenu();
  }

  /**
   * Действие контекстного меню для удаления строки.
   */
  function deleteRow() {
    const targetRow = contextMenu?.row ?? selectedCell?.row;

    if (!targetRow || !activeDocument || activeDocument.rowCount <= 1) {
      return;
    }

    handleDeleteRowAt(targetRow);
    closeContextMenu();
  }

  /**
   * Действие контекстного меню для вставки столбца.
   */
  function addColumn() {
    const targetColumn = contextMenu?.column ?? selectedCell?.column;

    if (!targetColumn) {
      return;
    }

    handleInsertColumnAt(targetColumn);
    closeContextMenu();
  }

  /**
   * Действие контекстного меню для удаления столбца.
   */
  function deleteColumn() {
    const targetColumn = contextMenu?.column ?? selectedCell?.column;

    if (!targetColumn || !activeDocument || activeDocument.columnCount <= 1) {
      return;
    }

    handleDeleteColumnAt(targetColumn);
    closeContextMenu();
  }

  /**
   * Экспортирует значения активного документа в CSV.
   */
  function exportCsv() {
    if (!activeDocument) {
      return;
    }

    const csv = getRowsFromCells(activeDocument)
      .map((row) => row.map(escapeCsvValue).join(","))
      .join("\n");

    downloadFile(`${activeDocument.title}.csv`, csv, "text/csv;charset=utf-8");
  }

  /**
   * Экспортирует активный документ с метаданными, значениями и стилями в JSON.
   */
  function exportJson() {
    if (!activeDocument) {
      return;
    }

    downloadFile(
      `${activeDocument.title}.json`,
      JSON.stringify(activeDocument, null, 2),
      "application/json;charset=utf-8",
    );
  }

  /**
   * Импортирует значения CSV и заменяет содержимое активной таблицы.
   */
  async function importCsv(file: File) {
    const text = await file.text();
    const rows = parseCsv(text);
    const nextCells: CellData = {};

    rows.forEach((row, rowIndex) => {
      row.forEach((value, columnIndex) => {
        nextCells[getCellId(getColumnName(columnIndex), rowIndex + 1)] = value;
      });
    });

    dispatch(
      replaceSpreadsheet({
        rowCount: Math.max(1, rows.length),
        columnCount: Math.max(1, Math.max(...rows.map((row) => row.length))),
        cells: nextCells,
      }),
    );
  }

  if (!activeDocument) {
    if (documentId) {
      return (
        <div className="spreadsheet-wrapper">
          {isMissingDocument ? (
            <div className="empty-state">Документ не найден</div>
          ) : (
            <div className="empty-state">Загрузка документа...</div>
          )}
        </div>
      );
    }

    return (
      <div className="spreadsheet-wrapper">
        <div className="dashboard-header">
          <div>
            <h1>Мои документы</h1>
            <p>Текущий пользователь: {currentUser?.id}</p>
          </div>

          <button type="button" onClick={() => dispatch(openCreateModal())}>
            Создать документ
          </button>
        </div>

        <div className="documents-list">
          {documents.map((document) => (
            <div key={document.id} className="document-card">
              <div className="document-card__header">
                <div>
                  <h2>{document.title}</h2>
                  <p>Создан: {formatDate(document.createdAt)}</p>
                  <p>Изменён: {formatDate(document.updatedAt)}</p>
                </div>

                <div className="document-card__actions">
                  <button
                    type="button"
                    onClick={() => {
                      openDocument(document);
                      navigate(`/documents/${document.id}`);
                    }}
                  >
                    Открыть
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRenameDocument(document)}
                  >
                    Переименовать
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDuplicateDocument(document)}
                  >
                    Дублировать
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteDocument(document)}
                  >
                    Удалить
                  </button>
                </div>
              </div>

              <table className="document-preview">
                <tbody>
                  {[1, 2, 3].map((row) => (
                    <tr key={row}>
                      {[0, 1, 2].map((columnIndex) => (
                        <td key={columnIndex}>
                          {document.cells[getCellId(getColumnName(columnIndex), row)] ??
                            ""}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}

          {documents.length === 0 && (
            <div className="empty-state">Документов пока нет</div>
          )}
        </div>

        {isCreateModalOpen && (
          <div className="modal-backdrop">
            <div className="modal">
              <h2>Создать документ</h2>

              <label>
                Название
                <input
                  value={newTitle}
                  onChange={(event) => setNewTitle(event.target.value)}
                />
              </label>

              <label>
                Строки
                <input
                  type="number"
                  min={1}
                  value={newRowCount}
                  onChange={(event) => setNewRowCount(Number(event.target.value))}
                />
              </label>

              <label>
                Столбцы
                <input
                  type="number"
                  min={1}
                  value={newColumnCount}
                  onChange={(event) =>
                    setNewColumnCount(Number(event.target.value))
                  }
                />
              </label>

              <div className="modal__actions">
                <button type="button" onClick={handleCreateDocument}>
                  Создать
                </button>
                <button type="button" onClick={() => dispatch(closeCreateModal())}>
                  Отмена
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="spreadsheet-wrapper" onClick={closeContextMenu}>
      <div className="document-toolbar">
        <button
          type="button"
          onClick={() => {
            dispatch(setActiveDocumentId(null));
            dispatch(clearSpreadsheet());
            navigate("/dashboard");
          }}
        >
          Назад
        </button>

        <strong>{activeDocument.title}</strong>

        <span>{saveStatus === "saved" && "Сохранено"}</span>
        <span>{saveStatus === "saving" && "Сохранение..."}</span>
        <span>{saveStatus === "error" && "Ошибка сохранения"}</span>

        <button type="button" onClick={() => dispatch(saveActiveDocument())}>
          Сохранить
        </button>
        <button type="button" onClick={exportCsv}>
          Экспорт CSV
        </button>
        <button type="button" onClick={exportJson}>
          Экспорт JSON
        </button>
        <button type="button" onClick={() => fileInputRef.current?.click()}>
          Импорт CSV
        </button>
        <input
          ref={fileInputRef}
          className="file-input"
          type="file"
          accept=".csv,text/csv"
          onChange={(event) => {
            const file = event.target.files?.[0];

            if (file) {
              void importCsv(file);
            }

            event.target.value = "";
          }}
        />
      </div>

      <div className="formula-bar">
        <div className="formula-bar__cell-name">{selectedCellId ?? ""}</div>

        <input
          className="formula-bar__input"
          value={formulaBarValue}
          disabled={!selectedCellId}
          placeholder="Выберите ячейку"
          onChange={(event) => updateSelectedCellValue(event.target.value)}
        />
      </div>

      <div className="format-toolbar">
        <button
          type="button"
          onClick={() => applySelectedStyle({ bold: !selectedStyle.bold })}
        >
          B
        </button>
        <button
          type="button"
          onClick={() => applySelectedStyle({ italic: !selectedStyle.italic })}
        >
          I
        </button>
        <button
          type="button"
          onClick={() =>
            applySelectedStyle({ underline: !selectedStyle.underline })
          }
        >
          U
        </button>
        <input
          type="color"
          value={selectedStyle.backgroundColor ?? "#ffffff"}
          onChange={(event) =>
            applySelectedStyle({ backgroundColor: event.target.value })
          }
        />
        <input
          type="color"
          value={selectedStyle.textColor ?? "#000000"}
          onChange={(event) => applySelectedStyle({ textColor: event.target.value })}
        />
        <select
          value={selectedStyle.align ?? "left"}
          onChange={(event) =>
            applySelectedStyle({
              align: event.target.value as CellStyle["align"],
            })
          }
        >
          <option value="left">Слева</option>
          <option value="center">Центр</option>
          <option value="right">Справа</option>
        </select>
        <select
          value={selectedStyle.numberFormat ?? "plain"}
          onChange={(event) =>
            applySelectedStyle({
              numberFormat: event.target.value as CellStyle["numberFormat"],
            })
          }
        >
          <option value="plain">Число</option>
          <option value="percent">Процент</option>
          <option value="currency">Валюта</option>
          <option value="date">Дата</option>
        </select>
      </div>

      <div ref={scrollContainerRef} className="spreadsheet-scroll">
        <div
          ref={spreadsheetRef}
          className="spreadsheet"
          tabIndex={0}
          onKeyDown={handleKeyDown}
        >
          <div className="spreadsheet__row">
            <div className="spreadsheet__corner" />

            {columns.map((column) => (
              <div
                key={column}
                className="spreadsheet__column-header"
                style={{
                  width: columnWidths[column] ?? DEFAULT_COLUMN_WIDTH,
                }}
              >
                {column}

                <div
                  className="column-resizer"
                  onMouseDown={(event) => {
                    event.preventDefault();

                    const startX = event.clientX;
                    const startWidth =
                      columnWidths[column] ?? DEFAULT_COLUMN_WIDTH;

                    function handleMouseMove(moveEvent: MouseEvent) {
                      resizeColumn(
                        column,
                        startWidth + moveEvent.clientX - startX,
                      );
                    }

                    function handleMouseUp() {
                      window.removeEventListener("mousemove", handleMouseMove);
                      window.removeEventListener("mouseup", handleMouseUp);
                    }

                    window.addEventListener("mousemove", handleMouseMove);
                    window.addEventListener("mouseup", handleMouseUp);
                  }}
                />
              </div>
            ))}
          </div>

          <div
            style={{
              height: rowVirtualizer.getTotalSize(),
              position: "relative",
            }}
          >
            {virtualRows.map((virtualRow) => {
              const rowNumber = virtualRow.index + 1;

              return (
                <div
                  key={rowNumber}
                  className="spreadsheet__row"
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                >
                  <div
                    className="spreadsheet__row-header"
                    style={{
                      height: rowHeights[rowNumber] ?? DEFAULT_ROW_HEIGHT,
                    }}
                  >
                    {rowNumber}

                    <div
                      className="row-resizer"
                      onMouseDown={(event) => {
                        event.preventDefault();

                        const startY = event.clientY;
                        const startHeight =
                          rowHeights[rowNumber] ?? DEFAULT_ROW_HEIGHT;

                        function handleMouseMove(moveEvent: MouseEvent) {
                          resizeRow(
                            rowNumber,
                            startHeight + moveEvent.clientY - startY,
                          );
                        }

                        function handleMouseUp() {
                          window.removeEventListener(
                            "mousemove",
                            handleMouseMove,
                          );
                          window.removeEventListener("mouseup", handleMouseUp);
                        }

                        window.addEventListener("mousemove", handleMouseMove);
                        window.addEventListener("mouseup", handleMouseUp);
                      }}
                    />
                  </div>

                  {columns.map((column) => {
                    const cellId = getCellId(column, rowNumber);
                    const cellStyle = cellStyles[cellId] ?? {};

                    const isSelected =
                      selectedCell?.row === rowNumber &&
                      selectedCell.column === column;

                    const isEditing =
                      editingCell?.row === rowNumber &&
                      editingCell.column === column;

                    const isInRange =
                      Boolean(selectedCell) &&
                      Boolean(rangeEnd) &&
                      selectedCell !== null &&
                      rangeEnd !== null &&
                      rowNumber >= Math.min(selectedCell.row, rangeEnd.row) &&
                      rowNumber <= Math.max(selectedCell.row, rangeEnd.row) &&
                      getColumnIndex(column) >=
                        Math.min(
                          getColumnIndex(selectedCell.column),
                          getColumnIndex(rangeEnd.column),
                        ) &&
                      getColumnIndex(column) <=
                        Math.max(
                          getColumnIndex(selectedCell.column),
                          getColumnIndex(rangeEnd.column),
                        );

                    return (
                      <div
                        key={cellId}
                        style={{
                          width: columnWidths[column] ?? DEFAULT_COLUMN_WIDTH,
                          height: rowHeights[rowNumber] ?? DEFAULT_ROW_HEIGHT,
                          backgroundColor: cellStyle.backgroundColor,
                          color: cellStyle.textColor,
                          fontWeight: cellStyle.bold ? 700 : undefined,
                          fontStyle: cellStyle.italic ? "italic" : undefined,
                          textDecoration: cellStyle.underline
                            ? "underline"
                            : undefined,
                          textAlign: cellStyle.align,
                        }}
                        className={
                          isSelected
                            ? "spreadsheet__cell spreadsheet__cell--selected"
                            : isInRange
                              ? "spreadsheet__cell spreadsheet__cell--range"
                              : "spreadsheet__cell"
                        }
                        onClick={(event) =>
                          handleCellClick(rowNumber, column, event.shiftKey)
                        }
                        onContextMenu={(event) => {
                          event.preventDefault();

                          dispatch(
                            setSelectedCell({
                              row: rowNumber,
                              column,
                            }),
                          );

                          setContextMenu({
                            x: event.clientX,
                            y: event.clientY,
                            row: rowNumber,
                            column,
                          });
                        }}
                        onDoubleClick={() => startEditing(rowNumber, column)}
                      >
                        {isEditing ? (
                          <input
                            className="spreadsheet__input"
                            value={inputValue}
                            autoFocus
                            onChange={(event) =>
                              setInputValue(event.target.value)
                            }
                            onBlur={saveCell}
                            onKeyDown={(event) => {
                              if (event.key === "Enter") {
                                saveCell();
                              }

                              if (event.key === "Escape") {
                                cancelEditing();
                              }
                            }}
                          />
                        ) : (
                          formatCellValue(getDisplayValue(cells, cellId), cellStyle)
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>

        {contextMenu && (
          <div
            className="context-menu"
            style={{
              top: contextMenu.y,
              left: contextMenu.x,
            }}
          >
            <button type="button" onClick={addRow}>
              Добавить строку
            </button>

            <button type="button" onClick={deleteRow}>
              Удалить строку
            </button>

            <button type="button" onClick={addColumn}>
              Добавить столбец
            </button>

            <button type="button" onClick={deleteColumn}>
              Удалить столбец
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default Spreadsheet;
