import { UserSession } from "../entities/UserSession";

export interface SessionRepositoryPort {
  addSession(session: UserSession): Promise<void>;
  removeSession(socketId: string): Promise<void>;
  getSessionsByBoard(boardId: string): Promise<UserSession[]>;
}
