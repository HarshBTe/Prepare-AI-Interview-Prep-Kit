import { beforeEach, describe, expect, it, vi } from "vitest";

const { generateStructuredJsonMock } = vi.hoisted(() => ({
  generateStructuredJsonMock: vi.fn(),
}));

vi.mock("../src/pipeline/llm", () => ({
  generateStructuredJson: generateStructuredJsonMock,
}));

import { generateQuestions } from "../src/pipeline/questions";

const role = {
  title: "Full Stack Developer",
  seniority: "Mid-level",
  responsibilities: [
    "Build React applications",
    "Develop REST APIs",
    "Collaborate with backend developers",
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
      text: "Node.js and Express.js experience",
      kind: "technical" as const,
      priority: "must" as const,
    },
    {
      id: "req-domain-003",
      text: "Understanding of REST APIs",
      kind: "domain" as const,
      priority: "nice" as const,
    },
  ],
};

const companyBrief = {
  summary:
    "Acme builds software products for business customers.",
  what_they_do:
    "The company provides software solutions for business workflows.",
  sources: ["https://example.com/"],
};

describe("generateQuestions", () => {
  beforeEach(() => {
    generateStructuredJsonMock.mockReset();
  });

  it("generates normalized questions with stable IDs", async () => {
    generateStructuredJsonMock.mockResolvedValue({
      questions: [
        {
          requirement_ids: ["req-technical-001"],
          category: "technical",
          prompt: "  Explain how React rendering works. ",
          answer_outline:
            "Discuss component rendering, state updates, reconciliation.",
          difficulty: 2,
        },
        {
          requirement_ids: ["req-technical-002"],
          category: "system-design",
          prompt: "Design a scalable REST API.",
          answer_outline:
            "Discuss API design, validation, caching, scaling, monitoring.",
          difficulty: 3,
        },
        {
          requirement_ids: ["req-domain-003"],
          category: "behavioural",
          prompt: "Tell me about a time you solved an API integration issue.",
          answer_outline:
            "Explain context, debugging approach, communication, and result.",
          difficulty: 1,
        },
      ],
    });

    const questions = await generateQuestions(
      role,
      companyBrief
    );

    expect(questions).toHaveLength(3);

    expect(questions[0]).toEqual({
      id: "q-001",
      requirement_ids: ["req-technical-001"],
      category: "technical",
      prompt: "Explain how React rendering works.",
      answer_outline:
        "Discuss component rendering, state updates, reconciliation.",
      difficulty: 2,
    });

    expect(questions[1].id).toBe("q-002");
    expect(questions[2].id).toBe("q-003");
  });

  it("rejects unknown requirement IDs", async () => {
    generateStructuredJsonMock.mockResolvedValue({
      questions: [
        {
          requirement_ids: ["req-technical-999"],
          category: "technical",
          prompt: "Explain React.",
          answer_outline: "Discuss components and state.",
          difficulty: 1,
        },
      ],
    });

    await expect(
      generateQuestions(role, companyBrief)
    ).rejects.toThrow(
      "Question references unknown requirement ID: req-technical-999"
    );
  });

  it("removes duplicate requirement IDs from a question", async () => {
    generateStructuredJsonMock.mockResolvedValue({
      questions: [
        {
          requirement_ids: [
            "req-technical-001",
            "req-technical-001",
          ],
          category: "technical",
          prompt: "Explain React.",
          answer_outline: "Discuss components and state.",
          difficulty: 1,
        },
      ],
    });

    const questions = await generateQuestions(
      role,
      companyBrief
    );

    expect(questions[0].requirement_ids).toEqual([
      "req-technical-001",
    ]);
  });

  it("rejects generation when no requirements exist", async () => {
    const emptyRole = {
      ...role,
      requirements: [],
    };

    await expect(
      generateQuestions(emptyRole, companyBrief)
    ).rejects.toThrow(
      "At least one requirement is needed to generate questions"
    );

    expect(generateStructuredJsonMock).not.toHaveBeenCalled();
  });

  it("rejects invalid question output", async () => {
    generateStructuredJsonMock.mockResolvedValue({
      questions: [
        {
          requirement_ids: ["req-technical-001"],
          category: "invalid-category",
          prompt: "Explain React.",
          answer_outline: "Discuss React.",
          difficulty: 1,
        },
      ],
    });

    await expect(
      generateQuestions(role, companyBrief)
    ).rejects.toThrow();
  });
});