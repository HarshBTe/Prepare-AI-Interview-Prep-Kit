import { beforeEach, describe, expect, it, vi } from "vitest";

const { generateStructuredJsonMock } = vi.hoisted(() => ({
  generateStructuredJsonMock: vi.fn(),
}));

vi.mock("../src/pipeline/llm", () => ({
  generateStructuredJson: generateStructuredJsonMock,
}));

import { fillCoverageGaps } from "../src/pipeline/gapFill";

const role = {
  title: "Full Stack Developer",
  seniority: "Mid-level",
  responsibilities: [
    "Build React applications",
    "Develop REST APIs",
  ],
  requirements: [
    {
      id: "req-technical-001",
      text: "React.js experience",
      kind: "technical" as const,
      priority: "must" as const,
    },
    {
      id: "req-technical-002",
      text: "Node.js experience",
      kind: "technical" as const,
      priority: "must" as const,
    },
    {
      id: "req-domain-003",
      text: "REST API knowledge",
      kind: "domain" as const,
      priority: "nice" as const,
    },
  ],
};

const companyBrief = {
  summary: "Acme builds business software.",
  what_they_do: "Acme provides workflow software.",
  sources: ["https://example.com/"],
};

describe("fillCoverageGaps", () => {
  beforeEach(() => {
    generateStructuredJsonMock.mockReset();
  });

  it("does not call the LLM when all must requirements are covered", async () => {
    const questions = [
      {
        id: "q-001",
        requirement_ids: ["req-technical-001"],
        category: "technical" as const,
        prompt: "Explain React.",
        answer_outline: "Discuss React concepts.",
        difficulty: 1 as const,
      },
      {
        id: "q-002",
        requirement_ids: ["req-technical-002"],
        category: "technical" as const,
        prompt: "Explain Node.js.",
        answer_outline: "Discuss Node.js concepts.",
        difficulty: 2 as const,
      },
    ];

    const result = await fillCoverageGaps(
      role,
      companyBrief,
      questions
    );

    expect(result.questions).toEqual(questions);
    expect(result.uncoveredRequirementIds).toEqual([]);
    expect(result.passes).toBe(1);

    expect(
      generateStructuredJsonMock
    ).not.toHaveBeenCalled();
  });

  it("generates targeted questions for uncovered requirements", async () => {
    generateStructuredJsonMock.mockResolvedValue({
      questions: [
        {
          requirement_ids: ["req-technical-002"],
          category: "technical",
          prompt: "Explain how Node.js handles asynchronous operations.",
          answer_outline:
            "Discuss event loop, promises, async/await.",
          difficulty: 2,
        },
      ],
    });

    const initialQuestions = [
      {
        id: "q-001",
        requirement_ids: ["req-technical-001"],
        category: "technical" as const,
        prompt: "Explain React.",
        answer_outline: "Discuss React concepts.",
        difficulty: 1 as const,
      },
    ];

    const result = await fillCoverageGaps(
      role,
      companyBrief,
      initialQuestions
    );

    expect(result.questions).toHaveLength(2);

    expect(result.questions[1]).toEqual({
      id: "q-002",
      requirement_ids: ["req-technical-002"],
      category: "technical",
      prompt:
        "Explain how Node.js handles asynchronous operations.",
      answer_outline:
        "Discuss event loop, promises, async/await.",
      difficulty: 2,
    });

    expect(result.uncoveredRequirementIds).toEqual([]);
    expect(result.passes).toBe(2);
    expect(
      generateStructuredJsonMock
    ).toHaveBeenCalledTimes(1);
  });

  it("stops after the maximum number of passes", async () => {
    generateStructuredJsonMock.mockResolvedValue({
      questions: [],
    });

    const initialQuestions = [
      {
        id: "q-001",
        requirement_ids: ["req-technical-001"],
        category: "technical" as const,
        prompt: "Explain React.",
        answer_outline: "Discuss React concepts.",
        difficulty: 1 as const,
      },
    ];

    const result = await fillCoverageGaps(
      role,
      companyBrief,
      initialQuestions
    );

    expect(result.passes).toBe(2);
    expect(result.uncoveredRequirementIds).toEqual([
      "req-technical-002",
    ]);

    expect(
      generateStructuredJsonMock
    ).toHaveBeenCalledTimes(1);
  });

  it("rejects unknown requirement IDs from the gap-fill model", async () => {
    generateStructuredJsonMock.mockResolvedValue({
      questions: [
        {
          requirement_ids: ["req-unknown-999"],
          category: "technical",
          prompt: "Invalid question.",
          answer_outline: "Invalid outline.",
          difficulty: 1,
        },
      ],
    });

    const initialQuestions = [
      {
        id: "q-001",
        requirement_ids: ["req-technical-001"],
        category: "technical" as const,
        prompt: "Explain React.",
        answer_outline: "Discuss React concepts.",
        difficulty: 1 as const,
      },
    ];

    await expect(
      fillCoverageGaps(
        role,
        companyBrief,
        initialQuestions
      )
    ).rejects.toThrow(
      "Gap-fill question references unknown requirement ID: req-unknown-999"
    );
  });
});