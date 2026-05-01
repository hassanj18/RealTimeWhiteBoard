"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebSocketGateway = void 0;
class WebSocketGateway {
    boardSockets = new Map();
    joinRoom(boardId, socket) {
        const userId = socket.userId;
        if (!userId)
            return;
        let boardMap = this.boardSockets.get(boardId);
        if (!boardMap) {
            boardMap = new Map();
            this.boardSockets.set(boardId, boardMap);
        }
        boardMap.set(userId, socket);
    }
    leaveRoom(boardId, socket) {
        const userId = socket.userId;
        if (!userId)
            return;
        const boardMap = this.boardSockets.get(boardId);
        if (!boardMap)
            return;
        boardMap.delete(userId);
        if (boardMap.size === 0) {
            this.boardSockets.delete(boardId);
        }
    }
    async sendToBoard(boardId, message) {
        console.log(`[WebSocketGateway] Broadcasting to board ${boardId}:`, message);
        const boardMap = this.boardSockets.get(boardId);
        if (!boardMap) {
            console.log(`[WebSocketGateway] No sockets found for board ${boardId}`);
            return;
        }
        const serialized = JSON.stringify(message);
        let sentCount = 0;
        let totalCount = 0;
        for (const socket of boardMap.values()) {
            totalCount++;
            if (socket.readyState === socket.OPEN) {
                socket.send(serialized);
                sentCount++;
            }
            else {
                console.log(`[WebSocketGateway] Skipping socket with state ${socket.readyState}`);
            }
        }
        console.log(`[WebSocketGateway] Message sent to ${sentCount}/${totalCount} sockets in board ${boardId}`);
    }
    async sendToUser(boardId, userId, message) {
        console.log(`[WebSocketGateway] Sending to user ${userId} in board ${boardId}:`, message);
        const boardMap = this.boardSockets.get(boardId);
        if (!boardMap) {
            console.log(`[WebSocketGateway] No sockets found for board ${boardId}`);
            return;
        }
        const socket = boardMap.get(userId);
        if (!socket) {
            console.log(`[WebSocketGateway] No socket found for user ${userId} in board ${boardId}`);
            return;
        }
        if (socket.readyState === socket.OPEN) {
            socket.send(JSON.stringify(message));
            console.log(`[WebSocketGateway] Message sent to user ${userId} in board ${boardId}`);
        }
        else {
            console.log(`[WebSocketGateway] Socket for user ${userId} is not open (state: ${socket.readyState})`);
        }
    }
}
exports.WebSocketGateway = WebSocketGateway;
