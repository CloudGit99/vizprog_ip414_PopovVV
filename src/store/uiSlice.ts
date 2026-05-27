import { createSlice } from "@reduxjs/toolkit";

/**
 * Визуальный статус сохранения активного документа.
 */
export type SaveStatus = "saved" | "saving" | "error";

/**
 * Небольшое UI-состояние, которое не относится к документам или данным таблицы.
 */
type UiState = {
  isCreateModalOpen: boolean;
  saveStatus: SaveStatus;
};

const initialState: UiState = {
  isCreateModalOpen: false,
  saveStatus: "saved",
};

/**
 * Slice для видимости модалки и статуса сохранения.
 */
const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    /**
     * Показывает модалку создания документа.
     */
    openCreateModal(state) {
      state.isCreateModalOpen = true;
    },
    /**
     * Скрывает модалку создания документа.
     */
    closeCreateModal(state) {
      state.isCreateModalOpen = false;
    },
    /**
     * Меняет индикатор авто-/ручного сохранения.
     */
    setSaveStatus(state, action: { payload: SaveStatus }) {
      state.saveStatus = action.payload;
    },
  },
});

export const { closeCreateModal, openCreateModal, setSaveStatus } =
  uiSlice.actions;

export default uiSlice.reducer;
