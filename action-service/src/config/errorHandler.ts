import type { NextFunction, Request, Response } from "express";
import { AppError } from "../shared/errors/AppError";
import { fail } from "../shared/utils/http";

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    return res.status(err.status).json(fail(err.code, err.message));
  }

  console.error(err);
  return res.status(500).json(fail("INTERNAL_ERROR", "Unexpected error"));
}
