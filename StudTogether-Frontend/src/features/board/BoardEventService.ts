import { v4 as uuidv4 } from "uuid";
import type { BoardSocket } from "../../shared/realtime/BoardSocket";
import type { BoardEvent, EventType } from "./types";

export class BoardEventService {
  private socket: BoardSocket;
  private boardId: string;
  private userId: string;
  private localEvents: BoardEvent[] = [];

  constructor(socket: BoardSocket, boardId: string, userId: string) {
    this.socket = socket;
    this.boardId = boardId;
    this.userId = userId;
  }

  private emitEvent(event: BoardEvent) {
    console.log("[board:event emitted]", event);
    this.socket.emit("board:event", event);
    this.localEvents.push(event);
  }

  addObject(type: EventType, payload: Record<string, any>): string {
    const event: BoardEvent = {
      boardId: this.boardId,
      objectId: uuidv4(),
      type,
      payload,
      userId: this.userId,
      timestamp: Date.now(),
    };
    this.emitEvent(event);
    return event.objectId;
  }

  moveObject(objectId: string, x: number, y: number) {
    const event: BoardEvent = {
      boardId: this.boardId,
      objectId,
      type: "MOVE_OBJECT",
      payload: { x, y },
      userId: this.userId,
      timestamp: Date.now(),
    };
    this.emitEvent(event);
  }

  editObject(objectId: string, payload: Record<string, any>) {
    const event: BoardEvent = {
      boardId: this.boardId,
      objectId,
      type: "UPDATE_OBJECT",
      payload,
      userId: this.userId,
      timestamp: Date.now(),
    };
    this.emitEvent(event);
  }

  deleteObject(objectId: string) {
    const event: BoardEvent = {
      boardId: this.boardId,
      objectId,
      type: "DELETE_OBJECT",
      payload: {},
      userId: this.userId,
      timestamp: Date.now(),
    };
    this.emitEvent(event);
  }

  getLocalEvents() {
    return [...this.localEvents];
  }
}
