"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const zod_1 = require("zod");
dotenv_1.default.config();
const EnvSchema = zod_1.z.object({
    PORT: zod_1.z.coerce.number().default(3035),
    WS_PATH: zod_1.z.string().default("/ws"),
    ACCESS_TOKEN_SECRET: zod_1.z.string().default("change-me-access"),
    KAFKA_BROKERS: zod_1.z.string().optional(),
    KAFKA_CLIENT_ID: zod_1.z.string().default("action-service"),
    KAFKA_ACTION_TOPIC: zod_1.z.string().default("actions"),
    ACTIONS_HTTP_BASE_URL: zod_1.z.string().optional(),
});
exports.env = EnvSchema.parse(process.env);
