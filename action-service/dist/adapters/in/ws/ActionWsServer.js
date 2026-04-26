"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ActionWsServer = void 0;
const ws_1 = require("ws");
class ActionWsServer {
    server;
    path;
    constructor(server, path) {
        this.server = server;
        this.path = path;
    }
    start() {
        const wss = new ws_1.WebSocketServer({ server: this.server, path: this.path });
        wss.on("connection", (socket) => {
            socket.send(JSON.stringify({ type: "welcome" }));
            socket.on("message", (raw) => {
                socket.send(raw.toString());
            });
        });
        return wss;
    }
}
exports.ActionWsServer = ActionWsServer;
