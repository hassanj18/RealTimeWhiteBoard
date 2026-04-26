import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

type AuthedRequest = Request & {
  user?: {
    userId: string;
    email?: string;
    name?: string;
  };
};

export function authMiddleware(accessSecret: string) {
  return (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      let token: string | null = null;

      if (req.headers.authorization) {
        token = req.headers.authorization.split(" ")[1] ?? null;
      }

      if (!token && (req as any).cookies && (req as any).cookies.accessToken) {
        token = (req as any).cookies.accessToken;
      }

      if (!token) {
        return res.status(401).json({ message: "No token provided" });
      }

      const decoded = jwt.verify(token, accessSecret) as any;

      if (decoded.type !== "access") {
        return res.status(401).json({ message: "Invalid token type" });
      }

      const userInfo = {
        userId: decoded.sub,
        email: decoded.email,
        name: decoded.name,
      };

      req.user = userInfo;
      next();
    } catch (err: any) {
      return res.status(401).json({
        message: "Invalid or expired token",
        error: err?.message,
      });
    }
  };
}
