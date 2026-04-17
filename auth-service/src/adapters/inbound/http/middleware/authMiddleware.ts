import { NextFunction, Request, Response } from "express";
import { TokenService } from "../../../../application/ports/TokenService";
import { AppError } from "../../../../shared/errors/AppError";

export type AuthenticatedRequest = Request & {
  auth?: { userId: string; email: string };
};

export function authMiddleware(tokenService: TokenService) {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
    const header = req.header("authorization") || req.header("Authorization");
    const bearer = header ? /^Bearer (.+)$/.exec(header)?.[1] : undefined;

    const cookieToken = (req as any).cookies?.accessToken as string | undefined;
    const sessionToken = (req as any).session?.accessToken as string | undefined;
    const token = bearer ?? cookieToken ?? sessionToken;

    if (token) {
      const payload = tokenService.verifyAccessToken(token);
      req.auth = { userId: payload.sub, email: payload.email };
      return next();
    }

    const sessionUserId = (req as any).session?.userId as string | undefined;
    const sessionEmail = (req as any).session?.email as string | undefined;
    if (sessionUserId) {
      req.auth = { userId: sessionUserId, email: sessionEmail ?? "" };
      return next();
    }

    return next(new AppError("UNAUTHORIZED", "Not authenticated", 401));
  };
}
