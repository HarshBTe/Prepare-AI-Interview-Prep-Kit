import type { Request, Response, NextFunction } from "express";

import { User } from "../models/User";
import { hashPassword, comparePassword } from "../utils/password";
import { signAccessToken } from "../utils/jwt";
import {
  registerSchema,
  loginSchema,
} from "../validators/authValidator";
import { AppError } from "../utils/AppError";

const AUTH_COOKIE_NAME = "access_token";

const getCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: "/",
});

export async function register(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const parsed = registerSchema.safeParse(req.body);

    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0];

      throw new AppError(
        firstIssue?.message ?? "Invalid registration data",
        400,
        "VALIDATION_ERROR"
      );
    }

    const email = parsed.data.email.toLowerCase();
    const password = parsed.data.password;

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      throw new AppError(
        "An account with this email already exists",
        409,
        "EMAIL_ALREADY_EXISTS"
      );
    }

    const passwordHash = await hashPassword(password);

    const user = await User.create({
      email,
      passwordHash,
    });

    const token = signAccessToken(user._id.toString());

    res.cookie(
      AUTH_COOKIE_NAME,
      token,
      getCookieOptions()
    );

    res.status(201).json({
      success: true,
      user: {
        id: user._id.toString(),
        email: user.email,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function login(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const parsed = loginSchema.safeParse(req.body);

    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0];

      throw new AppError(
        firstIssue?.message ?? "Invalid login data",
        400,
        "VALIDATION_ERROR"
      );
    }

    const email = parsed.data.email.toLowerCase();
    const password = parsed.data.password;

    const user = await User.findOne({ email });

    if (!user) {
      throw new AppError(
        "Invalid email or password",
        401,
        "INVALID_CREDENTIALS"
      );
    }

    const passwordMatches = await comparePassword(
      password,
      user.passwordHash
    );

    if (!passwordMatches) {
      throw new AppError(
        "Invalid email or password",
        401,
        "INVALID_CREDENTIALS"
      );
    }

    const token = signAccessToken(user._id.toString());

    res.cookie(
      AUTH_COOKIE_NAME,
      token,
      getCookieOptions()
    );

    res.json({
      success: true,
      user: {
        id: user._id.toString(),
        email: user.email,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function logout(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    res.clearCookie(AUTH_COOKIE_NAME, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    });

    res.json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    next(error);
  }
}


export async function getCurrentUser(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.userId;

    if (!userId) {
      throw new AppError(
        "Authentication is required",
        401,
        "AUTHENTICATION_REQUIRED"
      );
    }

    const user = await User.findById(userId).select(
      "_id email createdAt"
    );

    if (!user) {
      throw new AppError(
        "User not found",
        404,
        "USER_NOT_FOUND"
      );
    }

    res.json({
      success: true,
      user: {
        id: user._id.toString(),
        email: user.email,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
}