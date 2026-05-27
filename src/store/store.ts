import {
  configureStore,
  createListenerMiddleware,
  isAnyOf,
} from "@reduxjs/toolkit";
import authReducer from "./authSlice";
import documentsReducer, { saveActiveDocument } from "./documentsSlice";
import spreadsheetReducer, {
  deleteColumnAt,
  deleteRowAt,
  insertColumnAt,
  insertRowAt,
  redo,
  replaceSpreadsheet,
  clearCell,
  setCellStyle,
  setCellValue,
  undo,
} from "./spreadsheetSlice";
import uiReducer, { setSaveStatus } from "./uiSlice";

/**
 * Следит за actions, которые меняют таблицу, и сохраняет активный документ с debounce.
 *
 * Компоненты остаются проще: они только отправляют изменения таблицы,
 * а сохранение обрабатывается централизованно.
 */
const autosaveMiddleware = createListenerMiddleware();

autosaveMiddleware.startListening({
  matcher: isAnyOf(
    deleteColumnAt,
    deleteRowAt,
    insertColumnAt,
    insertRowAt,
    redo,
    replaceSpreadsheet,
    clearCell,
    setCellStyle,
    setCellValue,
    undo,
  ),
  effect: async (_, listenerApi) => {
    listenerApi.cancelActiveListeners();
    listenerApi.dispatch(setSaveStatus("saving"));
    await listenerApi.delay(500);
    listenerApi.dispatch(saveActiveDocument());
  },
});

/**
 * Глобальный Redux store всего React-приложения.
 */
export const store = configureStore({
  reducer: {
    auth: authReducer,
    documents: documentsReducer,
    spreadsheet: spreadsheetReducer,
    ui: uiReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().prepend(autosaveMiddleware.middleware),
});

/**
 * Тип всего дерева Redux state.
 */
export type RootState = ReturnType<typeof store.getState>;

/**
 * Тип dispatch с поддержкой thunk.
 */
export type AppDispatch = typeof store.dispatch;
