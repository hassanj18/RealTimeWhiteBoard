import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const EnvSchema = z.object({
  PORT: z.coerce.number().default(3035),
  WS_PATH: z.string().default("/ws"),

  ACCESS_TOKEN_SECRET: z.string().default("change-me-access"),

  KAFKA_BROKERS: z.string().optional(),
  KAFKA_CLIENT_ID: z.string().default("action-service"),
  KAFKA_ACTION_TOPIC: z.string().default("actions"),
  KAFKA_BOARD_ACTIONS_TOPIC: z.string().default("boards.actions"),
  KAFKA_BOARD_INFO_TOPIC: z.string().default("boards.info"),

  ACTIONS_HTTP_BASE_URL: z.string().optional(),
});

export const env = EnvSchema.parse(process.env);
