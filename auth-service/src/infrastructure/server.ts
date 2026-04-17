import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import session from "express-session";

import { env } from "./config/env";
import { connectMongo } from "./config/db";

import { MongoUserRepository } from "../adapters/outbound/persistence/mongodb/repositories/MongoUserRepository";
import { MongoRefreshTokenRepository } from "../adapters/outbound/persistence/mongodb/repositories/MongoRefreshTokenRepository";
import { BcryptPasswordHasher } from "../adapters/outbound/security/BcryptPasswordHasher";
import { JwtTokenService } from "../adapters/outbound/security/JwtTokenService";
import { SystemClock } from "../adapters/outbound/clock/SystemClock";
import { CryptoJtiGenerator } from "../adapters/outbound/security/CryptoJtiGenerator";
import { CryptoSha256TokenHasher } from "../adapters/outbound/security/CryptoSha256TokenHasher";
import { parseTtlToMs } from "../adapters/outbound/security/ttl";

import { SignUp } from "../application/use-cases/SignUp";
import { Login } from "../application/use-cases/Login";
import { Logout } from "../application/use-cases/Logout";
import { VerifyToken } from "../application/use-cases/VerifyToken";
import { RefreshAccessToken } from "../application/use-cases/RefreshAccessToken";

import { AuthController } from "../adapters/inbound/http/controllers/AuthController";
import { buildAuthRoutes } from "../adapters/inbound/http/routes/authRoutes";
import { errorHandler } from "../adapters/inbound/http/middleware/errorHandler";
import { buildCreatureRoutes } from "../adapters/inbound/http/routes/creatureRoutes";

async function main() {
  console.log(`Starting mongo ...${env.MONGODB_URI}`);
  await connectMongo(env.MONGODB_URI);
  console.log("Connected to MongoDB");
  const users = new MongoUserRepository();
  const refreshTokens = new MongoRefreshTokenRepository();
  const passwordHasher = new BcryptPasswordHasher(12);
  const tokenService = new JwtTokenService(
    env.ACCESS_TOKEN_SECRET,
    env.REFRESH_TOKEN_SECRET,
    env.ACCESS_TOKEN_TTL,
    env.REFRESH_TOKEN_TTL
  );
  const clock = new SystemClock();

  const jtiGenerator = new CryptoJtiGenerator();
  const tokenHasher = new CryptoSha256TokenHasher();
  const refreshTtlMs = parseTtlToMs(env.REFRESH_TOKEN_TTL);

  const signUp = new SignUp(
    users,
    refreshTokens,
    passwordHasher,
    tokenService,
    clock,
    jtiGenerator,
    tokenHasher,
    refreshTtlMs
  );
  const login = new Login(
    users,
    refreshTokens,
    passwordHasher,
    tokenService,
    clock,
    jtiGenerator,
    tokenHasher,
    refreshTtlMs
  );
  const logout = new Logout(refreshTokens, tokenHasher);
  const verifyToken = new VerifyToken(tokenService, users);
  const refreshAccessToken = new RefreshAccessToken(
    refreshTokens,
    users,
    tokenService,
    clock,
    jtiGenerator,
    tokenHasher,
    refreshTtlMs
  );

  const controller = new AuthController({
    signUp,
    login,
    logout,
    verifyToken,
    refreshAccessToken,
    accessTokenTtl: env.ACCESS_TOKEN_TTL,
    refreshTokenTtl: env.REFRESH_TOKEN_TTL,
    cookieSecure: env.COOKIE_SECURE,
    cookieSameSite: env.COOKIE_SAMESITE,
  });

  const app = express();
  app.use(
    cors({
      origin: (_origin, cb) => cb(null, true),
      credentials: true,
    })
  );
  app.use(
    session({
      secret: env.SESSION_SECRET,
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        secure: env.COOKIE_SECURE,
        sameSite: env.COOKIE_SAMESITE,
      },
    })
  );
  app.use(cookieParser());
  app.use(express.json());

  app.use("/auth", buildAuthRoutes(controller));
  app.use("/creatures", buildCreatureRoutes(tokenService));
  app.use(errorHandler);
  app.listen(env.PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${env.PORT}`);
  });
}

main().catch((err) => {
  console.error("Startup failed:", err);
  process.exit(1);
});