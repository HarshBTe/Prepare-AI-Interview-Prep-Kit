import type { Request, Response, NextFunction } from "express";

import { verifyAccessToken } from "../utils/jwt";
import { AppError } from "../utils/AppError";

const AUTH_COOKIE_NAME = "access_token";

export function requireAuth(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  try {
    const token = req.cookies?.[AUTH_COOKIE_NAME];

    if (!token) {
      throw new AppError(
        "Authentication is required",
        401,
        "AUTHENTICATION_REQUIRED"
      );
    }

    const payload = verifyAccessToken(token);

    req.userId = payload.userId;

    next();
  } catch (error) {
    if (error instanceof AppError) {
      next(error);
      return;
    }

    next(
      new AppError(
        "Invalid or expired authentication token",
        401,
        "INVALID_TOKEN"
      )
    );
  }
}