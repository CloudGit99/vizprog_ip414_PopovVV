import { describe, expect, it } from "vitest";
import uiReducer, {
  closeCreateModal,
  openCreateModal,
  setSaveStatus,
} from "./uiSlice";

describe("uiSlice", () => {
  it("controls create modal", () => {
    const openState = uiReducer(undefined, openCreateModal());
    const closedState = uiReducer(openState, closeCreateModal());

    expect(openState.isCreateModalOpen).toBe(true);
    expect(closedState.isCreateModalOpen).toBe(false);
  });

  it("sets save status", () => {
    const state = uiReducer(undefined, setSaveStatus("saving"));

    expect(state.saveStatus).toBe("saving");
  });
});
