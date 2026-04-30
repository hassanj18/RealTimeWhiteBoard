import type { Server as HttpServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import jwt from "jsonwebtoken";
import { URL } from "url";
import { JoinBoardUseCase } from "../../../core/usecases/JoinBoardUseCase";
import { AppError } from "../../../shared/errors/AppError";
import { WebSocketGateway } from "../../out/ws/WebSocketGateway";
import { KafkaProducerPort } from "../../../core/ports/KafkaProducerPort";

export class ActionWebSocketAdapter {
  private wss: WebSocketServer;

  constructor(
    private readonly httpServer: HttpServer,
    private readonly wsPath: string,
    private readonly accessTokenSecret: string,
    private readonly joinBoardUseCase: JoinBoardUseCase,
    private readonly wsGateway: WebSocketGateway,
    private readonly kafkaProducer: KafkaProducerPort
  ) {
    this.wss = new WebSocketServer({ server: httpServer, path: wsPath });
    this.setupHandlers();
  }

  private setupHandlers() {
    this.wss.on("connection", async (socket: WebSocket, req) => {
      console.log(`[WebSocket] New connection request from ${req.socket.remoteAddress}`);
      
      try {
        console.log(`[WebSocket] Extracting token from request...`);
        const token = this.extractToken(req);
        if (!token) {
          console.log(`[WebSocket] No token found in request`);
          throw new AppError("UNAUTHORIZED", "Missing token", 401);
        }
        console.log(`[WebSocket] Token extracted successfully`);

        console.log(`[WebSocket] Verifying JWT token...`);
        const decoded = jwt.verify(token, this.accessTokenSecret) as any;
        if (decoded.type !== "access") {
          console.log(`[WebSocket] Invalid token type: ${decoded.type}`);
          throw new AppError("UNAUTHORIZED", "Invalid token type", 401);
        }

        // Use the same user info extraction as auth middleware
        const userInfo = {
          userId: decoded.sub,
          email: decoded.email,
          name: decoded.name,
        };
        
        console.log(`[WebSocket] Token verified successfully for user: ${userInfo.userId}`);
        console.log(`[WebSocket] User info:`, userInfo);
        const { userId, boardId } = this.extractQueryParams(req);
        if (!userId || !boardId) {
          console.log(`[WebSocket] Missing parameters - userId: ${userId}, boardId: ${boardId}`);
          throw new AppError("BAD_REQUEST", "userId and boardId required", 400);
        }
        console.log(`[WebSocket] Extracted parameters - userId: ${userId}, boardId: ${boardId}`);

        const socketId = crypto.randomUUID();
        console.log(`[WebSocket] Generated socketId: ${socketId}`);

        console.log(`[WebSocket] Calling JoinBoardUseCase.execute()...`);
        const joinResult = await this.joinBoardUseCase.execute({
          userId,
          boardId,
          socketId,
          accessToken: token,
          userName: userInfo.name,
        });
        console.log(`[WebSocket] JoinBoardUseCase completed successfully`);
        
        // Use the user name returned from the board-service (via JoinBoardUseCase)
        const resolvedUserName = joinResult.userName || userInfo.name || 'Unknown User';
        console.log(`[WebSocket] Resolved user name: ${resolvedUserName}`);

        (socket as any).socketId = socketId;
        (socket as any).userId = userId;
        (socket as any).boardId = boardId;
        (socket as any).userName = resolvedUserName;

        // Add socket to the WebSocketGateway's room management
        this.wsGateway.joinRoom(boardId, socket);
        console.log(`[WebSocket] Socket ${socketId} added to board ${boardId} room`);

        console.log(`[WebSocket] Sending USER_JOINED response to client...`);
        socket.send(JSON.stringify({ 
          type: "USER_JOINED", 
          payload: { 
            boardId, 
            userId,
            userName: resolvedUserName
          } 
        }));
        console.log(`[WebSocket] WebSocket connection established successfully for user ${userId} on board ${boardId}`);
      } catch (err: any) {
        console.error(`[WebSocket] Connection error:`, err);
        socket.send(
          JSON.stringify({
            type: "ERROR",
            payload: { message: err.message || "Unauthorized" },
          })
        );
        socket.close(1008, err?.message || "Unauthorized");
      }

      socket.on("close", async () => {
        const socketId = (socket as any).socketId || 'unknown';
        const boardId = (socket as any).boardId;
        const userId = (socket as any).userId;
        const userName = (socket as any).userName;
        console.log(`[WebSocket] Connection closed for socket ${socketId}`);
        
        if (boardId) {
          this.wsGateway.leaveRoom(boardId, socket);
          console.log(`[WebSocket] Socket ${socketId} removed from board ${boardId} room`);
          
          // Publish USER_LEFT event to Kafka
          if (userId && boardId) {
            try {
              await this.kafkaProducer.publish("board.events", {
                type: "USER_LEFT",
                payload: {
                  boardId: boardId,
                  userId: userId,
                  userName: userName || 'Unknown User'
                }
              });
              console.log(`[WebSocket] USER_LEFT event published for user ${userId} on board ${boardId}`);
            } catch (error) {
              console.error(`[WebSocket] Failed to publish USER_LEFT event:`, error);
            }
          }
        }
      });

      socket.on("message", (raw) => {
        const msg = raw.toString();
        console.log(`[WebSocket] Received message from ${(socket as any).socketId || 'unknown'}:`, msg);
        try {
          const parsed = JSON.parse(msg) as { type?: string; payload?: any };
          if (parsed?.type === "BOARD_EVENT") {
            this.kafkaProducer
              .publish("board.events", {
                type: "BOARD_EVENT",
                payload: parsed.payload,
              })
              .catch((error) => {
                console.error("[WebSocket] Failed to publish BOARD_EVENT to Kafka:", error);
              });
            return;
          }
        } catch (_err) {
          // ignore JSON parse errors and fall back to echo
        }

        socket.send(JSON.stringify({ type: "ECHO", payload: msg }));
      });
    });
  }

  private extractToken(req: any): string | null {
    const url = new URL(req.url!, `http://${req.headers.host}`);
    const token = url.searchParams.get("token");
    if (token) return token;

    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith("Bearer ")) {
      return authHeader.slice(7);
    }

    return null;
  }

  private extractQueryParams(req: any): { userId?: string; boardId?: string } {
    const url = new URL(req.url!, `http://${req.headers.host}`);
    return {
      userId: url.searchParams.get("userId") ?? undefined,
      boardId: url.searchParams.get("boardId") ?? undefined,
    };
  }
}
