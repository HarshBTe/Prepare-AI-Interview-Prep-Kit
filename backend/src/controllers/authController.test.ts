import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

import app from "../app";

const {
  userFindOneMock,
  userFindByIdMock,
  userCreateMock,
} = vi.hoisted(() => ({
  userFindOneMock: vi.fn(),
  userFindByIdMock: vi.fn(),
  userCreateMock: vi.fn(),
}));

vi.mock("../models/User", () => ({
  User: {
    findOne: userFindOneMock,
    findById: userFindByIdMock,
    create: userCreateMock,
  },
}));

vi.mock("../utils/password", () => ({
  hashPassword: vi.fn().mockResolvedValue("hashed-password"),
  comparePassword: vi.fn().mockResolvedValue(true),
}));

vi.mock("../utils/jwt", () => ({
  signAccessToken: vi.fn().mockReturnValue("test-jwt-token"),
  verifyAccessToken: vi.fn().mockReturnValue({
    userId: "507f1f77bcf86cd799439011",
  }),
}));

const TEST_USER = {
  _id: {
    toString: () => "507f1f77bcf86cd799439011",
  },
  email: "test@example.com",
  passwordHash: "hashed-password",
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
};

describe("Auth API", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    userFindOneMock.mockResolvedValue(null);
    userCreateMock.mockResolvedValue(TEST_USER);

    userFindByIdMock.mockReturnValue({
      select: vi.fn().mockResolvedValue(TEST_USER),
    });
  });

  describe("POST /api/auth/register", () => {
    it("registers a new user and sets an HTTP-only cookie", async () => {
      const response = await request(app)
        .post("/api/auth/register")
        .send({
          email: "test@example.com",
          password: "password123",
        })
        .expect(201);

      expect(userFindOneMock).toHaveBeenCalledWith({
        email: "test@example.com",
      });

      expect(userCreateMock).toHaveBeenCalledWith({
        email: "test@example.com",
        passwordHash: "hashed-password",
      });

      expect(response.body).toEqual({
        success: true,
        user: {
          id: "507f1f77bcf86cd799439011",
          email: "test@example.com",
        },
      });

      const setCookie = response.headers["set-cookie"];

      expect(setCookie).toBeDefined();
      expect(setCookie[0]).toContain("access_token=test-jwt-token");
      expect(setCookie[0].toLowerCase()).toContain("httponly");
    });

    it("rejects invalid registration data", async () => {
      const response = await request(app)
        .post("/api/auth/register")
        .send({
          email: "not-an-email",
          password: "123",
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");

      expect(userCreateMock).not.toHaveBeenCalled();
    });

    it("rejects duplicate email", async () => {
      userFindOneMock.mockResolvedValueOnce(TEST_USER);

      const response = await request(app)
        .post("/api/auth/register")
        .send({
          email: "test@example.com",
          password: "password123",
        })
        .expect(409);

      expect(response.body).toEqual({
        success: false,
        error: {
          code: "EMAIL_ALREADY_EXISTS",
          message: "An account with this email already exists",
        },
      });

      expect(userCreateMock).not.toHaveBeenCalled();
    });
  });

  describe("POST /api/auth/login", () => {
    it("logs in successfully and sets an HTTP-only cookie", async () => {
      userFindOneMock.mockResolvedValueOnce(TEST_USER);

      const response = await request(app)
        .post("/api/auth/login")
        .send({
          email: "test@example.com",
          password: "password123",
        })
        .expect(200);

      expect(userFindOneMock).toHaveBeenCalledWith({
        email: "test@example.com",
      });

      expect(response.body).toEqual({
        success: true,
        user: {
          id: "507f1f77bcf86cd799439011",
          email: "test@example.com",
        },
      });

      const setCookie = response.headers["set-cookie"];

      expect(setCookie).toBeDefined();
      expect(setCookie[0]).toContain("access_token=test-jwt-token");
      expect(setCookie[0].toLowerCase()).toContain("httponly");
    });

    it("rejects invalid credentials", async () => {
      userFindOneMock.mockResolvedValueOnce(null);

      const response = await request(app)
        .post("/api/auth/login")
        .send({
          email: "wrong@example.com",
          password: "wrongpassword",
        })
        .expect(401);

      expect(response.body).toEqual({
        success: false,
        error: {
          code: "INVALID_CREDENTIALS",
          message: "Invalid email or password",
        },
      });
    });

    it("rejects invalid login data", async () => {
      const response = await request(app)
        .post("/api/auth/login")
        .send({
          email: "not-an-email",
          password: "",
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");

      expect(userFindOneMock).not.toHaveBeenCalled();
    });
  });

  describe("GET /api/auth/me", () => {
    it("requires authentication", async () => {
      const response = await request(app)
        .get("/api/auth/me")
        .expect(401);

      expect(response.body).toEqual({
        success: false,
        error: {
          code: "AUTHENTICATION_REQUIRED",
          message: "Authentication is required",
        },
      });
    });

    it("returns the authenticated user", async () => {
      const response = await request(app)
        .get("/api/auth/me")
        .set("Cookie", "access_token=test-jwt-token")
        .expect(200);

      expect(userFindByIdMock).toHaveBeenCalledWith(
        "507f1f77bcf86cd799439011"
      );

      expect(response.body).toEqual({
        success: true,
        user: {
          id: "507f1f77bcf86cd799439011",
          email: "test@example.com",
          createdAt: TEST_USER.createdAt.toISOString(),
        },
      });
    });
  });

  describe("POST /api/auth/logout", () => {
    it("clears the authentication cookie", async () => {
      const response = await request(app)
        .post("/api/auth/logout")
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: "Logged out successfully",
      });

      const setCookie = response.headers["set-cookie"];

      expect(setCookie).toBeDefined();
      expect(setCookie[0]).toContain("access_token=");
      expect(setCookie[0].toLowerCase()).toContain("expires=thu, 01 jan 1970");
    });
  });
});