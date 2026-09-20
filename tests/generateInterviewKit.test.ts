import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  crawlCompanyMock,
  validateCompanyUrlMock,
  extractRequirementsMock,
  buildCompanyBriefMock,
  generateQuestionsMock,
  fillCoverageGapsMock,
  generateFlashcardsMock,
  allocateScheduleMock,
  validateInterviewKitMock,
} = vi.hoisted(() => ({
  crawlCompanyMock: vi.fn(),
  validateCompanyUrlMock: vi.fn(),
  extractRequirementsMock: vi.fn(),
  buildCompanyBriefMock: vi.fn(),
  generateQuestionsMock: vi.fn(),
  fillCoverageGapsMock: vi.fn(),
  generateFlashcardsMock: vi.fn(),
  allocateScheduleMock: vi.fn(),
  validateInterviewKitMock: vi.fn(),
}));

vi.mock("../src/crawler/crawler", () => ({
  crawlCompany: crawlCompanyMock,
}));

vi.mock("../src/lib/validation/urlValidation", () => ({
  validateCompanyUrl: validateCompanyUrlMock,
}));

vi.mock("../src/pipeline/requirements", () => ({
  extractRequirementsFromJd:
    extractRequirementsMock,
}));

vi.mock("../src/pipeline/companyBrief", () => ({
  buildCompanyBrief: buildCompanyBriefMock,
}));

vi.mock("../src/pipeline/questions", () => ({
  generateQuestions: generateQuestionsMock,
}));

vi.mock("../src/pipeline/gapFill", () => ({
  fillCoverageGaps: fillCoverageGapsMock,
}));

vi.mock("../src/pipeline/flashcards", () => ({
  generateFlashcards: generateFlashcardsMock,
}));

vi.mock("../src/pipeline/schedule", () => ({
  allocateSchedule: allocateScheduleMock,
}));

vi.mock("../src/lib/validation/validateKit", () => ({
  validateInterviewKit:
    validateInterviewKitMock,
}));

import {
  generateInterviewKit,
} from "../src/pipeline/generateInterviewKit";

const validatedUrl = new URL(
  "https://acme.example.com/jobs"
);

const role = {
  title: "Full Stack Developer",
  seniority: "Mid-level",
  responsibilities: ["Build applications"],
  requirements: [
    {
      id: "req-technical-001",
      text: "React experience",
      kind: "technical" as const,
      priority: "must" as const,
    },
  ],
};

const companyBrief = {
  summary: "Acme builds software.",
  what_they_do: "Acme provides software.",
  sources: ["https://acme.example.com/"],
};

const questions = [
  {
    id: "q-001",
    requirement_ids: ["req-technical-001"],
    category: "technical" as const,
    prompt: "Explain React.",
    answer_outline: "Discuss React.",
    difficulty: 1 as const,
  },
];

const flashcards = [
  {
    id: "fc-001",
    front: "What is React?",
    back: "A UI library.",
    requirement_ids: ["req-technical-001"],
  },
];

const schedule = {
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
};

describe("generateInterviewKit", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    validateCompanyUrlMock.mockResolvedValue(
      validatedUrl
    );

    crawlCompanyMock.mockResolvedValue({
      pages: [
        {
          url: "https://acme.example.com/",
          status: 200,
          contentType: "text/html",
          text: "Acme company information",
        },
      ],
      pagesUsed: [
        "https://acme.example.com/",
      ],
    });

    extractRequirementsMock.mockResolvedValue(role);

    buildCompanyBriefMock.mockResolvedValue(
      companyBrief
    );

    generateQuestionsMock.mockResolvedValue(
      questions
    );

    fillCoverageGapsMock.mockResolvedValue({
      questions,
      uncoveredRequirementIds: [],
      passes: 1,
    });

    generateFlashcardsMock.mockResolvedValue(
      flashcards
    );

    allocateScheduleMock.mockReturnValue(
      schedule
    );

    validateInterviewKitMock.mockImplementation(
      (kit) => kit
    );
  });

  it("runs all pipeline stages in sequence", async () => {
    const result = await generateInterviewKit({
      jd: "Full Stack Developer with React experience.",
      company_url:
        "https://acme.example.com/",
      days: 5,
    });

    expect(validateCompanyUrlMock)
      .toHaveBeenCalledTimes(1);

    expect(crawlCompanyMock)
      .toHaveBeenCalledTimes(1);

    expect(extractRequirementsMock)
      .toHaveBeenCalledTimes(1);

    expect(buildCompanyBriefMock)
      .toHaveBeenCalledTimes(1);

    expect(generateQuestionsMock)
      .toHaveBeenCalledTimes(1);

    expect(fillCoverageGapsMock)
      .toHaveBeenCalledTimes(1);

    expect(generateFlashcardsMock)
      .toHaveBeenCalledTimes(1);

    expect(allocateScheduleMock)
      .toHaveBeenCalledTimes(1);

    expect(validateInterviewKitMock)
      .toHaveBeenCalledTimes(1);

    expect(result.source.company)
      .toBe("Acme");

    expect(result.source.jd_chars)
      .toBe(
        "Full Stack Developer with React experience."
          .length
      );
  });

  it("rejects an empty JD before making external calls", async () => {
    await expect(
      generateInterviewKit({
        jd: "   ",
        company_url:
          "https://acme.example.com/",
        days: 5,
      })
    ).rejects.toThrow(
      "Job description is required"
    );

    expect(
      validateCompanyUrlMock
    ).not.toHaveBeenCalled();

    expect(
      crawlCompanyMock
    ).not.toHaveBeenCalled();
  });

  it("rejects invalid day counts", async () => {
    await expect(
      generateInterviewKit({
        jd: "Full Stack Developer",
        company_url:
          "https://acme.example.com/",
        days: 61,
      })
    ).rejects.toThrow(
      "days must be an integer between 1 and 60"
    );

    expect(
      validateCompanyUrlMock
    ).not.toHaveBeenCalled();
  });

  it("fails with COMPANY_UNREACHABLE when no pages are crawled", async () => {
    crawlCompanyMock.mockResolvedValue({
      pages: [],
      pagesUsed: [],
    });

    await expect(
      generateInterviewKit({
        jd: "Full Stack Developer",
        company_url:
          "https://acme.example.com/",
        days: 5,
      })
    ).rejects.toThrow(
      "COMPANY_UNREACHABLE"
    );

    expect(
      buildCompanyBriefMock
    ).not.toHaveBeenCalled();

    expect(
      generateQuestionsMock
    ).not.toHaveBeenCalled();
  });

  it("passes gap-fill coverage into the final kit", async () => {
    fillCoverageGapsMock.mockResolvedValue({
      questions,
      uncoveredRequirementIds: [
        "req-technical-001",
      ],
      passes: 2,
    });

    const result = await generateInterviewKit({
      jd: "Full Stack Developer",
      company_url:
        "https://acme.example.com/",
      days: 5,
    });

    expect(
      result.coverage.uncovered_requirement_ids
    ).toEqual([
      "req-technical-001",
    ]);

    expect(result.coverage.passes).toBe(2);
  });
});