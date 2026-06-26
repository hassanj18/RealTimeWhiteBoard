import { io } from "socket.io-client";
import type { Socket } from "socket.io-client";
import type { BoardSocket } from "./BoardSocket";

export function createSocket(url: string): BoardSocket {
  const socket: Socket = io(url, {
    transports: ["websocket"],
  });

  return socket as unknown as BoardSocket;
}
