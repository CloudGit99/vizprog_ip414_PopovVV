import { describe, expect, it } from "vitest";
import authReducer from "./authSlice";

describe("authSlice", () => {
  it("starts without user", () => {
    const state = authReducer(undefined, { type: "test" });

    expect(state.user).toBe(null);
    expect(state.accessToken).toBe(null);
  });
});
