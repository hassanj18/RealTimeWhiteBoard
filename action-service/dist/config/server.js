"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const http_1 = __importDefault(require("http"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const env_1 = require("./env");
const errorHandler_1 = require("./errorHandler");
const InMemoryActionRepository_1 = require("../adapters/out/http/InMemoryActionRepository");
const KafkaProducerAdapter_1 = require("../adapters/out/kafka/KafkaProducerAdapter");
const NoopKafkaProducer_1 = require("../adapters/out/kafka/NoopKafkaProducer");
const KafkaActionEventPublisherAdapter_1 = require("../adapters/out/kafka/KafkaActionEventPublisherAdapter");
const NoopActionEventPublisherAdapter_1 = require("../adapters/out/kafka/NoopActionEventPublisherAdapter");
const CreateAction_1 = require("../core/usecases/CreateAction");
const ListActions_1 = require("../core/usecases/ListActions");
const JoinBoardUseCase_1 = require("../core/usecases/JoinBoardUseCase");
const ActionController_1 = require("../adapters/in/http/ActionController");
const routes_1 = require("../adapters/in/http/routes");
const ActionWebSocketAdapter_1 = require("../adapters/in/ws/ActionWebSocketAdapter");
const WebSocketGateway_1 = require("../adapters/out/ws/WebSocketGateway");
const BoardServiceAdapter_1 = require("../adapters/out/http/BoardServiceAdapter");
const InMemorySessionRepository_1 = require("../adapters/out/http/InMemorySessionRepository");
const authMiddleware_1 = require("../adapters/in/http/middleware/authMiddleware");
async function main() {
    const actionsRepo = new InMemoryActionRepository_1.InMemoryActionRepository();
    const kafkaBrokers = env_1.env.KAFKA_BROKERS?.split(",").map((s) => s.trim()).filter(Boolean);
    const kafkaProducer = kafkaBrokers && kafkaBrokers.length > 0
        ? new KafkaProducerAdapter_1.KafkaProducerAdapter(kafkaBrokers, env_1.env.KAFKA_CLIENT_ID)
        : new NoopKafkaProducer_1.NoopKafkaProducer();
    const actionEventPublisher = kafkaBrokers && kafkaBrokers.length > 0
        ? new KafkaActionEventPublisherAdapter_1.KafkaActionEventPublisherAdapter(kafkaProducer)
        : new NoopActionEventPublisherAdapter_1.NoopActionEventPublisherAdapter();
    // Note: Kafka connection is handled lazily in the adapter
    // Service will start even if Kafka is not available
    const createAction = new CreateAction_1.CreateAction(actionsRepo, actionEventPublisher);
    const listActions = new ListActions_1.ListActions(actionsRepo);
    const controller = new ActionController_1.ActionController(createAction, listActions);
    // WebSocket and Board Service dependencies
    const boardServiceBaseUrl = env_1.env.ACTIONS_HTTP_BASE_URL || "http://localhost:3029";
    const boardService = new BoardServiceAdapter_1.BoardServiceAdapter(boardServiceBaseUrl);
    const sessionRepo = new InMemorySessionRepository_1.InMemorySessionRepository();
    const wsGateway = new WebSocketGateway_1.WebSocketGateway();
    const joinBoardUseCase = new JoinBoardUseCase_1.JoinBoardUseCase(boardService, sessionRepo, kafkaProducer, wsGateway);
    const app = (0, express_1.default)();
    app.use((0, cors_1.default)({
        origin: (_origin, cb) => cb(null, true),
        credentials: true,
    }));
    app.use((0, cookie_parser_1.default)());
    app.use(express_1.default.json());
    app.get("/health", (_req, res) => res.json({ status: "ok" }));
    app.use("/actions", (0, authMiddleware_1.authMiddleware)(env_1.env.ACCESS_TOKEN_SECRET), (0, routes_1.buildActionRoutes)(controller));
    app.use(errorHandler_1.errorHandler);
    const server = http_1.default.createServer(app);
    new ActionWebSocketAdapter_1.ActionWebSocketAdapter(server, env_1.env.WS_PATH, env_1.env.ACCESS_TOKEN_SECRET, joinBoardUseCase);
    server.listen(env_1.env.PORT, "0.0.0.0", () => {
        console.log(`Action service listening on port ${env_1.env.PORT}`);
        console.log(`WS path: ${env_1.env.WS_PATH}`);
    });
}
main().catch((err) => {
    console.error(err);
    process.exit(1);
});
