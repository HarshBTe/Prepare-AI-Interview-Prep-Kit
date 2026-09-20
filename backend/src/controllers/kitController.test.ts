import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  generateInterviewKitMock,
  kitCreateMock,
  kitSaveMock,
  kitFindOneMock,
  kitFindMock,
  verifyAccessTokenMock,
} = vi.hoisted(() => ({
  generateInterviewKitMock: vi.fn(),
  kitCreateMock: vi.fn(),
  kitSaveMock: vi.fn(),
  kitFindOneMock: vi.fn(),
  kitFindMock: vi.fn(),
  verifyAccessTokenMock: vi.fn(),
}));

vi.mock("../../../src/pipeline/generateInterviewKit", () => ({
  generateInterviewKit: generateInterviewKitMock,
}));

vi.mock("../models/Kit", () => ({
  Kit: {
    create: kitCreateMock,
    findOne: kitFindOneMock,
    find: kitFindMock,
  },
}));

vi.mock("../utils/jwt", () => ({
  verifyAccessToken: verifyAccessTokenMock,
}));

const TEST_USER_ID = "507f1f77bcf86cd799439011";
const TEST_KIT_ID = "kit-123";

import app from "../app";

const generatedKit = {
  source: {
    company: "Acme",
    company_url: "https://acme.example.com/",
    role: "Full Stack Developer",
    location: "",
    jd_chars: 100,
    researched_at: "2026-09-18T00:00:00.000Z",
    pages_used: ["https://acme.example.com/"],
  },

  company_brief: {
    summary: "Acme builds software.",
    what_they_do: "Acme provides software.",
    sources: ["https://acme.example.com/"],
  },

  role: {
    title: "Full Stack Developer",
    seniority: "Mid-level",
    responsibilities: ["Build applications"],
    requirements: [
      {
        id: "req-technical-001",
        text: "React experience",
        kind: "technical",
        priority: "must",
      },
    ],
  },

  questions: [
    {
      id: "q-001",
      requirement_ids: ["req-technical-001"],
      category: "technical",
      prompt: "Explain React.",
      answer_outline: "Discuss React.",
      difficulty: 1,
    },
  ],

  flashcards: [
    {
      id: "fc-001",
      front: "What is React?",
      back: "A UI library.",
      requirement_ids: ["req-technical-001"],
    },
  ],

  schedule: {
    days_available: 5,
    days: [
      {
        day: 1,
        focus: "Technical preparation",
        question_ids: ["q-001"],
        minutes: 20,
      },
      {
        day: 2,
        focus: "Interview preparation",
        question_ids: [],
        minutes: 0,
      },
      {
        day: 3,
        focus: "Interview preparation",
        question_ids: [],
        minutes: 0,
      },
      {
        day: 4,
        focus: "Interview preparation",
        question_ids: [],
        minutes: 0,
      },
      {
        day: 5,
        focus: "Interview preparation",
        question_ids: [],
        minutes: 0,
      },
    ],
  },

  coverage: {
    uncovered_requirement_ids: [],
    passes: 1,
  },
};

describe("Kit API", () => {
  let generatingKit: {
    _id: {
      toString: () => string;
    };
    title: string;
    status: "generating" | "ready" | "failed";
    kit: typeof generatedKit | null;
    errorCode: string | undefined;
    errorMessage: string | undefined;
    save: typeof kitSaveMock;
  };

  beforeEach(() => {
    vi.clearAllMocks();

    verifyAccessTokenMock.mockReset();

    verifyAccessTokenMock.mockReturnValue({
      userId: TEST_USER_ID,
    });

    generateInterviewKitMock.mockResolvedValue(generatedKit);

    /*
     * This represents the Mongoose document returned by Kit.create().
     */
    generatingKit = {
      _id: {
        toString: () => TEST_KIT_ID,
      },

      title: "Interview Prep Kit",

      status: "generating",

      kit: null,

      errorCode: undefined,

      errorMessage: undefined,

      save: kitSaveMock,
    };

    kitSaveMock.mockResolvedValue(generatingKit);

    kitCreateMock.mockResolvedValue(generatingKit);

  kitFindOneMock.mockReset();

kitFindOneMock.mockReturnValue({
  lean: vi.fn().mockResolvedValue(null),
});

kitFindMock.mockReset();
  });

  // --------------------------------------------------
  // HEALTH
  // --------------------------------------------------

  it("returns health status", async () => {
    const response = await request(app)
      .get("/api/health")
      .expect(200);

    expect(response.body).toEqual({
      success: true,
      message: "AI Interview Prep Kit API is running",
    });
  });

  // --------------------------------------------------
  // GENERATE SUCCESS
  // --------------------------------------------------

  it("generates and persists a kit", async () => {
    const response = await request(app)
      .post("/api/kits/generate")
      .set("Cookie", "access_token=test-jwt-token")
      .send({
        jd: "Full Stack Developer with React experience.",
        company_url: "https://acme.example.com/",
        days: 5,
      })
      .expect(201);

    expect(generateInterviewKitMock).toHaveBeenCalledTimes(1);

    expect(kitCreateMock).toHaveBeenCalledWith({
      userId: TEST_USER_ID,
      title: "Interview Prep Kit",
      status: "generating",
      kit: null,
    });

    expect(kitSaveMock).toHaveBeenCalledTimes(1);

    expect(response.body.success).toBe(true);

    expect(response.body.kitId).toBe(TEST_KIT_ID);

    expect(response.body.kit).toEqual(generatedKit);

    /*
     * Verify final state of the persisted document.
     */
    expect(generatingKit.status).toBe("ready");
    expect(generatingKit.title).toBe("Full Stack Developer");
    expect(generatingKit.kit).toEqual(generatedKit);
  });

  // --------------------------------------------------
  // INVALID BODY
  // --------------------------------------------------

  it("rejects an invalid request body", async () => {
    const response = await request(app)
      .post("/api/kits/generate")
      .set("Cookie", "access_token=test-jwt-token")
      .send({
        jd: "",
        company_url: "https://acme.example.com/",
        days: 5,
      })
      .expect(400);

    expect(response.body.success).toBe(false);

    expect(response.body.error.code).toBe(
      "VALIDATION_ERROR"
    );

    expect(
      generateInterviewKitMock
    ).not.toHaveBeenCalled();

    expect(kitCreateMock).not.toHaveBeenCalled();
  });

  // --------------------------------------------------
  // INVALID DAYS
  // --------------------------------------------------

  it("rejects an invalid day count", async () => {
    const response = await request(app)
      .post("/api/kits/generate")
      .set("Cookie", "access_token=test-jwt-token")
      .send({
        jd: "Full Stack Developer",
        company_url: "https://acme.example.com/",
        days: 61,
      })
      .expect(400);

    expect(response.body.success).toBe(false);

    expect(response.body.error.code).toBe(
      "VALIDATION_ERROR"
    );

    expect(
      generateInterviewKitMock
    ).not.toHaveBeenCalled();

    expect(kitCreateMock).not.toHaveBeenCalled();
  });

  // --------------------------------------------------
  // AUTH REQUIRED
  // --------------------------------------------------

  it("requires authentication", async () => {
    const response = await request(app)
      .post("/api/kits/generate")
      .send({
        jd: "Full Stack Developer",
        company_url: "https://acme.example.com/",
        days: 5,
      })
      .expect(401);

    expect(response.body.success).toBe(false);

    expect(response.body.error.code).toBe(
      "AUTHENTICATION_REQUIRED"
    );

    expect(
      generateInterviewKitMock
    ).not.toHaveBeenCalled();

    expect(kitCreateMock).not.toHaveBeenCalled();
  });

  // --------------------------------------------------
  // GENERATION FAILURE
  // --------------------------------------------------

  it("returns a structured error when generation fails", async () => {
    generateInterviewKitMock.mockRejectedValueOnce(
      new Error("Generation failed")
    );

    const response = await request(app)
      .post("/api/kits/generate")
      .set("Cookie", "access_token=test-jwt-token")
      .send({
        jd: "Full Stack Developer",
        company_url: "https://acme.example.com/",
        days: 5,
      })
      .expect(500);

    expect(response.body.success).toBe(false);

    expect(response.body.error.code).toBe(
      "INTERNAL_SERVER_ERROR"
    );

    expect(response.body.error.message).toBe(
      "An unexpected error occurred"
    );

    /*
     * Generation failure must still persist the
     * failed state.
     */
    expect(kitSaveMock).toHaveBeenCalledTimes(1);

    expect(generatingKit.status).toBe("failed");

    expect(generatingKit.errorCode).toBe(
      "GENERATION_FAILED"
    );

    expect(generatingKit.errorMessage).toBe(
      "Generation failed"
    );
  });

  // --------------------------------------------------
  // INVALID TOKEN
  // --------------------------------------------------

  it("rejects an invalid authentication token", async () => {
    verifyAccessTokenMock.mockImplementationOnce(() => {
      throw new Error("Invalid token");
    });

    const response = await request(app)
      .post("/api/kits/generate")
      .set("Cookie", "access_token=invalid-token")
      .send({
        jd: "Senior TypeScript developer",
        company_url: "https://example.com",
        days: 5,
      })
      .expect(401);

    expect(response.body.success).toBe(false);

    expect(response.body.error.code).toBe(
      "INVALID_TOKEN"
    );

    expect(
      generateInterviewKitMock
    ).not.toHaveBeenCalled();

    expect(kitCreateMock).not.toHaveBeenCalled();
  });

  // --------------------------------------------------
  // GET ALL KITS
  // --------------------------------------------------

  it("returns kits belonging to the authenticated user", async () => {
    const mockKits = [
      {
        _id: {
          toString: () => "kit-001",
        },
        title: "React Developer",
        status: "ready",
        createdAt: new Date("2026-09-18T10:00:00.000Z"),
        updatedAt: new Date("2026-09-18T11:00:00.000Z"),
      },
      {
        _id: {
          toString: () => "kit-002",
        },
        title: "Node.js Developer",
        status: "generating",
        createdAt: new Date("2026-09-17T10:00:00.000Z"),
        updatedAt: new Date("2026-09-17T11:00:00.000Z"),
      },
    ];

    const leanMock = vi.fn().mockResolvedValue(mockKits);

    const sortMock = vi.fn().mockReturnValue({
      lean: leanMock,
    });

    const selectMock = vi.fn().mockReturnValue({
      sort: sortMock,
    });

    kitFindMock.mockReturnValue({
      select: selectMock,
    });

    const response = await request(app)
      .get("/api/kits")
      .set("Cookie", "access_token=test-jwt-token")
      .expect(200);

    expect(kitFindMock).toHaveBeenCalledWith({
      userId: TEST_USER_ID,
    });

    expect(
      selectMock
    ).toHaveBeenCalledWith(
      "_id title status createdAt updatedAt"
    );

    expect(sortMock).toHaveBeenCalledWith({
      updatedAt: -1,
    });

    expect(response.body.success).toBe(true);

    expect(response.body.kits).toEqual([
      {
        id: "kit-001",
        title: "React Developer",
        status: "ready",
        createdAt: mockKits[0].createdAt.toISOString(),
        updatedAt: mockKits[0].updatedAt.toISOString(),
      },
      {
        id: "kit-002",
        title: "Node.js Developer",
        status: "generating",
        createdAt: mockKits[1].createdAt.toISOString(),
        updatedAt: mockKits[1].updatedAt.toISOString(),
      },
    ]);
  });

  // --------------------------------------------------
  // GET ALL KITS - AUTH
  // --------------------------------------------------

  it("requires authentication when listing kits", async () => {
    const response = await request(app)
      .get("/api/kits")
      .expect(401);

    expect(response.body.success).toBe(false);

    expect(response.body.error.code).toBe(
      "AUTHENTICATION_REQUIRED"
    );

    expect(kitFindMock).not.toHaveBeenCalled();
  });

  // --------------------------------------------------
  // GET SINGLE KIT
  // --------------------------------------------------

  it("returns a kit belonging to the authenticated user", async () => {
    const mockKit = {
      _id: {
        toString: () => TEST_KIT_ID,
      },
      title: "Full Stack Developer",
      status: "ready",
      kit: generatedKit,
      createdAt: new Date("2026-09-18T10:00:00.000Z"),
      updatedAt: new Date("2026-09-18T11:00:00.000Z"),
    };

    const leanMock = vi.fn().mockResolvedValue(mockKit);

    kitFindOneMock.mockReturnValue({
      lean: leanMock,
    });

    const response = await request(app)
      .get(`/api/kits/${TEST_KIT_ID}`)
      .set("Cookie", "access_token=test-jwt-token")
      .expect(200);

    expect(kitFindOneMock).toHaveBeenCalledWith({
      _id: TEST_KIT_ID,
      userId: TEST_USER_ID,
    });

    expect(response.body.success).toBe(true);

    expect(response.body.kit).toEqual({
      id: TEST_KIT_ID,
      title: "Full Stack Developer",
      status: "ready",
      data: generatedKit,
      createdAt: mockKit.createdAt.toISOString(),
      updatedAt: mockKit.updatedAt.toISOString(),
    });
  });

  // --------------------------------------------------
  // GET SINGLE KIT - NOT FOUND
  // --------------------------------------------------

  it("returns 404 when the requested kit does not belong to the user", async () => {
    const leanMock = vi.fn().mockResolvedValue(null);

    kitFindOneMock.mockReturnValue({
      lean: leanMock,
    });

    const response = await request(app)
      .get(`/api/kits/${TEST_KIT_ID}`)
      .set("Cookie", "access_token=test-jwt-token")
      .expect(404);

    expect(kitFindOneMock).toHaveBeenCalledWith({
      _id: TEST_KIT_ID,
      userId: TEST_USER_ID,
    });

    expect(response.body.success).toBe(false);

    expect(response.body.error.code).toBe(
      "KIT_NOT_FOUND"
    );
  });

  // --------------------------------------------------
  // GET SINGLE KIT - AUTH
  // --------------------------------------------------

  it("requires authentication when getting a single kit", async () => {
    const response = await request(app)
      .get(`/api/kits/${TEST_KIT_ID}`)
      .expect(401);

    expect(response.body.success).toBe(false);

    expect(response.body.error.code).toBe(
      "AUTHENTICATION_REQUIRED"
    );

    expect(kitFindOneMock).not.toHaveBeenCalled();
  });
});


// --------------------------------------------------
// DUPLICATE GENERATION
// --------------------------------------------------

it("rejects generation when another kit is already generating", async () => {
  const existingKit = {
    _id: {
      toString: () => "existing-kit-123",
    },

    title: "Existing Interview Prep Kit",

    status: "generating",

    kit: null,
  };

  kitFindOneMock.mockReturnValueOnce({
    lean: vi.fn().mockResolvedValue(existingKit),
  });

  const response = await request(app)
    .post("/api/kits/generate")
    .set(
      "Cookie",
      "access_token=test-jwt-token"
    )
    .send({
      jd: "Full Stack Developer with React experience.",
      company_url:
        "https://acme.example.com/",
      days: 5,
    })
    .expect(409);

  expect(response.body.success).toBe(false);

  expect(response.body.error.code).toBe(
    "GENERATION_IN_PROGRESS"
  );

  expect(response.body.error.message).toBe(
    "An interview kit is already being generated"
  );

  /*
   * A second database record must NOT be created.
   */
  expect(kitCreateMock).not.toHaveBeenCalled();

  /*
   * The expensive LLM/crawler pipeline must NOT run.
   */
  expect(
    generateInterviewKitMock
  ).not.toHaveBeenCalled();
});


// --------------------------------------------------
// DUPLICATE GENERATION - DATABASE RACE
// --------------------------------------------------

it("returns 409 when MongoDB rejects a duplicate generating kit", async () => {
  kitCreateMock.mockRejectedValueOnce({
    code: 11000,
  });

  const response = await request(app)
    .post("/api/kits/generate")
    .set(
      "Cookie",
      "access_token=test-jwt-token"
    )
    .send({
      jd: "Full Stack Developer with React experience.",
      company_url:
        "https://acme.example.com/",
      days: 5,
    })
    .expect(409);

  expect(response.body.success).toBe(false);

  expect(response.body.error.code).toBe(
    "GENERATION_IN_PROGRESS"
  );

  expect(response.body.error.message).toBe(
    "An interview kit is already being generated"
  );

  expect(
    generateInterviewKitMock
  ).not.toHaveBeenCalled();
});