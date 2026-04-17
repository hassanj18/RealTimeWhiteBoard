import crypto from "crypto";

export function hashRefreshToken(rawJwt: string): string {
  return crypto.createHash("sha256").update(rawJwt, "utf8").digest("hex");
}
