import { useEffect, useRef, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch, RootState } from "../../store/store";
import { addEvent, setBoardState, setBoardAccess } from "../../store/boardSlice";
import {
  addParticipant,
  removeParticipant,
  setJoined,
  setParticipantAccess,
  clearParticipants,
  fetchActiveParticipants,
} from "../../store/participantsSlice";
import type { BoardEvent } from "./types";

const WS_BASE = (import.meta as any).env?.VITE_WS_URL ?? "ws://localhost:80";

interface WebSocketMessage {
  type: string;
  payload: any;
}

export interface JoinRequest {
  type: "JOIN_BOARD_REQUEST";
  boardId: string;
  ownerId: string;
  requesterId: string;
  userName: string;
}

export function useBoardParticipants(
  boardId: string | null,
  token: string | null,
  userId: string | null,
  onJoinRequest?: (request: JoinRequest) => void
) {
  const dispatch = useDispatch<AppDispatch>();
  const { joined, activeParticipants } = useSelector((state: RootState) => state.participants);
  const wsRef = useRef<WebSocket | null>(null);
  const onJoinRequestRef = useRef(onJoinRequest);

  // Keep ref updated with latest callback without triggering re-connects
  useEffect(() => {
    onJoinRequestRef.current = onJoinRequest;
  }, [onJoinRequest]);

  const sendBoardEvent = useCallback(
    (event: BoardEvent) => {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
      wsRef.current.send(JSON.stringify({ type: "BOARD_EVENT", payload: event }));
    },
    []
  );

  const connect = useCallback(() => {
    if (!boardId || !token || !userId) return;
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    // Clear any existing connection
    if (wsRef.current) {
      wsRef.current.close();
    }

    const wsUrl = `${WS_BASE}/ws?token=${encodeURIComponent(token)}&boardId=${encodeURIComponent(boardId)}&userId=${encodeURIComponent(userId)}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("WebSocket connected");
      // Mark as joined immediately and fetch participants
      dispatch(setJoined(true));
      dispatch(fetchActiveParticipants({ boardId, token }));
    };

    ws.onmessage = (event) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data);
        console.log("WebSocket message received:", message);

        // Handle both uppercase and lowercase message types
        const msgType = message.type?.toUpperCase();

        switch (msgType) {
          case "USER_JOINED":
            dispatch(addParticipant({
              userId: message.payload.userId,
              userName: message.payload.userName,
            }));
            break;

          case "USER_LEFT":
            dispatch(removeParticipant(message.payload.userId));
            break;

          case "BOARD_EVENT": {
            const evt = message.payload as any;
            if (!evt || evt.boardId !== boardId) break;

            if (evt.eventType === "PARTICIPANT_ACCESS_CHANGED") {
              const participantId = evt.participantId ?? evt.payload?.participantId;
              const newAccess = evt.newAccess ?? evt.payload?.newAccess;
              if (typeof participantId === "string" && (newAccess === "view" || newAccess === "edit")) {
                dispatch(setParticipantAccess({ userId: participantId, access: newAccess }));
                if (participantId === userId) {
                  dispatch(setBoardAccess([newAccess]));
                }
              }
              break;
            }

            if (userId && evt.userId === userId) break;
            dispatch(addEvent(evt as BoardEvent));
            break;
          }

          case "BOARD_STATE": {
            const next = message.payload as { boardId?: string; events?: BoardEvent[] };
            if (!next || next.boardId !== boardId || !Array.isArray(next.events)) break;
            dispatch(setBoardState(next.events));
            break;
          }

          case "JOIN_BOARD_REQUEST": {
            const request = message.payload as JoinRequest;
            if (request.boardId === boardId && onJoinRequestRef.current) {
              onJoinRequestRef.current(request);
            }
            break;
          }

          default:
            // Handle other message types if needed
            break;
        }
      } catch (err) {
        console.error("Failed to parse WebSocket message:", err);
      }
    };

    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
    };

    ws.onclose = () => {
      console.log("WebSocket closed unexpectedly");
      wsRef.current = null;
      // Only reset joined when WebSocket closes unexpectedly (not during cleanup)
      dispatch(setJoined(false));
    };
  }, [boardId, token, userId, dispatch]);

  // Cleanup function - just closes socket without resetting state
  const cleanup = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  // Connect when boardId, token, and userId are available
  useEffect(() => {
    if (boardId && token && userId) {
      connect();
    }

    return () => {
      cleanup();
    };
  }, [boardId, token, userId, connect, cleanup]);

  // Manual disconnect (e.g., when leaving board)
  const disconnect = useCallback(() => {
    cleanup();
    dispatch(setJoined(false));
    dispatch(clearParticipants());
  }, [cleanup, dispatch]);

  return {
    joined,
    activeParticipants,
    connect,
    disconnect,
    sendBoardEvent,
  };
}
