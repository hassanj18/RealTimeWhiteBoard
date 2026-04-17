import jwt, { type SignOptions } from "jsonwebtoken";
import {
  AccessTokenPayload,
  RefreshTokenPayload,
  TokenService,
} from "../../../application/ports/TokenService";
import { AppError } from "../../../shared/errors/AppError";

export class JwtTokenService implements TokenService {
  constructor(
    private readonly accessSecret: string,
    private readonly refreshSecret: string,
    private readonly accessTtl: string,
    private readonly refreshTtl: string
  ) {}

  generateAccessToken(payload: AccessTokenPayload): string {
    const expiresIn = this.accessTtl as SignOptions["expiresIn"];
    return jwt.sign(payload, this.accessSecret, { expiresIn });
  }

  generateRefreshToken(payload: RefreshTokenPayload): string {
    const expiresIn = this.refreshTtl as SignOptions["expiresIn"];
    return jwt.sign(payload, this.refreshSecret, { expiresIn });
  }

  verifyAccessToken(token: string): AccessTokenPayload {
    try {
      const decoded = jwt.verify(token, this.accessSecret) as AccessTokenPayload;
      if (decoded.type !== "access") {
        throw new AppError("UNAUTHORIZED", "Invalid token type", 401);
      }
      return decoded;
    } catch {
      throw new AppError("UNAUTHORIZED", "Invalid or expired access token", 401);
    }
  }

  verifyRefreshToken(token: string): RefreshTokenPayload {
    try {
      const decoded = jwt.verify(token, this.refreshSecret) as RefreshTokenPayload;
      if (decoded.type !== "refresh") {
        throw new AppError("INVALID_REFRESH_TOKEN", "Invalid token type", 401);
      }
      if (!decoded.jti) {
        throw new AppError("INVALID_REFRESH_TOKEN", "Missing jti", 401);
      }
      return decoded;
    } catch {
      throw new AppError("INVALID_REFRESH_TOKEN", "Invalid or expired refresh token", 401);
    }
  }
}
