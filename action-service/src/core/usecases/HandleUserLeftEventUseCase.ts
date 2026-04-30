import { WebSocketGatewayPort } from "../ports/WebSocketGatewayPort";

export type UserLeftEvent = {
  type: "USER_LEFT";
  payload: {
    boardId: string;
    userId: string;
    userName: string;
  };
};

export class HandleUserLeftEventUseCase {
  constructor(private readonly webSocketGateway: WebSocketGatewayPort) {}

  async execute(event: UserLeftEvent): Promise<void> {
    const { payload } = event;
    
    console.log(`[HandleUserLeftEvent] Processing USER_LEFT event for user ${payload.userId} on board ${payload.boardId}`);
    
    // Broadcast the event to all WebSocket connections on this node for the specific board
    // This ensures all connected clients on this action-service node are notified
    await this.webSocketGateway.sendToBoard(payload.boardId, {
      type: "USER_LEFT",
      payload: {
        userId: payload.userId,
        userName: payload.userName,
        boardId: payload.boardId,
      },
    });
    
    console.log(`[HandleUserLeftEvent] Broadcasted USER_LEFT event to board ${payload.boardId}`);
  }
}
