import { RefreshToken } from "../../domain/entities/RefreshToken";

export interface RefreshTokenRepository {
  create(token: Omit<RefreshToken, "id">): Promise<RefreshToken>;
  findByJti(jti: string): Promise<RefreshToken | null>;
  revoke(tokenHash: string, replacedByTokenHash?: string | null): Promise<void>;
}
