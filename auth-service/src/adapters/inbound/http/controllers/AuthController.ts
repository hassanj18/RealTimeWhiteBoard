import { Request, Response } from "express";
import { z } from "zod";
import { SignUp } from "../../../../application/use-cases/SignUp";
import { Login } from "../../../../application/use-cases/Login";
import { Logout } from "../../../../application/use-cases/Logout";
import { VerifyToken } from "../../../../application/use-cases/VerifyToken";
import { RefreshAccessToken } from "../../../../application/use-cases/RefreshAccessToken";
import { AppError } from "../../../../shared/errors/AppError";
import { ok } from "../../../../shared/utils/http";
import { parseTtlToMs } from "../../../outbound/security/ttl";

type SessionRequest = Request & { session: { userId?: string } };

const SignupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1),
});

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export type AuthControllerDeps = {
  signUp: SignUp;
  login: Login;
  logout: Logout;
  verifyToken: VerifyToken;
  refreshAccessToken: RefreshAccessToken;
  accessTokenTtl: string;
  refreshTokenTtl: string;
  cookieSecure: boolean;
  cookieSameSite: "strict" | "lax" | "none";
};

export class AuthController {
  constructor(private readonly deps: AuthControllerDeps) {}

  private setAccessCookie(res: Response, accessToken: string) {
    const ttlMs = parseTtlToMs(this.deps.accessTokenTtl);
    res.cookie("accessToken", accessToken, {
      httpOnly: true,
      secure: this.deps.cookieSecure,
      sameSite: this.deps.cookieSameSite,
      path: "/",
      maxAge: ttlMs,
    });
  }

  private setRefreshCookie(res: Response, refreshToken: string) {
    const ttlMs = parseTtlToMs(this.deps.refreshTokenTtl);
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: this.deps.cookieSecure,
      sameSite: this.deps.cookieSameSite,
      path: "/auth",
      maxAge: ttlMs,
    });
  }

  private clearRefreshCookie(res: Response) {
    res.cookie("refreshToken", "", {
      httpOnly: true,
      secure: this.deps.cookieSecure,
      sameSite: this.deps.cookieSameSite,
      path: "/auth",
      maxAge: 0,
    });
  }

  signup = async (req: Request, res: Response) => {
    const parsed = SignupSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError("VALIDATION_ERROR", "Invalid request", 400);
    }

    const result = await this.deps.signUp.execute({
      email: parsed.data.email,
      password: parsed.data.password,
      name: parsed.data.name,
      userAgent: req.get("user-agent"),
      ipAddress: req.ip,
    });

    (req as any).session.userId = result.user.id;
    (req as any).session.email = result.user.email;
    (req as any).session.accessToken = result.accessToken;

    this.setAccessCookie(res, result.accessToken);
    this.setRefreshCookie(res, result.refreshToken);
    return res.status(201).json(ok({ user: result.user, accessToken: result.accessToken }));
  };

  loginHandler = async (req: Request, res: Response) => {
    const parsed = LoginSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError("VALIDATION_ERROR", "Invalid request", 400);
    }
    const result = await this.deps.login.execute({
      email: parsed.data.email,
      password: parsed.data.password,
      userAgent: req.get("user-agent"),
      ipAddress: req.ip,
    });
    
    (req as any).session.userId = result.user.id;
    (req as any).session.email = result.user.email;
    (req as any).session.accessToken = result.accessToken;

    this.setAccessCookie(res, result.accessToken);
    this.setRefreshCookie(res, result.refreshToken);
    return res.status(200).json(ok({ user: result.user, accessToken: result.accessToken }));
  };

  logoutHandler = async (req: Request, res: Response) => {
    const token = req.cookies?.refreshToken as string | undefined;
    if (token) {
      await this.deps.logout.execute(token);
    }
    
    if ((req as any).session) {
      (req as any).session.userId = undefined;
      (req as any).session.email = undefined;
      (req as any).session.accessToken = undefined;
    }

    res.cookie("accessToken", "", {
      httpOnly: true,
      secure: this.deps.cookieSecure,
      sameSite: this.deps.cookieSameSite,
      path: "/",
      maxAge: 0,
    });
    this.clearRefreshCookie(res);
    return res.status(200).json(ok({ message: "Logged out successfully" }));
  };

  verifyHandler = async (req: Request, res: Response) => {
    const header = req.header("authorization") || req.header("Authorization");
    if (!header) throw new AppError("UNAUTHORIZED", "Missing Authorization header", 401);

    const match = /^Bearer (.+)$/.exec(header);
    if (!match) throw new AppError("UNAUTHORIZED", "Invalid Authorization header", 401);

    const result = await this.deps.verifyToken.execute(match[1]);
    return res.status(200).json(ok(result));
  };

  refreshHandler = async (req: Request, res: Response) => {
    const raw = req.cookies?.refreshToken as string | undefined;
    if (!raw) {
      throw new AppError("MISSING_REFRESH_TOKEN", "Missing refresh token", 401);
    }

    const result = await this.deps.refreshAccessToken.execute({
      rawRefreshToken: raw,
      userAgent: req.get("user-agent"),
      ipAddress: req.ip,
    });

    if ((req as any).session) {
      (req as any).session.accessToken = result.accessToken;
    }

    this.setAccessCookie(res, result.accessToken);
    this.setRefreshCookie(res, result.refreshToken);
    return res.status(200).json(ok({ accessToken: result.accessToken }));
  };
}
