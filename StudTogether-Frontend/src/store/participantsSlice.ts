import { createAsyncThunk, createSlice, type PayloadAction } from "@reduxjs/toolkit";

const API_BASE = (import.meta as any).env?.VITE_API_URL ?? "http://localhost:80";

export interface Participant {
  userId: string;
  userName: string;
  access?: "view" | "edit";
}

interface ActiveParticipantsResponse {
  activeParticipants: Participant[];
  totalActive?: number;
  boardId?: string;
  boardName?: string;
}

export interface ParticipantsState {
  activeParticipants: Participant[];
  loading: boolean;
  error: string | null;
  joined: boolean; // true after receiving USER_JOINED confirmation
}

const initialState: ParticipantsState = {
  activeParticipants: [],
  loading: false,
  error: null,
  joined: false,
};

export const fetchActiveParticipants = createAsyncThunk(
  "participants/fetchActive",
  async ({ boardId, token }: { boardId: string; token: string }, { rejectWithValue }) => {
    const res = await fetch(`${API_BASE}/board/${encodeURIComponent(boardId)}/active-participants`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "Failed to fetch participants");
      return rejectWithValue(text);
    }

    const data = (await res.json()) as Participant[] | ActiveParticipantsResponse;
    if (Array.isArray(data)) return data;
    return Array.isArray(data.activeParticipants) ? data.activeParticipants : [];
  }
);

const participantsSlice = createSlice({
  name: "participants",
  initialState,
  reducers: {
    setJoined(state, action: PayloadAction<boolean>) {
      state.joined = action.payload;
    },
    addParticipant(state, action: PayloadAction<Participant>) {
      const exists = state.activeParticipants.find((p) => p.userId === action.payload.userId);
      if (!exists) {
        state.activeParticipants.push(action.payload);
      }
    },
    removeParticipant(state, action: PayloadAction<string>) {
      state.activeParticipants = state.activeParticipants.filter(
        (p) => p.userId !== action.payload
      );
    },
    setParticipantAccess(state, action: PayloadAction<{ userId: string; access: "view" | "edit" }>) {
      const participant = state.activeParticipants.find((p) => p.userId === action.payload.userId);
      if (participant) {
        participant.access = action.payload.access;
      }
    },
    setParticipants(state, action: PayloadAction<Participant[]>) {
      state.activeParticipants = action.payload;
    },
    clearParticipants(state) {
      state.activeParticipants = [];
      state.error = null;
      state.joined = false;
    },
    clearParticipantsError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchActiveParticipants.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchActiveParticipants.fulfilled, (state, action) => {
        state.loading = false;
        state.activeParticipants = action.payload;
        state.error = null;
      })
      .addCase(fetchActiveParticipants.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string) || "Failed to fetch participants";
      });
  },
});

export const {
  setJoined,
  addParticipant,
  removeParticipant,
  setParticipantAccess,
  setParticipants,
  clearParticipants,
  clearParticipantsError,
} = participantsSlice.actions;

export default participantsSlice.reducer;
