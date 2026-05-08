import jwt from "jsonwebtoken";
import type { SignOptions } from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { type Request, type Response, type NextFunction } from "express";
import { fail } from "./http";
import { getEnv } from "./env";
import { tApi } from "../i18n/messages";
import { applyUserLocale } from "../middleware/locale";

const env = getEnv();
const JWT_SECRET = env.jwtSecret;
const TOKEN_EXPIRES_IN = env.jwtExpiresIn as SignOptions["expiresIn"];

export type AuthUser = {
  id: number;
  email: string;
  name: string;
  role: string;
  officeId: number | null;
  clientId: number | null;
  preferredLanguage?: string | null;
};

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function signToken(payload: AuthUser): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_EXPIRES_IN });
}

export function verifyToken(token: string): AuthUser | null {
  try {
    return jwt.verify(token, JWT_SECRET) as AuthUser;
  } catch {
    return null;
  }
}

export function getUser(req: Request): AuthUser {
  return (req as Request & { user: AuthUser }).user;
}

function attachUser(req: Request, res: Response): AuthUser | null {
  const authHeader = req.headers["authorization"];
  if (!authHeader?.startsWith("Bearer ")) {
    fail(res, 401, tApi(req, "AUTH.UNAUTHORIZED"), { code: "AUTH.UNAUTHORIZED" });
    return null;
  }

  const token = authHeader.slice(7);

  try {
    const payload = jwt.verify(token, JWT_SECRET) as AuthUser;
    (req as Request & { user: AuthUser }).user = payload;
    applyUserLocale(req, payload.preferredLanguage);
    return payload;
  } catch (err) {
    const message = err instanceof jwt.TokenExpiredError ? tApi(req, "AUTH.UNAUTHORIZED") : tApi(req, "AUTH.UNAUTHORIZED");
    fail(res, 401, message);
    return null;
  }
}

export function anyAuthMiddleware(req: Request, res: Response, next: NextFunction): void {
  const payload = attachUser(req, res);
  if (!payload) return;
  next();
}

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const payload = attachUser(req, res);
  if (!payload) return;
  if (payload.role === "client") {
    fail(res, 403, tApi(req, "AUTH.FORBIDDEN"), { code: "AUTH.FORBIDDEN" });
    return;
  }
  next();
}

export function clientPortalMiddleware(req: Request, res: Response, next: NextFunction): void {
  const payload = attachUser(req, res);
  if (!payload) return;
  if (payload.role !== "client") {
    fail(res, 403, tApi(req, "AUTH.FORBIDDEN"), { code: "AUTH.FORBIDDEN" });
    return;
  }
  next();
}
