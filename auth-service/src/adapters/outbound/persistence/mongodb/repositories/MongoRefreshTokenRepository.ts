import { RefreshTokenRepository } from "../../../../../application/ports/RefreshTokenRepository";
import { RefreshToken } from "../../../../../domain/entities/RefreshToken";
import { RefreshTokenModel } from "../models/RefreshTokenModel";

function toDomain(doc: any): RefreshToken {
  return {
    id: String(doc._id),
    userId: String(doc.userId),
    tokenHash: doc.tokenHash,
    jti: doc.jti,
    expiresAt: doc.expiresAt,
    revoked: doc.revoked,
    revokedAt: doc.revokedAt,
    replacedByTokenHash: doc.replacedByTokenHash,
    createdAt: doc.createdAt,
    userAgent: doc.userAgent,
    ipAddress: doc.ipAddress,
  };
}

export class MongoRefreshTokenRepository implements RefreshTokenRepository {
  async create(token: Omit<RefreshToken, "id">): Promise<RefreshToken> {
    const doc = await RefreshTokenModel.create({
      userId: token.userId,
      tokenHash: token.tokenHash,
      jti: token.jti,
      expiresAt: token.expiresAt,
      revoked: token.revoked,
      revokedAt: token.revokedAt,
      replacedByTokenHash: token.replacedByTokenHash,
      userAgent: token.userAgent ?? null,
      ipAddress: token.ipAddress ?? null,
    });
    return toDomain(doc);
  }

  async findByJti(jti: string): Promise<RefreshToken | null> {
    const doc = await RefreshTokenModel.findOne({ jti }).exec();
    if (!doc) return null;
    return toDomain(doc);
  }

  async revoke(tokenHash: string, replacedByTokenHash?: string | null): Promise<void> {
    await RefreshTokenModel.updateOne(
      { tokenHash },
      {
        $set: {
          revoked: true,
          revokedAt: new Date(),
          replacedByTokenHash: replacedByTokenHash ?? null,
        },
      }
    ).exec();
  }
}
