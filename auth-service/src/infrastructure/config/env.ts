import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const EnvSchema = z.object({
  PORT: z.coerce.number().default(3001),
  MONGODB_URI: z.string().min(1),
  SESSION_SECRET: z.string().min(16).default("dev-session-secret-please-change"),
  ACCESS_TOKEN_SECRET: z.string().min(16),
  REFRESH_TOKEN_SECRET: z.string().min(16),
  ACCESS_TOKEN_TTL: z.string().default("60m"),
  REFRESH_TOKEN_TTL: z.string().default("7d"),
  COOKIE_SECURE: z.preprocess(
    (v: unknown) => (typeof v === "string" ? v === "true" : v),
    z.boolean().default(false)
  ),
  COOKIE_SAMESITE: z.enum(["strict", "lax", "none"]).default("strict"),
  CORS_ORIGIN: z.string().min(1).default("http://localhost:3000"),
});

export type Env = z.infer<typeof EnvSchema>;

export const env: Env = EnvSchema.parse(process.env);
