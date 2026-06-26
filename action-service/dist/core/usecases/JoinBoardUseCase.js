"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JoinBoardUseCase = void 0;
const AppError_1 = require("../../shared/errors/AppError");
const kafkaTopics_1 = require("../../shared/kafkaTopics");
class JoinBoardUseCase {
    boardService;
    sessionRepo;
    kafka;
    ws;
    constructor(boardService, sessionRepo, kafka, ws) {
        this.boardService = boardService;
        this.sessionRepo = sessionRepo;
        this.kafka = kafka;
        this.ws = ws;
    }
    async execute(cmd) {
        console.log(`[JoinBoardUseCase] Starting board join process for user ${cmd.userId} to board ${cmd.boardId}`);
        console.log(`[JoinBoardUseCase] Checking board access...`);
        const accessResult = await this.boardService.checkAccess(cmd.userId, cmd.boardId, cmd.accessToken);
        console.log(`[JoinBoardUseCase] Board access check result:`, accessResult);
        if (!accessResult.hasAccess) {
            console.log(`[JoinBoardUseCase] Access denied for user ${cmd.userId} to board ${cmd.boardId}`);
            throw new AppError_1.AppError("ACCESS_DENIED", "User does not have access to this board", 403);
        }
        // Use user name from board-service response, fallback to command or 'Unknown User'
        const userName = accessResult.userName || cmd.userName || 'Unknown User';
        console.log(`[JoinBoardUseCase] User name resolved to: ${userName}`);
        console.log(`[JoinBoardUseCase] Creating user session...`);
        const session = {
            userId: cmd.userId,
            boardId: cmd.boardId,
            socketId: cmd.socketId,
            joinedAt: new Date(),
        };
        console.log(`[JoinBoardUseCase] Session created:`, session);
        console.log(`[JoinBoardUseCase] Storing session in repository...`);
        await this.sessionRepo.addSession(session);
        console.log(`[JoinBoardUseCase] Session stored successfully`);
        console.log(`[JoinBoardUseCase] Publishing Kafka event...`);
        await this.kafka.publish((0, kafkaTopics_1.topicForEventType)("USER_JOINED"), {
            type: "USER_JOINED",
            payload: {
                boardId: cmd.boardId,
                userId: cmd.userId,
                userName: userName,
                socketId: cmd.socketId,
                joinedAt: session.joinedAt.toISOString(),
            },
        });
        console.log(`[JoinBoardUseCase] Kafka event published successfully`);
        console.log(`[JoinBoardUseCase] Broadcasting WebSocket event to board ${cmd.boardId}...`);
        await this.ws.sendToBoard(cmd.boardId, {
            type: "USER_JOINED",
            payload: {
                userId: cmd.userId,
                userName: userName,
                boardId: cmd.boardId,
                joinedAt: session.joinedAt.toISOString(),
            },
        });
        console.log(`[JoinBoardUseCase] WebSocket event broadcasted successfully`);
        console.log(`[JoinBoardUseCase] Board join process completed successfully`);
        return { session, userName };
    }
}
exports.JoinBoardUseCase = JoinBoardUseCase;
