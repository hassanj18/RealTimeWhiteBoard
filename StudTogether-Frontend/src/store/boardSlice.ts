import { createAsyncThunk, createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { BoardEvent } from "../features/board/types";
import {
  snapshotObjectsToEvents,
  type BoardSnapshotResponse,
} from "../features/board/snapshotMapper";

export interface BoardAccessResponse {
  boardId: string;
  boardName: string;
  userId: string;
  userName: string;
  access: ("view" | "edit")[];
  role: "owner" | "participant" | string;
}

interface BoardState {
  events: BoardEvent[];
  past: BoardEvent[][];
  future: BoardEvent[][];
  boardId: string | null;
  boardName: string | null;
  role: string | null;
  access: ("view" | "edit")[];
  userId: string | null;
  userName: string | null;
  loading: boolean;
  snapshotLoading: boolean;
  error: string | null;
}

const initialState: BoardState = {
  events: [],
  past: [],
  future: [],
  boardId: null,
  boardName: null,
  role: null,
  access: [],
  userId: null,
  userName: null,
  loading: false,
  snapshotLoading: false,
  error: null,
};

function pushHistory(state: BoardState) {
  state.past.push(state.events.slice());
  if (state.past.length > 100) state.past.shift();
  state.future = [];
}

const boardSlice = createSlice({
  name: "board",
  initialState,
  reducers: {
    setBoardState(state, action: PayloadAction<BoardEvent[]>) {
      state.events = action.payload;
      state.past = [];
      state.future = [];
    },
    clearBoardCanvas(state) {
      state.events = [];
      state.past = [];
      state.future = [];
    },
    clearBoardError(state) {
      state.error = null;
    },
    resetBoardAccess(state) {
      state.boardId = null;
      state.boardName = null;
      state.role = null;
      state.access = [];
      state.userId = null;
      state.userName = null;
      state.error = null;
    },
    setBoardAccess(state, action: PayloadAction<("view" | "edit")[]>) {
      state.access = action.payload;
    },

    addEvent(state, action: PayloadAction<BoardEvent>) {
      pushHistory(state);
      const event = action.payload;

      if (event.type === "MOVE_OBJECT") {
        for (let i = state.events.length - 1; i >= 0; i--) {
          const e = state.events[i];
          if (e.objectId !== event.objectId) continue;
          if (e.type !== "MOVE_OBJECT") break;

          state.events[i] = event;
          return;
        }

        state.events.push(event);
        return;
      }

      if (event.type === "UPDATE_OBJECT") {
        state.events.push(event);
        return;
      }

      state.events.push(event);
    },

    undo(state) {
      const prev = state.past.pop();
      if (!prev) return;
      state.future.push(state.events.slice());
      state.events = prev.slice();
    },

    redo(state) {
      const next = state.future.pop();
      if (!next) return;
      state.past.push(state.events.slice());
      state.events = next.slice();
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchBoardAccess.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchBoardAccess.fulfilled, (state, action) => {
        state.loading = false;
        state.boardId = action.payload.boardId;
        state.boardName = action.payload.boardName;
        state.userId = action.payload.userId;
        state.userName = action.payload.userName;
        state.role = action.payload.role;
        state.access = action.payload.access;
        state.error = null;
      })
      .addCase(fetchBoardAccess.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string) || "Failed to fetch board access";
      })
      .addCase(fetchLatestBoardSnapshot.pending, (state) => {
        state.snapshotLoading = true;
      })
      .addCase(fetchLatestBoardSnapshot.fulfilled, (state, action) => {
        state.snapshotLoading = false;
        // Only hydrate on initial join — don't wipe live canvas if fetch completes late
        if (state.events.length === 0) {
          state.events = action.payload;
          state.past = [];
          state.future = [];
        }
      })
      .addCase(fetchLatestBoardSnapshot.rejected, (state) => {
        state.snapshotLoading = false;
      });
  },
});

const API_BASE = (import.meta as any).env?.VITE_API_URL ?? "http://localhost:80";
const SNAPSHOT_BASE =
  (import.meta as any).env?.VITE_SNAPSHOT_URL ??
  (import.meta.env.DEV ? "" : API_BASE);

export const fetchLatestBoardSnapshot = createAsyncThunk(
  "board/fetchLatestSnapshot",
  async (boardId: string, { rejectWithValue }) => {
    const url = `${SNAPSHOT_BASE}/snapshots/${encodeURIComponent(boardId)}/latest`;
    try {
      const res = await fetch(url);
      if (res.status === 404) {
        return [] as BoardEvent[];
      }
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        return rejectWithValue(text || `Failed to fetch snapshot (${res.status}) @ ${url}`);
      }

      const data = (await res.json()) as BoardSnapshotResponse;
      const objects = data.objects ?? [];
      return snapshotObjectsToEvents(boardId, objects);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      return rejectWithValue(`Snapshot endpoint unreachable @ ${url}: ${message}`);
    }
  }
);

export const fetchBoardAccess = createAsyncThunk(
  "board/fetchAccess",
  async ({ boardId, token }: { boardId: string; token: string }, { rejectWithValue }) => {
    const url = `${API_BASE}/board/${encodeURIComponent(boardId)}/access`;
    try {
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        return rejectWithValue(text || `Failed to fetch board access (${res.status}) @ ${url}`);
      }

      const data = (await res.json()) as BoardAccessResponse;
      return data;
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      return rejectWithValue(`Board access endpoint unreachable @ ${url}: ${message}`);
    }
  }
);

export const { addEvent, setBoardState, clearBoardCanvas, undo, redo, clearBoardError, resetBoardAccess, setBoardAccess } = boardSlice.actions;

export default boardSlice.reducer;