export type AccessTokenPayload = {
  sub: string;
  email: string;
  type: "access";
};

export type RefreshTokenPayload = {
  sub: string;
  type: "refresh";
  jti: string;
};

export interface TokenService {
  generateAccessToken(payload: AccessTokenPayload): string;
  generateRefreshToken(payload: RefreshTokenPayload): string;
  verifyAccessToken(token: string): AccessTokenPayload;
  verifyRefreshToken(token: string): RefreshTokenPayload;
}
