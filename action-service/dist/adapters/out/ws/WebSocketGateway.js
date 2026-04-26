"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebSocketGateway = void 0;
class WebSocketGateway {
    boardSockets = new Map();
    joinRoom(boardId, socket) {
        const set = this.boardSockets.get(boardId) ?? new Set();
        set.add(socket);
        this.boardSockets.set(boardId, set);
    }
    leaveRoom(boardId, socket) {
        const set = this.boardSockets.get(boardId);
        if (!set)
            return;
        set.delete(socket);
        if (set.size === 0) {
            this.boardSockets.delete(boardId);
        }
    }
    async sendToBoard(boardId, message) {
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
            }
            else {
                console.log(`[WebSocketGateway] Skipping socket with state ${socket.readyState}`);
            }
        }
        console.log(`[WebSocketGateway] Message sent to ${sentCount}/${totalCount} sockets in board ${boardId}`);
    }
    async sendToUser(userId, message) {
        throw new Error("sendToUser is not implemented in this simple in-memory gateway");
    }
}
exports.WebSocketGateway = WebSocketGateway;
