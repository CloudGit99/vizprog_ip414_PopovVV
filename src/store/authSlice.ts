import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { authService } from "../services/authService";
import type {
  AuthUser,
  LoginData,
  RegisterData,
} from "../services/authService";

/**
 * Redux state для авторизации и данных профиля.
 */
type AuthState = {
  user: AuthUser | null;
  accessToken: string | null;
  status: "idle" | "loading" | "error";
  error: string | null;
};

const initialState: AuthState = {
  user: null,
  accessToken: null,
  status: "idle",
  error: null,
};

/**
 * Восстанавливает сессию пользователя по refresh token из localStorage.
 */
export const restoreSession = createAsyncThunk(
  "auth/restoreSession",
  async () => authService.refresh(),
);

/**
 * Авторизует пользователя по email и паролю.
 */
export const login = createAsyncThunk(
  "auth/login",
  async (data: LoginData) => authService.login(data),
);

/**
 * Регистрирует нового пользователя и сразу запускает сессию.
 */
export const register = createAsyncThunk(
  "auth/register",
  async (data: RegisterData) => authService.register(data),
);

/**
 * Завершает текущую сессию.
 */
export const logout = createAsyncThunk("auth/logout", async () => {
  authService.logout();
});

/**
 * Обновляет отображаемое имя текущего пользователя.
 */
export const updateProfileName = createAsyncThunk(
  "auth/updateProfileName",
  async (name: string, { getState }) => {
    const state = getState() as { auth: AuthState };

    if (!state.auth.user) {
      throw new Error("Unauthorized");
    }

    return authService.updateName(state.auth.user.id, name);
  },
);

/**
 * Меняет пароль текущего пользователя после проверки старого пароля.
 */
export const changePassword = createAsyncThunk(
  "auth/changePassword",
  async (data: { oldPassword: string; newPassword: string }, { getState }) => {
    const state = getState() as { auth: AuthState };

    if (!state.auth.user) {
      throw new Error("Unauthorized");
    }

    await authService.changePassword(
      state.auth.user.id,
      data.oldPassword,
      data.newPassword,
    );
  },
);

/**
 * Slice, который хранит текущего пользователя, access token и ошибку авторизации.
 */
const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    /**
     * Очищает видимое сообщение об ошибке авторизации/профиля.
     */
    clearAuthError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(restoreSession.pending, (state) => {
        state.status = "loading";
      })
      .addCase(restoreSession.fulfilled, (state, action) => {
        state.status = "idle";
        state.user = action.payload?.user ?? null;
        state.accessToken = action.payload?.accessToken ?? null;
      })
      .addCase(restoreSession.rejected, (state) => {
        state.status = "idle";
      })
      .addCase(login.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.status = "idle";
        state.user = action.payload.user;
        state.accessToken = action.payload.accessToken;
      })
      .addCase(login.rejected, (state, action) => {
        state.status = "error";
        state.error = action.error.message ?? "Ошибка входа";
      })
      .addCase(register.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(register.fulfilled, (state, action) => {
        state.status = "idle";
        state.user = action.payload.user;
        state.accessToken = action.payload.accessToken;
      })
      .addCase(register.rejected, (state, action) => {
        state.status = "error";
        state.error = action.error.message ?? "Ошибка регистрации";
      })
      .addCase(logout.fulfilled, (state) => {
        state.user = null;
        state.accessToken = null;
        state.status = "idle";
        state.error = null;
      })
      .addCase(updateProfileName.fulfilled, (state, action) => {
        state.user = action.payload;
      })
      .addCase(changePassword.rejected, (state, action) => {
        state.error = action.error.message ?? "Ошибка смены пароля";
      });
  },
});

export const { clearAuthError } = authSlice.actions;

export default authSlice.reducer;
