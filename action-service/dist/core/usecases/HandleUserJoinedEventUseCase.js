"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HandleUserJoinedEventUseCase = void 0;
class HandleUserJoinedEventUseCase {
    webSocketGateway;
    constructor(webSocketGateway) {
        this.webSocketGateway = webSocketGateway;
    }
    async execute(event) {
        const { payload } = event;
        console.log(`[HandleUserJoinedEvent] Processing USER_JOINED event for user ${payload.userId} on board ${payload.boardId}`);
        // Broadcast the event to all WebSocket connections on this node for the specific board
        // This ensures all connected clients on this action-service node are notified
        await this.webSocketGateway.sendToBoard(payload.boardId, {
            type: "USER_JOINED",
            payload: {
                userId: payload.userId,
                userName: payload.userName,
                boardId: payload.boardId,
                joinedAt: payload.joinedAt,
            },
        });
        console.log(`[HandleUserJoinedEvent] Broadcasted USER_JOINED event to board ${payload.boardId}`);
    }
}
exports.HandleUserJoinedEventUseCase = HandleUserJoinedEventUseCase;
