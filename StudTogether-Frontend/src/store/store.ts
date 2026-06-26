import { configureStore } from "@reduxjs/toolkit";
import boardReducer from "./boardSlice.ts";
import authReducer from "../features/auth/authSlice";
import participantsReducer from "./participantsSlice";
import type { AuthState } from "../features/auth/authSlice";

export const store = configureStore({
  reducer: {
    board: boardReducer,
    auth: authReducer as unknown as (state: AuthState | undefined, action: any) => AuthState,
    participants: participantsReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;