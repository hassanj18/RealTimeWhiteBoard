const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

require('dotenv').config();

const authMiddleware = require('./middlewares/authmiddleware');

const MongooseBoardRepository = require('./infrastructure/persistence/MongooseBoardRepository');
const CreateBoard = require('./application/use_cases/CreateBoard');
const GetUserBoards = require('./application/use_cases/GetUserBoards');
const DeleteBoard = require('./application/use_cases/DeleteBoard');
const ChangeParticipantAccess = require('./application/use_cases/ChangeParticipantAccess');
const GetUserAccess = require('./application/use_cases/GetUserAccess');
const GetActiveParticipants = require('./application/use_cases/GetActiveParticipants');
const AddUserToBoard = require('./application/use_cases/AddUserToBoard');
const AddParticipantToBoard = require('./application/use_cases/AddParticipantToBoard');
const RemoveUserFromBoard = require('./application/use_cases/RemoveUserFromBoard');
const RequestBoardAccess = require('./application/use_cases/RequestBoardAccess');
const KafkaConsumer = require('./infrastructure/messaging/KafkaConsumer');
const KafkaProducer = require('./infrastructure/messaging/KafkaProducer');
const { BOARD_INFO_TOPIC } = require('./infrastructure/messaging/kafkaTopics');
const BoardController = require('./adapters/inbound/http/BoardController');

const boardRoutes = require('./routes');

class Application {
    constructor() {
        this.app = express();
        this.setupMiddleware();
        this.setupDatabase();
        this.setupDependencies();
        this.setupRoutes();
    }

    async initialize() {
        await this.setupKafkaConsumer(this.addUserToBoard, this.removeUserFromBoard);
    }

    setupMiddleware() {
        this.app.use(express.json());
        
        // Skip auth for OPTIONS requests (preflight)
        this.app.use((req, res, next) => {
            if (req.method === 'OPTIONS') {
                return next();
            }
            return authMiddleware("change-me-access")(req, res, next);
        });
    }

    setupDatabase() {
        mongoose.connect(process.env.MONGODB_URI)
            .then(() => {
                console.log('MongoDB connected');
            })
            .catch((err) => {
                console.log('MongoDB connection error:', err);
            });
    }

    setupDependencies() {
        const boardRepository = new MongooseBoardRepository();
        
        const kafkaBrokers = process.env.KAFKA_BROKERS || 'kafka:9092';
        const kafkaProducer = new KafkaProducer(kafkaBrokers, 'board-service');
        
        const createBoard = new CreateBoard(boardRepository);
        const getUserBoards = new GetUserBoards(boardRepository);
        const deleteBoard = new DeleteBoard(boardRepository);
        const changeParticipantAccess = new ChangeParticipantAccess(boardRepository, kafkaProducer);
        const getUserAccess = new GetUserAccess(boardRepository);
        const getActiveParticipants = new GetActiveParticipants(boardRepository);
        this.addUserToBoard = new AddUserToBoard(boardRepository);
        this.addParticipantToBoard = new AddParticipantToBoard(boardRepository);
        this.removeUserFromBoard = new RemoveUserFromBoard(boardRepository);
        
        const requestBoardAccess = new RequestBoardAccess(boardRepository, kafkaProducer);
        
        this.boardController = new BoardController(
            createBoard,
            getUserBoards,
            deleteBoard,
            changeParticipantAccess,
            getUserAccess,
            getActiveParticipants,
            requestBoardAccess,
            this.addParticipantToBoard
        );
    }

    setupRoutes() {
        this.app.use("/board", boardRoutes(this.boardController));
        
        this.app.get("/HELLOWORLD", (req, resp) => {
            resp.json({ message: "hello", status: "success" });
        });
    }

    async setupKafkaConsumer(addUserToBoard, removeUserFromBoard) {
        const kafkaBrokers = process.env.KAFKA_BROKERS || 'kafka:9092';
        
        this.kafkaConsumer = new KafkaConsumer(
            kafkaBrokers,
            'board-service',
            'board-service-group'
        );

        // Register handler for USER_JOINED events
        this.kafkaConsumer.registerHandler('USER_JOINED', async (payload) => {
            console.log('[Kafka] Received USER_JOINED event:', payload);
            try {
                await addUserToBoard.execute(payload.boardId, payload.userId, payload.userName);
            } catch (error) {
                console.error('[Kafka] Error processing USER_JOINED event:', error);
            }
        });

        // Register handler for USER_LEFT events
        this.kafkaConsumer.registerHandler('USER_LEFT', async (payload) => {
            console.log('[Kafka] Received USER_LEFT event:', payload);
            try {
                await removeUserFromBoard.execute(payload.boardId, payload.userId, payload.userName);
            } catch (error) {
                console.error('[Kafka] Error processing USER_LEFT event:', error);
            }
        });

        // Connect and start consuming
        await this.kafkaConsumer.connect();
        await this.kafkaConsumer.subscribe([BOARD_INFO_TOPIC]);
        await this.kafkaConsumer.startConsuming();
    }

    async start(port = process.env.PORT || 3029) {
        await this.initialize();
        this.app.listen(port, "0.0.0.0", () => {
            console.log("App listening on port " + port);
        });
    }
}

const application = new Application();
application.start();

module.exports = application;
