export type AppErrorCode =
  | "VALIDATION_ERROR"
  | "INVALID_CREDENTIALS"
  | "EMAIL_ALREADY_EXISTS"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "MISSING_REFRESH_TOKEN"
  | "INVALID_REFRESH_TOKEN"
  | "REVOKED_REFRESH_TOKEN"
  | "EXPIRED_REFRESH_TOKEN"
  | "INTERNAL_ERROR";

export class AppError extends Error {
  public readonly code: AppErrorCode;
  public readonly status: number;

  constructor(code: AppErrorCode, message: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}
