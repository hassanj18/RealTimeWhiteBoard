import { WebSocket } from "ws";
import { WebSocketGatewayPort } from "../../../core/ports/WebSocketGatewayPort";

export class WebSocketGateway implements WebSocketGatewayPort {
  private readonly boardSockets: Map<string, Set<WebSocket>> = new Map();

  joinRoom(boardId: string, socket: WebSocket) {
    const set = this.boardSockets.get(boardId) ?? new Set<WebSocket>();
    set.add(socket);
    this.boardSockets.set(boardId, set);
  }

  leaveRoom(boardId: string, socket: WebSocket) {
    const set = this.boardSockets.get(boardId);
    if (!set) return;

    set.delete(socket);
    if (set.size === 0) {
      this.boardSockets.delete(boardId);
    }
  }

  async sendToBoard(boardId: string, message: unknown): Promise<void> {
    console.log(`[WebSocketGateway] Broadcasting to board ${boardId}:`, message);
    
    const set = this.boardSockets.get(boardId);
    if (!set) {
      console.log(`[WebSocketGateway] No sockets found for board ${boardId}`);
      return;
    }

    const serialized = JSON.stringify(message);
    let sentCount = 0;
    let totalCount = 0;
    
    for (const socket of set) {
      totalCount++;
      if (socket.readyState === socket.OPEN) {
        socket.send(serialized);
        sentCount++;
      } else {
        console.log(`[WebSocketGateway] Skipping socket with state ${socket.readyState}`);
      }
    }
    
    console.log(`[WebSocketGateway] Message sent to ${sentCount}/${totalCount} sockets in board ${boardId}`);
  }

  async sendToUser(userId: string, message: unknown): Promise<void> {
    throw new Error("sendToUser is not implemented in this simple in-memory gateway");
  }
}
