import { useEffect, useState } from "react";
import AboutPage from "./AboutPage";
import { Board } from "./features/board";
import { Provider, useDispatch, useSelector } from "react-redux";
import { BrowserRouter, Link, Navigate, Route, Routes, useNavigate, useSearchParams } from "react-router-dom";
import { store, type RootState, type AppDispatch } from "./store/store";
import { LoginPage } from "./features/auth/LoginPage";
import { SignupPage } from "./features/auth/SignupPage";
import { DashboardPage } from "./features/dashboard/DashboardPage";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { fetchBoardAccess, clearBoardError, fetchLatestBoardSnapshot, clearBoardCanvas } from "./store/boardSlice";
import { useBoardParticipants, type JoinRequest } from "./features/board/useBoardParticipants";
import "./App.css";

function BoardHome() {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { token } = useSelector((state: RootState) => state.auth);
  const { error: boardError, access, role, userId: boardUserId } = useSelector((state: RootState) => state.board);
  const [searchParams] = useSearchParams();

  const [localUserId] = useState<string>(() => {
    const key = "rt-canvas:userId";
    const existing = typeof localStorage !== "undefined" ? localStorage.getItem(key) : null;
    if (existing) return existing;

    const next = typeof crypto !== "undefined" && "randomUUID" in crypto ? (crypto as any).randomUUID() : String(Math.random()).slice(2);
    try {
      localStorage.setItem(key, next);
    } catch {
      // ignore
    }
    return next;
  });

  const socketUserId = boardUserId ?? localUserId;

  const [boardIdInput, setBoardIdInput] = useState<string>("demo");
  const [boardId, setBoardId] = useState<string | null>(null);
  const [showJoin, setShowJoin] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "error" | "success" } | null>(null);
  const [joinRequest, setJoinRequest] = useState<JoinRequest | null>(null);
  const [joinRequestRole, setJoinRequestRole] = useState<"view" | "edit">("view");
  const [joinRequestProcessing, setJoinRequestProcessing] = useState(false);

  // Handle join request from WebSocket
  const handleJoinRequest = (request: JoinRequest) => {
    // Only show if:
    // 1. Current user is the board owner (role === "owner")
    // 2. The request is for the current board we're viewing
    const isOwner = role === "owner";
    const isCurrentBoard = request.boardId === boardId;

    console.log("[JOIN_BOARD_REQUEST] received:", request);
    console.log("[JOIN_BOARD_REQUEST] isOwner:", isOwner, "role:", role);
    console.log("[JOIN_BOARD_REQUEST] isCurrentBoard:", isCurrentBoard, "request.boardId:", request.boardId, "current boardId:", boardId);
    console.log("[JOIN_BOARD_REQUEST] socketUserId:", socketUserId, "ownerId:", request.ownerId);

    if (isOwner && isCurrentBoard) {
      console.log("[JOIN_BOARD_REQUEST] showing request dialog for:", request.userName);
      setJoinRequest(request);
    } else {
      console.log("[JOIN_BOARD_REQUEST] not showing - user is not owner or board mismatch");
    }
  };

  // Grant access to requester
  const grantAccess = async () => {
    if (!joinRequest || !token) return;
    setJoinRequestProcessing(true);
    try {
      const baseUrl = (import.meta as any).env?.VITE_API_URL ?? "http://localhost:80";
      const res = await fetch(
        `${baseUrl}/board/${encodeURIComponent(joinRequest.boardId)}/participant/${encodeURIComponent(joinRequest.requesterId)}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ access: joinRequestRole }),
        }
      );
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || `Failed to grant access (${res.status})`);
      }
      setToast({ message: `Access granted to ${joinRequest.userName}`, type: "success" });
      setJoinRequest(null);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to grant access";
      setToast({ message: message, type: "error" });
    } finally {
      setJoinRequestProcessing(false);
    }
  };

  // Reject join request
  const rejectAccess = () => {
    setJoinRequest(null);
  };

  // Hook for WebSocket participants - must be after all state declarations it depends on
  const { joined, activeParticipants, sendBoardEvent } = useBoardParticipants(boardId, token, socketUserId, handleJoinRequest);

  // Load latest snapshot when entering a board
  useEffect(() => {
    if (!boardId) return;
    dispatch(clearBoardCanvas());
    dispatch(fetchLatestBoardSnapshot(boardId));
  }, [boardId, dispatch]);

  // Show toast when boardError changes
  useEffect(() => {
    if (boardError) {
      setToast({ message: boardError, type: "error" });
      dispatch(clearBoardError());
    }
  }, [boardError, dispatch]);

  useEffect(() => {
    const fromQuery = searchParams.get("board");
    if (!fromQuery) return;
    setBoardIdInput(fromQuery);
    connectToBoard(fromQuery);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const requestBoardAccess = async (boardId: string) => {
    if (!token) return;
    try {
      const baseUrl = (import.meta as any).env?.VITE_API_URL ?? "http://localhost:80";
      const res = await fetch(`${baseUrl}/board/${encodeURIComponent(boardId)}/request-access`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || `Request failed (${res.status})`);
      }
      setToast({ message: "Access request sent to board owner", type: "success" });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to request access";
      setToast({ message: message, type: "error" });
    }
  };

  const connectToBoard = async (nextBoardId: string) => {
    const next = nextBoardId.trim();
    if (!next) return;

    // Check access first if user is logged in (has token)
    if (token) {
      const resultAction = await dispatch(fetchBoardAccess({ boardId: next, token }));
      if (fetchBoardAccess.rejected.match(resultAction)) {
        const errorMsg = (resultAction.payload as string) || "";
        // Check if user is not found in board - request access
        if (errorMsg.includes("User not found in board") || errorMsg.includes("not found in board")) {
          setToast({ message: "Requesting access to board...", type: "success" });
          await requestBoardAccess(next);
          return;
        }
        // Access denied for other reasons - toast already shown via useEffect
        return;
      }
    }

    setBoardId(next);
  };

  const createBoard = () => {
    navigate(token ? "/dashboard" : "/signup");
  };

  // Join request toast JSX - shown in all views when owner
  const joinRequestToast = joinRequest ? (
    <div
      style={{
        position: "fixed",
        bottom: 24,
        right: 24,
        padding: "16px 20px",
        borderRadius: 12,
        background: "#0f172a",
        color: "white",
        boxShadow: "0 4px 20px rgba(0,0,0,0.25)",
        zIndex: 1001,
        display: "flex",
        flexDirection: "column",
        gap: 12,
        minWidth: 280,
        maxWidth: 360,
      }}
    >
      <div style={{ fontWeight: 500, fontSize: 14 }}>
        <span style={{ fontWeight: 700 }}>{joinRequest.userName}</span> has requested to join?
      </div>

      {/* Role selection */}
      <div style={{ display: "flex", gap: 12, fontSize: 13 }}>
        <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
          <input
            type="radio"
            name="accessRole"
            value="view"
            checked={joinRequestRole === "view"}
            onChange={() => setJoinRequestRole("view")}
            style={{ cursor: "pointer" }}
          />
          View only
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
          <input
            type="radio"
            name="accessRole"
            value="edit"
            checked={joinRequestRole === "edit"}
            onChange={() => setJoinRequestRole("edit")}
            style={{ cursor: "pointer" }}
          />
          Can edit
        </label>
      </div>

      {/* Action buttons */}
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <button
          onClick={rejectAccess}
          disabled={joinRequestProcessing}
          style={{
            padding: "6px 12px",
            borderRadius: 6,
            border: "none",
            background: "#374151",
            color: "white",
            cursor: joinRequestProcessing ? "not-allowed" : "pointer",
            fontSize: 13,
            fontWeight: 500,
            opacity: joinRequestProcessing ? 0.6 : 1,
          }}
        >
          Reject
        </button>
        <button
          onClick={grantAccess}
          disabled={joinRequestProcessing}
          style={{
            padding: "6px 12px",
            borderRadius: 6,
            border: "none",
            background: "#16a34a",
            color: "white",
            cursor: joinRequestProcessing ? "not-allowed" : "pointer",
            fontSize: 13,
            fontWeight: 500,
            opacity: joinRequestProcessing ? 0.6 : 1,
          }}
        >
          {joinRequestProcessing ? "Processing..." : "Accept"}
        </button>
      </div>
    </div>
  ) : null;

  // Show loading while waiting for USER_JOINED confirmation
  if (boardId && !joined && token) {
    return (
      <div className="st-page" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
        <div style={{ textAlign: "center" }}>
          <div className="st-spinner" style={{ 
            width: 48, 
            height: 48, 
            border: "4px solid #e5e7eb", 
            borderTop: "4px solid #0f172a",
            borderRadius: "50%",
            animation: "spin 1s linear infinite",
            margin: "0 auto 16px"
          }} />
          <p style={{ color: "#6b7280" }}>Joining board {boardId}...</p>
          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </div>
        {joinRequestToast}
      </div>
    );
  }

  // Once joined, show the board
  if (boardId && joined) {
    const canEdit = access.includes("edit");
    return (
      <>
        <Board
          boardId={boardId}
          userId={socketUserId}
          canEdit={canEdit}
          userRole={role}
          activeParticipants={activeParticipants}
          onEmitEvent={sendBoardEvent}
          onLeave={() => {
            setBoardId(null);
          }}
        />
        {joinRequestToast}
      </>
    );
  }

  return (
    <div className="st-page st-landing">
      <div className="st-landingGlow" aria-hidden="true" />

      <div className="st-navbar">
        <div className="st-shell st-navInner">
          <div className="st-brand">
            <div className="st-brandMark">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M4 6h16M4 12h16M4 18h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
            <span className="st-brandName">RealTimeWhiteBoard</span>
          </div>

          <div className="st-navActions">
            <Link className="st-link" to="/about">
              About
            </Link>
            <Link className="st-link" to="/login">
              Sign In
            </Link>
            <Link className="st-link st-btn st-btnPrimary" to="/signup">
              Get Started
            </Link>
          </div>
        </div>
      </div>

      <div className="st-shell">
        <section className="st-hero">
          <div className="st-heroBadge">Real-time · Multiplayer · Snapshots</div>
          <h1 className="st-heroTitle">
            Draw together on a <span className="st-accent">RealTimeWhiteBoard</span>
          </h1>
          <p className="st-heroSubtitle">
            A shared digital canvas for teams — sketch shapes, freehand strokes, and text with live sync
            across every participant. Join a board in seconds or create your own session.
          </p>

          <div className="st-ctaRow">
            <button className="st-btn st-btnPrimary st-btnLarge" onClick={createBoard}>
              Create Board
            </button>
            <button
              className="st-btn st-btnLarge"
              onClick={() => {
                setShowJoin(true);
              }}
            >
              Join Board
            </button>
          </div>

          {showJoin ? (
            <div className="st-joinPanel">
              <label className="st-joinLabel" htmlFor="board-id-input">
                Board session ID
              </label>
              <div className="st-joinRow">
                <input
                  id="board-id-input"
                  className="st-input"
                  value={boardIdInput}
                  onChange={(e) => setBoardIdInput(e.target.value)}
                  placeholder="Paste or enter board ID"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") connectToBoard(boardIdInput);
                  }}
                />
                <button className="st-btn st-btnPrimary" onClick={() => connectToBoard(boardIdInput)}>
                  Connect
                </button>
              </div>
            </div>
          ) : null}

          <div className="st-heroStats">
            <div className="st-stat">
              <strong>Live sync</strong>
              <span>WebSocket + Kafka events</span>
            </div>
            <div className="st-stat">
              <strong>Snapshots</strong>
              <span>Board state restored on join</span>
            </div>
            <div className="st-stat">
              <strong>Access control</strong>
              <span>Owner, editor & viewer roles</span>
            </div>
          </div>
        </section>

        <section className="st-features">
          <div className="st-card">
            <div className="st-cardIcon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 20h9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <path d="M16.5 3.5a2.1 2.1 0 1 1 3 3L8 18l-4 1 1-4L16.5 3.5Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
              </svg>
            </div>
            <h3 className="st-cardTitle">Interactive Canvas</h3>
            <p className="st-cardBody">Pen, shapes, arrows, and text — everything you need to visualize ideas in real time.</p>
          </div>

          <div className="st-card">
            <div className="st-cardIcon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M16 11c1.66 0 3-1.34 3-3S17.66 5 16 5s-3 1.34-3 3 1.34 3 3 3Z" stroke="currentColor" strokeWidth="2" />
                <path d="M8 11c1.66 0 3-1.34 3-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3Z" stroke="currentColor" strokeWidth="2" />
                <path d="M2 20c0-2.5 3.2-4 6-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <path d="M22 20c0-2.5-3.2-4-6-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
            <h3 className="st-cardTitle">Live Collaboration</h3>
            <p className="st-cardBody">See updates from every participant instantly as they draw and edit the board.</p>
          </div>

          <div className="st-card">
            <div className="st-cardIcon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 8v5l3 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" stroke="currentColor" strokeWidth="2" />
              </svg>
            </div>
            <h3 className="st-cardTitle">Session Snapshots</h3>
            <p className="st-cardBody">Rejoin a board and pick up where you left off — state is persisted automatically.</p>
          </div>

          <div className="st-card">
            <div className="st-cardIcon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 3l7 4v5c0 4.5-3.5 8.5-7 9-3.5-.5-7-4.5-7-9V7l7-4z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
              </svg>
            </div>
            <h3 className="st-cardTitle">Access Control</h3>
            <p className="st-cardBody">Invite collaborators as editors or viewers with owner-managed permissions.</p>
          </div>
        </section>

        <footer className="st-landingFooter">
          <span className="st-footerBrand">RealTimeWhiteBoard</span>
          <span className="st-footerCopy">Microservices whiteboard · React · Kafka · MongoDB</span>
        </footer>

        {/* Toast notification */}
      {toast ? (
        <div
          style={{
            position: "fixed",
            bottom: 24,
            right: 24,
            padding: "12px 16px",
            borderRadius: 8,
            background: toast.type === "error" ? "#dc2626" : "#16a34a",
            color: "white",
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span>{toast.message}</span>
          <button
            onClick={() => setToast(null)}
            style={{
              background: "transparent",
              border: "none",
              color: "white",
              cursor: "pointer",
              fontSize: 18,
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>
      ) : null}

        {joinRequestToast}

      </div>
    </div>
  );
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<BoardHome />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route 
        path="/dashboard" 
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        } 
      />
      <Route path="/about" element={<AboutPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}


export default () => (
  <Provider store={store}>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </Provider>
);
