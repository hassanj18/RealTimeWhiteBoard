import { useEffect, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import type { RootState } from "../../store/store";
import { logout } from "../auth/authSlice";
import "./DashboardPage.css";

function getApiBaseUrl() {
  return (import.meta as any).env?.VITE_API_URL ?? "http://localhost:3027";
}

interface Board {
  id: string;
  name: string;
  description: string;
  owner: string;
  participants: Array<{ userId: string; access: string; _id: string }>;
  activeParticipants: any[];
  createdAt: string;
  updatedAt: string;
}

export function DashboardPage() {
  const { user, token } = useSelector((state: RootState) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createDescription, setCreateDescription] = useState("");
  const [createStatus, setCreateStatus] = useState<"idle" | "loading" | "error">("idle");
  const [createError, setCreateError] = useState<string | null>(null);
  const [boards, setBoards] = useState<Board[]>([]);
  const [boardsLoading, setBoardsLoading] = useState(true);
  const [boardsError, setBoardsError] = useState<string | null>(null);
  const [joinOpen, setJoinOpen] = useState(false);
  const [joinBoardId, setJoinBoardId] = useState("");
  const [joinBoardName, setJoinBoardName] = useState<string | null>(null);
  const [joinStatus, setJoinStatus] = useState<"idle" | "loading" | "error">("idle");
  const [joinError, setJoinError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      navigate("/login");
    }
  }, [user, navigate]);

  useEffect(() => {
    const fetchUserBoards = async () => {
      if (!token) return;
      setBoardsLoading(true);
      setBoardsError(null);
      try {
        const baseUrl = getApiBaseUrl();
        const res = await fetch(`${baseUrl}/board/user-boards`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (!res.ok) {
          const text = await res.text().catch(() => "");
          throw new Error(text || `Failed to fetch boards (${res.status})`);
        }
        const data = (await res.json()) as Board[];
        setBoards(data);
      } catch (e) {
        const message = e instanceof Error ? e.message : "Failed to fetch boards";
        setBoardsError(message);
      } finally {
        setBoardsLoading(false);
      }
    };
    fetchUserBoards();
  }, [token]);

  const handleCreateBoard = () => {
    setCreateError(null);
    setCreateStatus("idle");
    setCreateName("");
    setCreateDescription("");
    setCreateOpen(true);
  };

  const submitCreateBoard = async () => {
    if (!token) {
      navigate("/login");
      return;
    }

    const name = createName.trim();
    const description = createDescription.trim();

    if (!name) {
      setCreateError("Board name is required");
      setCreateStatus("error");
      return;
    }

    setCreateStatus("loading");
    setCreateError(null);

    try {
      const baseUrl = getApiBaseUrl();
      const res = await fetch(`${baseUrl}/board/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name, description }),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || `Request failed (${res.status})`);
      }

      const json: any = await res.json();
      const nextBoardId =
        json?.data?.id ??
        json?.data?.board?.id ??
        json?.board?.id ??
        json?.id;

      if (!nextBoardId) {
        throw new Error("Board created but no board id returned");
      }

      setCreateOpen(false);
      navigate(`/?board=${nextBoardId}`);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to create board";
      setCreateError(message);
      setCreateStatus("error");
    }
  };

  const handleJoinBoard = (boardId: string) => {
    navigate(`/?board=${boardId}`);
  };

  const handleJoinBoardSubmit = async () => {
    if (!joinBoardId.trim() || !token) return;
    
    setJoinStatus("loading");
    setJoinError(null);
    
    try {
      // First fetch board details to get the name
      const baseUrl = getApiBaseUrl();
      const res = await fetch(`${baseUrl}/board/${joinBoardId.trim()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      if (!res.ok) {
        if (res.status === 404) {
          throw new Error("Board not found");
        }
        const text = await res.text().catch(() => "");
        throw new Error(text || `Failed to fetch board (${res.status})`);
      }
      
      // Navigate to the board with the given ID
      navigate(`/?board=${joinBoardId.trim()}`);
      setJoinOpen(false);
      setJoinBoardId("");
      setJoinBoardName(null);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to join board";
      setJoinError(message);
      setJoinStatus("error");
    }
  };
  
  const handleBoardIdChange = async (value: string) => {
    setJoinBoardId(value);
    setJoinBoardName(null);
    
    if (value.trim().length >= 3 && token) {
      try {
        const baseUrl = getApiBaseUrl();
        const res = await fetch(`${baseUrl}/board/${value.trim()}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        
        if (res.ok) {
          const boardData = await res.json();
          const boardName = boardData.name || boardData.data?.name;
          if (boardName) {
            setJoinBoardName(boardName);
          }
        }
      } catch {
        // Ignore errors while typing
      }
    }
  };

  const handleSignOut = () => {
    dispatch(logout());
    navigate("/login");
  };

  if (!user) {
    return null;
  }

  return (
    <div className="st-dashboard">
      <header className="st-dashboard-header">
        <div className="st-dashboard-header-left">
          <h1 className="st-dashboard-title">My Boards</h1>
        </div>
        <div className="st-dashboard-header-right">
          <div className="st-user-info">
            <img 
              src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.name}`}
              alt={user.name}
              className="st-user-avatar"
            />
            <span className="st-user-name">{user.name}</span>
          </div>
          <button className="st-join-board-btn" onClick={() => setJoinOpen(true)}>
            Join Board
          </button>
          <button className="st-sign-out-btn" onClick={handleSignOut}>
            Sign Out
          </button>
        </div>
      </header>

      <main className="st-dashboard-main">
        <div className="st-boards-section">
          <div className="st-boards-header">
            <h2>Your Boards</h2>
            <button className="st-create-board-btn" onClick={handleCreateBoard}>
              + Create Board
            </button>
          </div>
          
          <div className="st-boards-grid">
            {boardsLoading ? (
              <div className="st-boards-loading">Loading boards...</div>
            ) : boardsError ? (
              <div className="st-boards-error">{boardsError}</div>
            ) : boards.length === 0 ? (
              <div className="st-boards-empty">No boards yet. Create one to get started!</div>
            ) : (
              boards.map((board) => (
                <div
                  key={board.id}
                  className="st-board-card"
                  onClick={() => handleJoinBoard(board.id)}
                >
                  <div className="st-board-thumbnail">
                    <div className="st-board-placeholder">📋</div>
                  </div>
                  <div className="st-board-info">
                    <h3 className="st-board-name">{board.name}</h3>
                    <p className="st-board-description">{board.description}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>

      {joinOpen ? (
        <div className="st-modalOverlay" onMouseDown={() => setJoinOpen(false)}>
          <div className="st-modal" onMouseDown={(e) => e.stopPropagation()}>
            <div className="st-modalHeader">
              <h3 className="st-modalTitle">Join Board</h3>
              <button className="st-modalClose" onClick={() => setJoinOpen(false)} aria-label="Close">
                ×
              </button>
            </div>

            <div className="st-modalBody">
              <label className="st-modalLabel">
                <div>Board ID</div>
                <input
                  className="st-modalInput"
                  value={joinBoardId}
                  onChange={(e) => handleBoardIdChange(e.target.value)}
                  placeholder="Enter board ID"
                  autoFocus
                />
                {joinBoardName && (
                  <div className="st-board-name-preview">
                    Board: {joinBoardName}
                  </div>
                )}
              </label>

              {joinError ? <div className="st-modalError">{joinError}</div> : null}
            </div>

            <div className="st-modalFooter">
              <button className="st-btn st-btnSecondary" onClick={() => setJoinOpen(false)} disabled={joinStatus === "loading"}>
                Cancel
              </button>
              <button className="st-btn st-btnPrimary" onClick={handleJoinBoardSubmit} disabled={joinStatus === "loading" || !joinBoardId.trim()}>
                {joinStatus === "loading" ? "Joining..." : "Join"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {createOpen ? (
        <div className="st-modalOverlay" onMouseDown={() => setCreateOpen(false)}>
          <div className="st-modal" onMouseDown={(e) => e.stopPropagation()}>
            <div className="st-modalHeader">
              <h3 className="st-modalTitle">Create board</h3>
              <button className="st-modalClose" onClick={() => setCreateOpen(false)} aria-label="Close">
                ×
              </button>
            </div>

            <div className="st-modalBody">
              <label className="st-modalLabel">
                <div>Name</div>
                <input
                  className="st-modalInput"
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  placeholder="e.g. Sprint planning"
                  autoFocus
                />
              </label>

              <label className="st-modalLabel">
                <div>Description</div>
                <textarea
                  className="st-modalTextarea"
                  value={createDescription}
                  onChange={(e) => setCreateDescription(e.target.value)}
                  placeholder="Optional"
                  rows={4}
                />
              </label>

              {createError ? <div className="st-modalError">{createError}</div> : null}
            </div>

            <div className="st-modalFooter">
              <button className="st-btn st-btnSecondary" onClick={() => setCreateOpen(false)} disabled={createStatus === "loading"}>
                Cancel
              </button>
              <button className="st-btn st-btnPrimary" onClick={submitCreateBoard} disabled={createStatus === "loading"}>
                {createStatus === "loading" ? "Creating..." : "Create"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
