"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HandleUserLeftEventUseCase = void 0;
class HandleUserLeftEventUseCase {
    webSocketGateway;
    constructor(webSocketGateway) {
        this.webSocketGateway = webSocketGateway;
    }
    async execute(event) {
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
exports.HandleUserLeftEventUseCase = HandleUserLeftEventUseCase;
