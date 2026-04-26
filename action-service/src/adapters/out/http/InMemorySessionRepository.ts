import { UserSession } from "../../../core/entities/UserSession";
import { SessionRepositoryPort } from "../../../core/ports/SessionRepositoryPort";

export class InMemorySessionRepository implements SessionRepositoryPort {
  private readonly sessionsByBoardId: Map<string, Set<UserSession>> = new Map();

  async addSession(session: UserSession): Promise<void> {
    const { boardId, socketId, userId } = session;
    console.log(`[SessionRepository] Adding session for user ${userId} with socket ${socketId} to board ${boardId}`);
    
    const set = this.sessionsByBoardId.get(boardId) ?? new Set<UserSession>();
    const previousCount = set.size;

    for (const existing of set) {
      if (existing.socketId === session.socketId) {
        console.log(`[SessionRepository] Removing existing session with socket ${socketId}`);
        set.delete(existing);
        break;
      }
    }

    set.add(session);
    this.sessionsByBoardId.set(boardId, set);
    
    console.log(`[SessionRepository] Session added successfully. Board ${boardId} now has ${set.size} sessions (was ${previousCount})`);
  }

  async removeSession(socketId: string): Promise<void> {
    console.log(`[SessionRepository] Removing session with socket ${socketId}`);
    
    for (const [boardId, set] of this.sessionsByBoardId.entries()) {
      for (const session of set) {
        if (session.socketId === socketId) {
          set.delete(session);
          console.log(`[SessionRepository] Removed session for user ${session.userId} from board ${boardId}`);
          
          if (set.size === 0) {
            this.sessionsByBoardId.delete(boardId);
            console.log(`[SessionRepository] Board ${boardId} now has no sessions, removing from map`);
          }
          return;
        }
      }
    }
    
    console.log(`[SessionRepository] No session found with socket ${socketId}`);
  }

  async getSessionsByBoard(boardId: string): Promise<UserSession[]> {
    const set = this.sessionsByBoardId.get(boardId);
    if (!set) {
      console.log(`[SessionRepository] No sessions found for board ${boardId}`);
      return [];
    }

    const sessions = Array.from(set);
    console.log(`[SessionRepository] Retrieved ${sessions.length} sessions for board ${boardId}`);
    return sessions;
  }
}
