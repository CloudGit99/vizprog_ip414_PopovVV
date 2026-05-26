import { useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import "./Spreadsheet.css";

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

type CellData = {
  [cellId: string]: string;
};

type ContextMenuState = {
  x: number;
  y: number;
  row: number;
  column: string;
} | null;

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

function Spreadsheet() {
  const [selectedCell, setSelectedCell] = useState<CellPosition | null>(null);
  const [rangeEnd, setRangeEnd] = useState<CellPosition | null>(null);
  const [editingCell, setEditingCell] = useState<CellPosition | null>(null);
  const [cells, setCells] = useState<CellData>({});
  const [inputValue, setInputValue] = useState("");
  const [rowCount, setRowCount] = useState(INITIAL_ROW_COUNT);
  const [columnCount, setColumnCount] = useState(INITIAL_COLUMN_COUNT);
  const [contextMenu, setContextMenu] = useState<ContextMenuState>(null);
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});
  const [rowHeights, setRowHeights] = useState<Record<number, number>>({});

  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  const columns = Array.from({ length: columnCount }, (_, index) =>
    getColumnName(index),
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

  const formulaBarValue = selectedCellId ? (cells[selectedCellId] ?? "") : "";

  function startEditing(row: number, column: string) {
    const cellId = getCellId(column, row);

    setEditingCell({
      row,
      column,
    });

    setInputValue(cells[cellId] ?? "");
  }

  function saveCell() {
    if (!editingCell) {
      return;
    }

    const cellId = getCellId(editingCell.column, editingCell.row);

    setCells((previousCells) => ({
      ...previousCells,
      [cellId]: inputValue,
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

    setCells((previousCells) => ({
      ...previousCells,
      [selectedCellId]: value,
    }));
  }

  function moveSelection(rowOffset: number, columnOffset: number) {
    if (!selectedCell) {
      return;
    }

    const currentColumnIndex = getColumnIndex(selectedCell.column);
    const nextRow = selectedCell.row + rowOffset;
    const nextColumnIndex = currentColumnIndex + columnOffset;

    if (
      nextRow < 1 ||
      nextRow > rowCount ||
      nextColumnIndex < 0 ||
      nextColumnIndex >= columnCount
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
    setCells((previousCells) => {
      const nextCells: CellData = {};

      Object.entries(previousCells).forEach(([cellId, value]) => {
        const { column, row } = parseCellId(cellId);

        if (row >= targetRow) {
          nextCells[getCellId(column, row + 1)] = value;
        } else {
          nextCells[cellId] = value;
        }
      });

      return nextCells;
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

    setRowCount((currentRowCount) => currentRowCount + 1);
  }

  function deleteRowAt(targetRow: number) {
    setCells((previousCells) => {
      const nextCells: CellData = {};

      Object.entries(previousCells).forEach(([cellId, value]) => {
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

      return nextCells;
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

    setRowCount((currentRowCount) => Math.max(1, currentRowCount - 1));
  }

  function insertColumnAt(targetColumn: string) {
    const targetColumnIndex = getColumnIndex(targetColumn);

    setCells((previousCells) => {
      const nextCells: CellData = {};

      Object.entries(previousCells).forEach(([cellId, value]) => {
        const { column, row } = parseCellId(cellId);
        const columnIndex = getColumnIndex(column);

        if (columnIndex >= targetColumnIndex) {
          nextCells[getCellId(getColumnName(columnIndex + 1), row)] = value;
        } else {
          nextCells[cellId] = value;
        }
      });

      return nextCells;
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

    setColumnCount((currentColumnCount) => currentColumnCount + 1);
  }

  function deleteColumnAt(targetColumn: string) {
    const targetColumnIndex = getColumnIndex(targetColumn);

    setCells((previousCells) => {
      const nextCells: CellData = {};

      Object.entries(previousCells).forEach(([cellId, value]) => {
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

      return nextCells;
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

    setColumnCount((currentColumnCount) => Math.max(1, currentColumnCount - 1));
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

    if (!targetRow || rowCount <= 1) {
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

    if (!targetColumn || columnCount <= 1) {
      return;
    }

    deleteColumnAt(targetColumn);
    closeContextMenu();
  }

  return (
    <div className="spreadsheet-wrapper" onClick={closeContextMenu}>
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
                          getDisplayValue(cells, cellId)
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
