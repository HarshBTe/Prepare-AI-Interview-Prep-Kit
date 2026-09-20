import request from "supertest";
import { describe, expect, it, vi } from "vitest";

const {
  userFindOneMock,
  userFindByIdMock,
  userCreateMock,
  testUserId,
} = vi.hoisted(() => ({
  userFindOneMock: vi.fn(),
  userFindByIdMock: vi.fn(),
  userCreateMock: vi.fn(),
  testUserId: "507f1f77bcf86cd799439011",
}));

const TEST_USER_ID = "507f1f77bcf86cd799439011";

const TEST_USER = {
  _id: {
    toString: () => testUserId,
  },
  email: "integration@example.com",
  passwordHash: "hashed-password",
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
};

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
  signAccessToken: vi.fn().mockReturnValue("integration-jwt"),
  verifyAccessToken: vi.fn().mockReturnValue({
    userId: testUserId,
  }),
}));

import app from "../app";

describe("Authentication cookie flow", () => {
  it("registers and returns an authentication cookie", async () => {
    userFindOneMock.mockResolvedValueOnce(null);
    userCreateMock.mockResolvedValueOnce(TEST_USER);

    const response = await request(app)
      .post("/api/auth/register")
      .send({
        email: "integration@example.com",
        password: "password123",
      })
      .expect(201);

    expect(response.body).toEqual({
      success: true,
      user: {
        id: testUserId,
        email: "integration@example.com",
      },
    });

    expect(response.headers["set-cookie"]).toBeDefined();

    expect(response.headers["set-cookie"][0]).toContain(
      "access_token=integration-jwt"
    );

    expect(
      response.headers["set-cookie"][0].toLowerCase()
    ).toContain("httponly");
  });

  it("uses the authentication cookie to access /me", async () => {
    userFindByIdMock.mockReturnValueOnce({
      select: vi.fn().mockResolvedValue(TEST_USER),
    });

    const response = await request(app)
      .get("/api/auth/me")
      .set("Cookie", "access_token=integration-jwt")
      .expect(200);

    expect(userFindByIdMock).toHaveBeenCalledWith(testUserId);

    expect(response.body).toEqual({
      success: true,
      user: {
        id: testUserId,
        email: "integration@example.com",
        createdAt: TEST_USER.createdAt.toISOString(),
      },
    });
  });

  it("rejects /me when the authentication cookie is missing", async () => {
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

  it("clears the authentication cookie on logout", async () => {
    const response = await request(app)
      .post("/api/auth/logout")
      .expect(200);

    expect(response.body).toEqual({
      success: true,
      message: "Logged out successfully",
    });

    expect(response.headers["set-cookie"]).toBeDefined();

    expect(response.headers["set-cookie"][0]).toContain(
      "access_token="
    );
  });
});