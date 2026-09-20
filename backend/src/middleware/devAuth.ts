import type {
  Request,
  Response,
  NextFunction,
} from "express";

import { AppError } from "../utils/AppError";

export function requireDevUser(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  const userId = req.headers["x-user-id"];

  if (
    typeof userId !== "string" ||
    !userId.trim()
  ) {
    next(
      new AppError(
        "Authentication is required",
        401,
        "AUTHENTICATION_REQUIRED"
      )
    );

    return;
  }

  req.userId = userId.trim();

  next();
}