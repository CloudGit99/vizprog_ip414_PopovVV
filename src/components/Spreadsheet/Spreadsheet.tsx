import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { documentService } from "../../services/documentService";
import type {
  CellData,
  SpreadsheetDocument,
} from "../../services/documentService";
import "./Spreadsheet.css";

const CURRENT_USER_ID = "mock-user-1";
const INITIAL_ROW_COUNT = 1000;
const INITIAL_COLUMN_COUNT = 26;
const DEFAULT_COLUMN_WIDTH = 100;
const DEFAULT_ROW_HEIGHT = 28;
const MIN_COLUMN_WIDTH = 60;
const MIN_ROW_HEIGHT = 24;

type CellPosition = {
  row: number;
  column: string;
};

type ContextMenuState = {
  x: number;
  y: number;
  row: number;
  column: string;
} | null;

type SaveStatus = "saved" | "saving" | "error";

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

function getCellNumberValue(cells: CellData, cellId: string): number {
  const value = cells[cellId];

  if (!value) {
    return 0;
  }

  const numberValue = Number(value);

  return Number.isNaN(numberValue) ? 0 : numberValue;
}

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

function getDisplayValue(cells: CellData, cellId: string): string {
  const value = cells[cellId] ?? "";

  if (value.startsWith("=")) {
    return calculateFormula(cells, value);
  }

  return value;
}

function formatDate(value: string): string {
  return new Date(value).toLocaleString("ru-RU");
}

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

function escapeCsvValue(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replaceAll('"', '""')}"`;
  }

  return value;
}

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

function downloadFile(fileName: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = fileName;
  link.click();

  URL.revokeObjectURL(url);
}

function Spreadsheet() {
  const [documents, setDocuments] = useState<SpreadsheetDocument[]>([]);
  const [activeDocument, setActiveDocument] =
    useState<SpreadsheetDocument | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("Новый документ");
  const [newRowCount, setNewRowCount] = useState(INITIAL_ROW_COUNT);
  const [newColumnCount, setNewColumnCount] = useState(INITIAL_COLUMN_COUNT);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [selectedCell, setSelectedCell] = useState<CellPosition | null>(null);
  const [rangeEnd, setRangeEnd] = useState<CellPosition | null>(null);
  const [editingCell, setEditingCell] = useState<CellPosition | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [contextMenu, setContextMenu] = useState<ContextMenuState>(null);
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});
  const [rowHeights, setRowHeights] = useState<Record<number, number>>({});

  const saveTimerRef = useRef<number | null>(null);
  const changeVersionRef = useRef(0);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  const columns = useMemo(
    () =>
      Array.from({ length: activeDocument?.columnCount ?? 0 }, (_, index) =>
        getColumnName(index),
      ),
    [activeDocument?.columnCount],
  );

  // eslint-disable-next-line react-hooks/incompatible-library
  const rowVirtualizer = useVirtualizer({
    count: activeDocument?.rowCount ?? 0,
    getScrollElement: () => scrollContainerRef.current,
    estimateSize: (index) => rowHeights[index + 1] ?? DEFAULT_ROW_HEIGHT,
    overscan: 10,
  });

  const virtualRows = rowVirtualizer.getVirtualItems();

  const selectedCellId = selectedCell
    ? getCellId(selectedCell.column, selectedCell.row)
    : null;

  const formulaBarValue =
    activeDocument && selectedCellId
      ? (activeDocument.cells[selectedCellId] ?? "")
      : "";

  const saveDocument = useCallback(
    async (force: boolean) => {
      if (!activeDocument || (!hasUnsavedChanges && !force)) {
        return;
      }

      try {
        const savedVersion = changeVersionRef.current;
        setSaveStatus("saving");

        const savedDocument = await documentService.patchDocument(activeDocument.id, {
          title: activeDocument.title,
          rowCount: activeDocument.rowCount,
          columnCount: activeDocument.columnCount,
          cells: activeDocument.cells,
        });

        setDocuments((currentDocuments) =>
          currentDocuments.map((document) =>
            document.id === savedDocument.id ? savedDocument : document,
          ),
        );

        if (changeVersionRef.current === savedVersion) {
          setActiveDocument(savedDocument);
          setHasUnsavedChanges(false);
          setSaveStatus("saved");
        }
      } catch {
        setSaveStatus("error");
      }
    },
    [activeDocument, hasUnsavedChanges],
  );

  async function loadDocuments() {
    const userDocuments = await documentService.getDocuments(CURRENT_USER_ID);

    setDocuments(userDocuments);
  }

  useEffect(() => {
    void loadDocuments();
  }, []);

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
    if (!activeDocument || !hasUnsavedChanges) {
      return;
    }

    setSaveStatus("saving");

    if (saveTimerRef.current) {
      window.clearTimeout(saveTimerRef.current);
    }

    saveTimerRef.current = window.setTimeout(() => {
      void saveDocument(false);
    }, 500);

    return () => {
      if (saveTimerRef.current) {
        window.clearTimeout(saveTimerRef.current);
      }
    };
  }, [activeDocument, hasUnsavedChanges, saveDocument]);

  useEffect(() => {
    function handleShortcut(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        void saveDocument(true);
      }
    }

    window.addEventListener("keydown", handleShortcut);

    return () => window.removeEventListener("keydown", handleShortcut);
  }, [saveDocument]);

  function updateActiveDocument(
    updater: (document: SpreadsheetDocument) => SpreadsheetDocument,
  ) {
    changeVersionRef.current += 1;

    setActiveDocument((currentDocument) => {
      if (!currentDocument) {
        return currentDocument;
      }

      return updater(currentDocument);
    });

    setHasUnsavedChanges(true);
  }

  async function createDocument() {
    const title = newTitle.trim();

    if (!title) {
      return;
    }

    const document = await documentService.createDocument(CURRENT_USER_ID, {
      title,
      rowCount: Math.max(1, newRowCount),
      columnCount: Math.max(1, newColumnCount),
    });

    setDocuments((currentDocuments) => [document, ...currentDocuments]);
    openDocument(document);
    setIsCreateModalOpen(false);
    setNewTitle("Новый документ");
    setNewRowCount(INITIAL_ROW_COUNT);
    setNewColumnCount(INITIAL_COLUMN_COUNT);
  }

  function openDocument(document: SpreadsheetDocument) {
    setActiveDocument(document);
    setSelectedCell(null);
    setRangeEnd(null);
    setEditingCell(null);
    setColumnWidths({});
    setRowHeights({});
    setHasUnsavedChanges(false);
    setSaveStatus("saved");
  }

  async function renameDocument(document: SpreadsheetDocument) {
    const title = window.prompt("Новое название", document.title)?.trim();

    if (!title) {
      return;
    }

    const renamedDocument = await documentService.patchDocument(document.id, {
      title,
    });

    setDocuments((currentDocuments) =>
      currentDocuments.map((currentDocument) =>
        currentDocument.id === renamedDocument.id
          ? renamedDocument
          : currentDocument,
      ),
    );

    if (activeDocument?.id === renamedDocument.id) {
      setActiveDocument(renamedDocument);
    }
  }

  async function deleteDocument(document: SpreadsheetDocument) {
    if (!window.confirm(`Удалить "${document.title}"?`)) {
      return;
    }

    await documentService.deleteDocument(document.id);
    setDocuments((currentDocuments) =>
      currentDocuments.filter((currentDocument) => currentDocument.id !== document.id),
    );

    if (activeDocument?.id === document.id) {
      setActiveDocument(null);
    }
  }

  async function duplicateDocument(document: SpreadsheetDocument) {
    const copy = await documentService.duplicateDocument(document.id);

    setDocuments((currentDocuments) => [copy, ...currentDocuments]);
  }

  function startEditing(row: number, column: string) {
    if (!activeDocument) {
      return;
    }

    const cellId = getCellId(column, row);

    setEditingCell({
      row,
      column,
    });

    setInputValue(activeDocument.cells[cellId] ?? "");
  }

  function saveCell() {
    if (!editingCell) {
      return;
    }

    const cellId = getCellId(editingCell.column, editingCell.row);

    updateActiveDocument((document) => ({
      ...document,
      cells: {
        ...document.cells,
        [cellId]: inputValue,
      },
    }));

    setEditingCell(null);
  }

  function cancelEditing() {
    setEditingCell(null);
  }

  function updateSelectedCellValue(value: string) {
    if (!selectedCellId) {
      return;
    }

    updateActiveDocument((document) => ({
      ...document,
      cells: {
        ...document.cells,
        [selectedCellId]: value,
      },
    }));
  }

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

    setSelectedCell({
      row: nextRow,
      column: getColumnName(nextColumnIndex),
    });
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (editingCell || !selectedCell) {
      return;
    }

    if (event.key === "Enter") {
      startEditing(selectedCell.row, selectedCell.column);
    }

    if (event.key === "Escape") {
      setSelectedCell(null);
      setRangeEnd(null);
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

  function handleCellClick(row: number, column: string, shiftKey: boolean) {
    const nextCell = {
      row,
      column,
    };

    if (shiftKey && selectedCell) {
      setRangeEnd(nextCell);
      return;
    }

    setSelectedCell(nextCell);
    setRangeEnd(null);
  }

  function closeContextMenu() {
    setContextMenu(null);
  }

  function resizeColumn(column: string, width: number) {
    setColumnWidths((previous) => ({
      ...previous,
      [column]: Math.max(MIN_COLUMN_WIDTH, width),
    }));
  }

  function resizeRow(row: number, height: number) {
    setRowHeights((previous) => ({
      ...previous,
      [row]: Math.max(MIN_ROW_HEIGHT, height),
    }));
  }

  function insertRowAt(targetRow: number) {
    updateActiveDocument((document) => {
      const nextCells: CellData = {};

      Object.entries(document.cells).forEach(([cellId, value]) => {
        const { column, row } = parseCellId(cellId);

        if (row >= targetRow) {
          nextCells[getCellId(column, row + 1)] = value;
        } else {
          nextCells[cellId] = value;
        }
      });

      return {
        ...document,
        rowCount: document.rowCount + 1,
        cells: nextCells,
      };
    });

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
  }

  function deleteRowAt(targetRow: number) {
    updateActiveDocument((document) => {
      const nextCells: CellData = {};

      Object.entries(document.cells).forEach(([cellId, value]) => {
        const { column, row } = parseCellId(cellId);

        if (row === targetRow) {
          return;
        }

        if (row > targetRow) {
          nextCells[getCellId(column, row - 1)] = value;
        } else {
          nextCells[cellId] = value;
        }
      });

      return {
        ...document,
        rowCount: Math.max(1, document.rowCount - 1),
        cells: nextCells,
      };
    });

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
  }

  function insertColumnAt(targetColumn: string) {
    const targetColumnIndex = getColumnIndex(targetColumn);

    updateActiveDocument((document) => {
      const nextCells: CellData = {};

      Object.entries(document.cells).forEach(([cellId, value]) => {
        const { column, row } = parseCellId(cellId);
        const columnIndex = getColumnIndex(column);

        if (columnIndex >= targetColumnIndex) {
          nextCells[getCellId(getColumnName(columnIndex + 1), row)] = value;
        } else {
          nextCells[cellId] = value;
        }
      });

      return {
        ...document,
        columnCount: document.columnCount + 1,
        cells: nextCells,
      };
    });

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

  function deleteColumnAt(targetColumn: string) {
    const targetColumnIndex = getColumnIndex(targetColumn);

    updateActiveDocument((document) => {
      const nextCells: CellData = {};

      Object.entries(document.cells).forEach(([cellId, value]) => {
        const { column, row } = parseCellId(cellId);
        const columnIndex = getColumnIndex(column);

        if (columnIndex === targetColumnIndex) {
          return;
        }

        if (columnIndex > targetColumnIndex) {
          nextCells[getCellId(getColumnName(columnIndex - 1), row)] = value;
        } else {
          nextCells[cellId] = value;
        }
      });

      return {
        ...document,
        columnCount: Math.max(1, document.columnCount - 1),
        cells: nextCells,
      };
    });

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

  function addRow() {
    const targetRow = contextMenu?.row ?? selectedCell?.row;

    if (!targetRow) {
      return;
    }

    insertRowAt(targetRow);
    closeContextMenu();
  }

  function deleteRow() {
    const targetRow = contextMenu?.row ?? selectedCell?.row;

    if (!targetRow || !activeDocument || activeDocument.rowCount <= 1) {
      return;
    }

    deleteRowAt(targetRow);
    closeContextMenu();
  }

  function addColumn() {
    const targetColumn = contextMenu?.column ?? selectedCell?.column;

    if (!targetColumn) {
      return;
    }

    insertColumnAt(targetColumn);
    closeContextMenu();
  }

  function deleteColumn() {
    const targetColumn = contextMenu?.column ?? selectedCell?.column;

    if (!targetColumn || !activeDocument || activeDocument.columnCount <= 1) {
      return;
    }

    deleteColumnAt(targetColumn);
    closeContextMenu();
  }

  function exportCsv() {
    if (!activeDocument) {
      return;
    }

    const csv = getRowsFromCells(activeDocument)
      .map((row) => row.map(escapeCsvValue).join(","))
      .join("\n");

    downloadFile(`${activeDocument.title}.csv`, csv, "text/csv;charset=utf-8");
  }

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

  async function importCsv(file: File) {
    const text = await file.text();
    const rows = parseCsv(text);
    const nextCells: CellData = {};

    rows.forEach((row, rowIndex) => {
      row.forEach((value, columnIndex) => {
        nextCells[getCellId(getColumnName(columnIndex), rowIndex + 1)] = value;
      });
    });

    updateActiveDocument((document) => ({
      ...document,
      rowCount: Math.max(1, rows.length),
      columnCount: Math.max(1, Math.max(...rows.map((row) => row.length))),
      cells: nextCells,
    }));
  }

  if (!activeDocument) {
    return (
      <div className="spreadsheet-wrapper">
        <div className="dashboard-header">
          <div>
            <h1>Мои документы</h1>
            <p>Текущий пользователь: {CURRENT_USER_ID}</p>
          </div>

          <button type="button" onClick={() => setIsCreateModalOpen(true)}>
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
                  <button type="button" onClick={() => openDocument(document)}>
                    Открыть
                  </button>
                  <button type="button" onClick={() => renameDocument(document)}>
                    Переименовать
                  </button>
                  <button type="button" onClick={() => duplicateDocument(document)}>
                    Дублировать
                  </button>
                  <button type="button" onClick={() => deleteDocument(document)}>
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
                <button type="button" onClick={createDocument}>
                  Создать
                </button>
                <button type="button" onClick={() => setIsCreateModalOpen(false)}>
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
        <button type="button" onClick={() => setActiveDocument(null)}>
          Назад
        </button>

        <strong>{activeDocument.title}</strong>

        <span>{saveStatus === "saved" && "Сохранено"}</span>
        <span>{saveStatus === "saving" && "Сохранение..."}</span>
        <span>{saveStatus === "error" && "Ошибка сохранения"}</span>

        <button type="button" onClick={() => saveDocument(true)}>
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

      <div ref={scrollContainerRef} className="spreadsheet-scroll">
        <div className="spreadsheet" tabIndex={0} onKeyDown={handleKeyDown}>
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

                          setSelectedCell({
                            row: rowNumber,
                            column,
                          });

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
                          getDisplayValue(activeDocument.cells, cellId)
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
