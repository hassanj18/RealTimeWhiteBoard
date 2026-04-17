export type RefreshToken = {
  id: string;
  userId: string;
  tokenHash: string;
  jti: string;
  expiresAt: Date;
  revoked: boolean;
  revokedAt: Date | null;
  replacedByTokenHash: string | null;
  createdAt: Date;
  userAgent?: string | null;
  ipAddress?: string | null;
};
