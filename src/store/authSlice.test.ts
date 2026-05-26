import { describe, expect, it } from "vitest";
import authReducer from "./authSlice";

describe("authSlice", () => {
  it("keeps mock user", () => {
    const state = authReducer(undefined, { type: "test" });

    expect(state.user.id).toBe("mock-user-1");
  });
});
