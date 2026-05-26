import { createSlice } from "@reduxjs/toolkit";

export type SaveStatus = "saved" | "saving" | "error";

type UiState = {
  isCreateModalOpen: boolean;
  saveStatus: SaveStatus;
};

const initialState: UiState = {
  isCreateModalOpen: false,
  saveStatus: "saved",
};

const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    openCreateModal(state) {
      state.isCreateModalOpen = true;
    },
    closeCreateModal(state) {
      state.isCreateModalOpen = false;
    },
    setSaveStatus(state, action: { payload: SaveStatus }) {
      state.saveStatus = action.payload;
    },
  },
});

export const { closeCreateModal, openCreateModal, setSaveStatus } =
  uiSlice.actions;

export default uiSlice.reducer;
