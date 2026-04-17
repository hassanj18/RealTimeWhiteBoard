import { UserRepository } from "../ports/UserRepository";
import { RefreshTokenRepository } from "../ports/RefreshTokenRepository";
import { PasswordHasher } from "../ports/PasswordHasher";
import { TokenService } from "../ports/TokenService";
import { Clock } from "../ports/Clock";
import { JtiGenerator } from "../ports/JtiGenerator";
import { TokenHasher } from "../ports/TokenHasher";
import { AppError } from "../../shared/errors/AppError";

export type SignUpCommand = {
  email: string;
  password: string;
  name: string;
  userAgent?: string | null;
  ipAddress?: string | null;
};

export class SignUp {
  constructor(
    private readonly users: UserRepository,
    private readonly refreshTokens: RefreshTokenRepository,
    private readonly passwordHasher: PasswordHasher,
    private readonly tokenService: TokenService,
    private readonly clock: Clock,
    private readonly jtiGenerator: JtiGenerator,
    private readonly tokenHasher: TokenHasher,
    private readonly refreshTtlMs: number
  ) {}

  async execute(cmd: SignUpCommand) {
    const email = cmd.email.toLowerCase().trim();

    const existing = await this.users.findByEmail(email);
    if (existing) {
      throw new AppError("EMAIL_ALREADY_EXISTS", "Email already exists", 409);
    }

    const passwordHash = await this.passwordHasher.hash(cmd.password);

    const user = await this.users.create({
      email,
      passwordHash,
      name: cmd.name,
      isActive: true,
    });

    const refreshJti = this.jtiGenerator.generate();
    const refreshTokenRaw = this.tokenService.generateRefreshToken({
      sub: user.id,
      type: "refresh",
      jti: refreshJti,
    });
    const refreshTokenHash = this.tokenHasher.hash(refreshTokenRaw);
    const refreshTokenExpiresAt = this.clock.addMs(this.clock.now(), this.refreshTtlMs);

    await this.refreshTokens.create({
      userId: user.id,
      tokenHash: refreshTokenHash,
      jti: refreshJti,
      expiresAt: refreshTokenExpiresAt,
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
      user: { id: user.id, email: user.email, name: user.name },
      accessToken,
      refreshToken: refreshTokenRaw,
    };
  }
}
