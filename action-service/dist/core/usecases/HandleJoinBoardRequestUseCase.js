"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HandleJoinBoardRequestUseCase = void 0;
class HandleJoinBoardRequestUseCase {
    webSocketGateway;
    constructor(webSocketGateway) {
        this.webSocketGateway = webSocketGateway;
    }
    async execute(event) {
        const { payload } = event;
        console.log(`[HandleJoinBoardRequest] Processing JOIN_BOARD_REQUEST event for board ${payload.boardId}, owner ${payload.ownerId}, requester ${payload.requesterId}`);
        // Send the event to the owner's WebSocket connection for the specific board
        await this.webSocketGateway.sendToUser(payload.boardId, payload.ownerId, {
            type: "JOIN_BOARD_REQUEST",
            payload: {
                ownerId: payload.ownerId,
                boardId: payload.boardId,
                requesterId: payload.requesterId,
                userName: payload.userName,
            },
        });
        console.log(`[HandleJoinBoardRequest] Successfully sent JOIN_BOARD_REQUEST event to owner ${payload.ownerId} for board ${payload.boardId}, requester: ${payload.requesterId} (${payload.userName})`);
    }
}
exports.HandleJoinBoardRequestUseCase = HandleJoinBoardRequestUseCase;
