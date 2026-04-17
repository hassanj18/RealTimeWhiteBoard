import { RefreshTokenRepository } from "../ports/RefreshTokenRepository";
import { TokenHasher } from "../ports/TokenHasher";

export class Logout {
  constructor(
    private readonly refreshTokens: RefreshTokenRepository,
    private readonly tokenHasher: TokenHasher
  ) {}

  async execute(rawRefreshToken: string) {
    const tokenHash = this.tokenHasher.hash(rawRefreshToken);
    await this.refreshTokens.revoke(tokenHash, null);
    return { message: "Logged out successfully" };
  }
}
