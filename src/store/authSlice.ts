import { createSlice } from "@reduxjs/toolkit";

type MockUser = {
  id: string;
  name: string;
  email: string;
};

type AuthState = {
  user: MockUser;
};

const initialState: AuthState = {
  user: {
    id: "mock-user-1",
    name: "Mock User",
    email: "mock@example.com",
  },
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {},
});

export default authSlice.reducer;
