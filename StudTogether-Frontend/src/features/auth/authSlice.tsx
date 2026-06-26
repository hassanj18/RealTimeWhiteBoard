
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import type { AuthResponse, AuthUser } from "./authApi";
import { login, signup } from "./authApi";

type AuthStatus = "idle" | "loading" | "succeeded" | "failed";

export interface AuthState {
  user: AuthUser | null;
  token: string | null;
  status: AuthStatus;
  error: string | null;
}

const TOKEN_KEY = "auth:token";
const USER_KEY = "auth:user";

function loadInitialState(): Pick<AuthState, "token" | "user"> {
  let token: string | null = null;
  let user: AuthUser | null = null;

  try {
    token = localStorage.getItem(TOKEN_KEY);
  } catch {
    token = null;
  }

  try {
    const raw = localStorage.getItem(USER_KEY);
    user = raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    user = null;
  }

  return { token, user };
}

function persistAuth(payload: AuthResponse) {
  try {
    localStorage.setItem(TOKEN_KEY, payload.token);
  } catch {
    // ignore
  }

  try {
    localStorage.setItem(USER_KEY, JSON.stringify(payload.user));
  } catch {
    // ignore
  }
}

function clearPersistedAuth() {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    // ignore
  }

  try {
    localStorage.removeItem(USER_KEY);
  } catch {
    // ignore
  }
}

export const loginThunk = createAsyncThunk<AuthResponse, { email: string; password: string }>(
  "auth/login",
  async (params) => {
    return await login(params);
  },
);

export const signupThunk = createAsyncThunk<AuthResponse, { name?: string; email: string; password: string }>(
  "auth/signup",
  async (params) => {
    return await signup(params);
  },
);

const initialPersisted = typeof localStorage === "undefined" ? { token: null, user: null } : loadInitialState();

const initialState: AuthState = {
  user: initialPersisted.user,
  token: initialPersisted.token,
  status: "idle",
  error: null,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    logout(state) {
      state.user = null;
      state.token = null;
      state.status = "idle";
      state.error = null;
      clearPersistedAuth();
    },
    clearAuthError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loginThunk.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(loginThunk.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.token = action.payload.token;
        state.user = action.payload.user;
        state.error = null;
        persistAuth(action.payload);
      })
      .addCase(loginThunk.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.error.message ?? "Login failed";
      })
      .addCase(signupThunk.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(signupThunk.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.token = action.payload.token;
        state.user = action.payload.user;
        state.error = null;
        persistAuth(action.payload);
      })
      .addCase(signupThunk.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.error.message ?? "Signup failed";
      });
  },
});

export const { logout, clearAuthError } = authSlice.actions;

export default authSlice.reducer;