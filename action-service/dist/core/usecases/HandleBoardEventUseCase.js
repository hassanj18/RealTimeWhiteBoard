"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HandleBoardEventUseCase = void 0;
class HandleBoardEventUseCase {
    webSocketGateway;
    constructor(webSocketGateway) {
        this.webSocketGateway = webSocketGateway;
    }
    async execute(event) {
        const { payload } = event;
        if (!payload?.boardId) {
            console.warn("[HandleBoardEvent] Missing payload.boardId, skipping broadcast");
            return;
        }
        await this.webSocketGateway.sendToBoard(payload.boardId, event);
    }
}
exports.HandleBoardEventUseCase = HandleBoardEventUseCase;
