/**
 * Значения ячеек таблицы.
 *
 * Ключ - адрес ячейки вроде "A1" или "AA15".
 * Значение хранится как исходная строка, включая формулы, которые начинаются с "=".
 */
export type CellData = {
  [cellId: string]: string;
};

/**
 * Визуальное форматирование одной ячейки таблицы.
 *
 * Объект специально частичный: если свойства нет,
 * ячейка использует стандартное оформление.
 */
export type CellStyle = {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  backgroundColor?: string;
  textColor?: string;
  align?: "left" | "center" | "right";
  numberFormat?: "plain" | "percent" | "currency" | "date";
};

/**
 * Карта форматирования всего документа.
 *
 * Ключ - адрес ячейки, значение - форматирование этой ячейки.
 */
export type CellStyles = {
  [cellId: string]: CellStyle;
};

/**
 * Полный документ таблицы, который хранится в localStorage.
 *
 * userId связывает документ с аккаунтом пользователя.
 * cells и cellStyles разделены, чтобы значения и оформление менялись независимо.
 */
export type SpreadsheetDocument = {
  id: string;
  userId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  rowCount: number;
  columnCount: number;
  cells: CellData;
  cellStyles: CellStyles;
};

/**
 * Данные формы, нужные для создания нового пустого документа.
 */
export type CreateDocumentData = {
  title: string;
  rowCount: number;
  columnCount: number;
};

/**
 * Частичный payload для обновления документа.
 *
 * Используется и для переименования, и для сохранения содержимого таблицы.
 */
export type UpdateDocumentData = Partial<
  Pick<
    SpreadsheetDocument,
    "title" | "rowCount" | "columnCount" | "cells" | "cellStyles"
  >
>;

const STORAGE_KEY = "spreadsheet_documents";
const API_DELAY = 150;

/**
 * Имитирует небольшую задержку backend, чтобы async thunks работали как реальные API-запросы.
 */
function delay() {
  return new Promise((resolve) => {
    window.setTimeout(resolve, API_DELAY);
  });
}

/**
 * Читает все документы из localStorage.
 *
 * Битый JSON считается пустым хранилищем, чтобы приложение не падало при запуске.
 */
function readDocuments(): SpreadsheetDocument[] {
  const value = window.localStorage.getItem(STORAGE_KEY);

  if (!value) {
    return [];
  }

  try {
    return JSON.parse(value) as SpreadsheetDocument[];
  } catch {
    return [];
  }
}

/**
 * Записывает полный список документов обратно в localStorage.
 */
function writeDocuments(documents: SpreadsheetDocument[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(documents));
}

/**
 * Создает простой уникальный id для локальных mock-данных.
 */
function createId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

/**
 * Локальный mock API для документов таблицы.
 *
 * Публичные методы специально сделаны async: компоненты и Redux thunks потом можно
 * переключить на настоящий backend без изменения способа вызова.
 */
export const documentService = {
  /**
   * Возвращает документы только выбранного пользователя.
   */
  async getDocuments(userId: string) {
    await delay();

    return readDocuments().filter((document) => document.userId === userId);
  },

  /**
   * Создает пустой документ таблицы для пользователя.
   */
  async createDocument(userId: string, data: CreateDocumentData) {
    await delay();

    const now = new Date().toISOString();
    const document: SpreadsheetDocument = {
      id: createId(),
      userId,
      title: data.title,
      createdAt: now,
      updatedAt: now,
      rowCount: data.rowCount,
      columnCount: data.columnCount,
      cells: {},
      cellStyles: {},
    };

    writeDocuments([document, ...readDocuments()]);

    return document;
  },

  /**
   * Обновляет метаданные, размер, ячейки или стили документа по id.
   */
  async patchDocument(id: string, data: UpdateDocumentData) {
    await delay();

    const documents = readDocuments();
    const documentIndex = documents.findIndex((document) => document.id === id);

    if (documentIndex === -1) {
      throw new Error("Document not found");
    }

    const nextDocument: SpreadsheetDocument = {
      ...documents[documentIndex],
      ...data,
      updatedAt: new Date().toISOString(),
    };

    documents[documentIndex] = nextDocument;
    writeDocuments(documents);

    return nextDocument;
  },

  /**
   * Удаляет документ по id.
   */
  async deleteDocument(id: string) {
    await delay();

    writeDocuments(readDocuments().filter((document) => document.id !== id));
  },

  /**
   * Создает отдельную копию существующего документа со значениями и стилями.
   */
  async duplicateDocument(id: string) {
    await delay();

    const documents = readDocuments();
    const source = documents.find((document) => document.id === id);

    if (!source) {
      throw new Error("Document not found");
    }

    const now = new Date().toISOString();
    const document: SpreadsheetDocument = {
      ...source,
      id: createId(),
      title: `${source.title} копия`,
      createdAt: now,
      updatedAt: now,
      cells: { ...source.cells },
      cellStyles: { ...(source.cellStyles ?? {}) },
    };

    writeDocuments([document, ...documents]);

    return document;
  },
};
