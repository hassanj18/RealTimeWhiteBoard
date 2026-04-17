import { AppError } from "../../../shared/errors/AppError";

export function parseTtlToMs(ttl: string): number {
  const match = /^([0-9]+)(ms|s|m|h|d)$/.exec(ttl);
  if (!match) {
    throw new AppError("INTERNAL_ERROR", `Invalid TTL format: ${ttl}`, 500);
  }
  const value = Number(match[1]);
  const unit = match[2];
  const multipliers: Record<string, number> = {
    ms: 1,
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };
  return value * multipliers[unit];
}
