export type CellData = {
  [cellId: string]: string;
};

export type SpreadsheetDocument = {
  id: string;
  userId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  rowCount: number;
  columnCount: number;
  cells: CellData;
};

export type CreateDocumentData = {
  title: string;
  rowCount: number;
  columnCount: number;
};

export type UpdateDocumentData = Partial<
  Pick<SpreadsheetDocument, "title" | "rowCount" | "columnCount" | "cells">
>;

const STORAGE_KEY = "spreadsheet_documents";
const API_DELAY = 150;

function delay() {
  return new Promise((resolve) => {
    window.setTimeout(resolve, API_DELAY);
  });
}

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

function writeDocuments(documents: SpreadsheetDocument[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(documents));
}

function createId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export const documentService = {
  async getDocuments(userId: string) {
    await delay();

    return readDocuments().filter((document) => document.userId === userId);
  },

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
    };

    writeDocuments([document, ...readDocuments()]);

    return document;
  },

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

  async deleteDocument(id: string) {
    await delay();

    writeDocuments(readDocuments().filter((document) => document.id !== id));
  },

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
    };

    writeDocuments([document, ...documents]);

    return document;
  },
};
