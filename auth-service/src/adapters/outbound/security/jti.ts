import crypto from "crypto";

export function generateJti(): string {
  return crypto.randomBytes(16).toString("hex");
}
