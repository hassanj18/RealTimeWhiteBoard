import express from "express";
import cors from "cors";
import http from "http";
import cookieParser from "cookie-parser";

import { env } from "./env";
import { errorHandler } from "./errorHandler";

import { InMemoryActionRepository } from "../adapters/out/http/InMemoryActionRepository";
import { KafkaProducerAdapter } from "../adapters/out/kafka/KafkaProducerAdapter";
import { NoopKafkaProducer } from "../adapters/out/kafka/NoopKafkaProducer";
import { KafkaActionEventPublisherAdapter } from "../adapters/out/kafka/KafkaActionEventPublisherAdapter";
import { NoopActionEventPublisherAdapter } from "../adapters/out/kafka/NoopActionEventPublisherAdapter";
import { KafkaConsumerAdapter } from "../adapters/out/kafka/KafkaConsumerAdapter";

import { CreateAction } from "../core/usecases/CreateAction";
import { ListActions } from "../core/usecases/ListActions";
import { JoinBoardUseCase } from "../core/usecases/JoinBoardUseCase";
import { HandleUserJoinedEventUseCase } from "../core/usecases/HandleUserJoinedEventUseCase";
import { HandleUserLeftEventUseCase } from "../core/usecases/HandleUserLeftEventUseCase";
import { HandleBoardEventUseCase } from "../core/usecases/HandleBoardEventUseCase";

import { ActionController } from "../adapters/in/http/ActionController";
import { buildActionRoutes } from "../adapters/in/http/routes";
import { ActionWebSocketAdapter } from "../adapters/in/ws/ActionWebSocketAdapter";
import { WebSocketGateway } from "../adapters/out/ws/WebSocketGateway";
import { BoardServiceAdapter } from "../adapters/out/http/BoardServiceAdapter";
import { InMemorySessionRepository } from "../adapters/out/http/InMemorySessionRepository";
import { authMiddleware } from "../adapters/in/http/middleware/authMiddleware";

async function main() {
  const actionsRepo = new InMemoryActionRepository();

  const kafkaBrokers = env.KAFKA_BROKERS?.split(",").map((s) => s.trim()).filter(Boolean);

  const kafkaProducer = kafkaBrokers && kafkaBrokers.length > 0
    ? new KafkaProducerAdapter(kafkaBrokers, env.KAFKA_CLIENT_ID)
    : new NoopKafkaProducer();

  const actionEventPublisher = kafkaBrokers && kafkaBrokers.length > 0
    ? new KafkaActionEventPublisherAdapter(kafkaProducer)
    : new NoopActionEventPublisherAdapter();

  // Note: Kafka connection is handled lazily in the adapter
  // Service will start even if Kafka is not available

  const createAction = new CreateAction(actionsRepo, actionEventPublisher);
  const listActions = new ListActions(actionsRepo);

  const controller = new ActionController(createAction, listActions);

  // WebSocket and Board Service dependencies
  const boardServiceBaseUrl = env.ACTIONS_HTTP_BASE_URL || "http://localhost:3029";
  const boardService = new BoardServiceAdapter(boardServiceBaseUrl);
  const sessionRepo = new InMemorySessionRepository();
  const wsGateway = new WebSocketGateway();
  
  const joinBoardUseCase = new JoinBoardUseCase(
    boardService,
    sessionRepo,
    kafkaProducer,
    wsGateway
  );

  // Setup Kafka consumer for USER_JOINED and USER_LEFT events (for horizontal scaling)
  const handleUserJoinedEvent = new HandleUserJoinedEventUseCase(wsGateway);
  const handleUserLeftEvent = new HandleUserLeftEventUseCase(wsGateway);
  const handleBoardEvent = new HandleBoardEventUseCase(wsGateway);
  
  if (kafkaBrokers && kafkaBrokers.length > 0) {
    const kafkaConsumer = new KafkaConsumerAdapter(
      kafkaBrokers,
      env.KAFKA_CLIENT_ID + "-consumer",
      env.KAFKA_CLIENT_ID + "-consumer"
    );
    
    try {
      await kafkaConsumer.connect();
      await kafkaConsumer.subscribe("board.events");
      
      kafkaConsumer.onMessage(async (message: unknown) => {
        const event = message as { type: string; payload: unknown };
        if (event.type === "USER_JOINED") {
          await handleUserJoinedEvent.execute(event as any);
        } else if (event.type === "USER_LEFT") {
          await handleUserLeftEvent.execute(event as any);
        } else if (event.type === "BOARD_EVENT") {
          await handleBoardEvent.execute(event as any);
        }
      });
      
      await kafkaConsumer.start();
      console.log("[KafkaConsumer] Started consuming USER_JOINED, USER_LEFT, and BOARD_EVENT events");
    } catch (error) {
      console.warn("[KafkaConsumer] Failed to setup Kafka consumer:", error);
      // Service continues to work even if consumer setup fails
    }
  }

  const app = express();
  app.use(
    cors({
      origin: (_origin, cb) => cb(null, true),
      credentials: true,
    })
  );
  app.use(cookieParser());
  app.use(express.json());

  app.get("/health", (_req, res) => res.json({ status: "ok" }));
  app.use("/actions", authMiddleware(env.ACCESS_TOKEN_SECRET), buildActionRoutes(controller));
  app.use(errorHandler);

  const server = http.createServer(app);
  new ActionWebSocketAdapter(server, env.WS_PATH, env.ACCESS_TOKEN_SECRET, joinBoardUseCase, wsGateway, kafkaProducer);

  server.listen(env.PORT, "0.0.0.0", () => {
    console.log(`Action service listening on port ${env.PORT}`);
    console.log(`WS path: ${env.WS_PATH}`);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
