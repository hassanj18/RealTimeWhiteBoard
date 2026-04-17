import { RefreshTokenRepository } from "../ports/RefreshTokenRepository";
import { UserRepository } from "../ports/UserRepository";
import { TokenService } from "../ports/TokenService";
import { Clock } from "../ports/Clock";
import { JtiGenerator } from "../ports/JtiGenerator";
import { TokenHasher } from "../ports/TokenHasher";
import { AppError } from "../../shared/errors/AppError";

export type RefreshAccessTokenCommand = {
  rawRefreshToken: string;
  userAgent?: string | null;
  ipAddress?: string | null;
};

export class RefreshAccessToken {
  constructor(
    private readonly refreshTokens: RefreshTokenRepository,
    private readonly users: UserRepository,
    private readonly tokenService: TokenService,
    private readonly clock: Clock,
    private readonly jtiGenerator: JtiGenerator,
    private readonly tokenHasher: TokenHasher,
    private readonly refreshTtlMs: number
  ) {}

  async execute(cmd: RefreshAccessTokenCommand) {
    const payload = this.tokenService.verifyRefreshToken(cmd.rawRefreshToken);
    const currentTokenHash = this.tokenHasher.hash(cmd.rawRefreshToken);

    const stored = await this.refreshTokens.findByJti(payload.jti);
    if (!stored) {
      throw new AppError("INVALID_REFRESH_TOKEN", "Invalid refresh token", 401);
    }

    if (stored.revoked) {
      throw new AppError("REVOKED_REFRESH_TOKEN", "Refresh token revoked", 401);
    }

    if (stored.expiresAt.getTime() <= this.clock.now().getTime()) {
      throw new AppError("EXPIRED_REFRESH_TOKEN", "Refresh token expired", 401);
    }

    if (stored.userId !== payload.sub) {
      throw new AppError("INVALID_REFRESH_TOKEN", "Refresh token subject mismatch", 401);
    }

    if (stored.tokenHash !== currentTokenHash) {
      throw new AppError("INVALID_REFRESH_TOKEN", "Invalid refresh token", 401);
    }

    const user = await this.users.findById(payload.sub);
    if (!user) {
      throw new AppError("UNAUTHORIZED", "User not found", 401);
    }

    const newRefreshJti = this.jtiGenerator.generate();
    const newRefreshTokenRaw = this.tokenService.generateRefreshToken({
      sub: user.id,
      type: "refresh",
      jti: newRefreshJti,
    });
    const newRefreshTokenHash = this.tokenHasher.hash(newRefreshTokenRaw);
    const newRefreshTokenExpiresAt = this.clock.addMs(this.clock.now(), this.refreshTtlMs);

    await this.refreshTokens.revoke(stored.tokenHash, newRefreshTokenHash);

    await this.refreshTokens.create({
      userId: user.id,
      tokenHash: newRefreshTokenHash,
      jti: newRefreshJti,
      expiresAt: newRefreshTokenExpiresAt,
      revoked: false,
      revokedAt: null,
      replacedByTokenHash: null,
      createdAt: this.clock.now(),
      userAgent: cmd.userAgent ?? null,
      ipAddress: cmd.ipAddress ?? null,
    });

    const accessToken = this.tokenService.generateAccessToken({
      sub: user.id,
      email: user.email,
      type: "access",
    });

    return {
      accessToken,
      refreshToken: newRefreshTokenRaw,
    };
  }
}
