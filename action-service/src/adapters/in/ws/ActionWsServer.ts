import { Server as HttpServer } from "http";
import { WebSocketServer } from "ws";

export class ActionWsServer {
  constructor(private readonly server: HttpServer, private readonly path: string) {}

  start() {
    const wss = new WebSocketServer({ server: this.server, path: this.path });

    wss.on("connection", (socket) => {
      socket.send(JSON.stringify({ type: "welcome" }));

      socket.on("message", (raw) => {
        socket.send(raw.toString());
      });
    });

    return wss;
  }
}
