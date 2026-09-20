import { beforeEach, describe, expect, it, vi } from "vitest";

const { generateStructuredJsonMock } = vi.hoisted(() => ({
  generateStructuredJsonMock: vi.fn(),
}));

vi.mock("../src/pipeline/llm", () => ({
  generateStructuredJson: generateStructuredJsonMock,
}));

import { generateFlashcards } from "../src/pipeline/flashcards";

const requirements = [
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
];

const questions = [
  {
    id: "q-001",
    requirement_ids: ["req-technical-001"],
    category: "technical" as const,
    prompt: "Explain React rendering.",
    answer_outline:
      "Discuss rendering and reconciliation.",
    difficulty: 2 as const,
  },
  {
    id: "q-002",
    requirement_ids: ["req-technical-002"],
    category: "technical" as const,
    prompt: "Explain the Node.js event loop.",
    answer_outline:
      "Discuss event loop and asynchronous execution.",
    difficulty: 2 as const,
  },
];

describe("generateFlashcards", () => {
  beforeEach(() => {
    generateStructuredJsonMock.mockReset();
  });

  it("generates normalized flashcards with stable IDs", async () => {
    generateStructuredJsonMock.mockResolvedValue({
      flashcards: [
        {
          front: "  What is React reconciliation? ",
          back:
            "React compares the previous and next virtual trees and updates the required DOM changes.",
          requirement_ids: ["req-technical-001"],
        },
        {
          front: "What is the Node.js event loop?",
          back:
            "It coordinates asynchronous callbacks and non-blocking operations.",
          requirement_ids: ["req-technical-002"],
        },
      ],
    });

    const result = await generateFlashcards(
      requirements,
      questions
    );

    expect(result).toHaveLength(2);

    expect(result[0]).toEqual({
      id: "fc-001",
      front: "What is React reconciliation?",
      back:
        "React compares the previous and next virtual trees and updates the required DOM changes.",
      requirement_ids: ["req-technical-001"],
    });

    expect(result[1].id).toBe("fc-002");
  });

  it("removes duplicate requirement IDs", async () => {
    generateStructuredJsonMock.mockResolvedValue({
      flashcards: [
        {
          front: "What is React?",
          back: "A UI library.",
          requirement_ids: [
            "req-technical-001",
            "req-technical-001",
          ],
        },
      ],
    });

    const result = await generateFlashcards(
      requirements,
      questions
    );

    expect(result[0].requirement_ids).toEqual([
      "req-technical-001",
    ]);
  });

  it("rejects unknown requirement IDs", async () => {
    generateStructuredJsonMock.mockResolvedValue({
      flashcards: [
        {
          front: "Invalid card",
          back: "Invalid answer",
          requirement_ids: ["req-unknown-999"],
        },
      ],
    });

    await expect(
      generateFlashcards(requirements, questions)
    ).rejects.toThrow(
      "Flashcard references unknown requirement ID: req-unknown-999"
    );
  });

  it("rejects when requirements are empty", async () => {
    await expect(
      generateFlashcards([], questions)
    ).rejects.toThrow(
      "At least one requirement is needed to generate flashcards"
    );

    expect(
      generateStructuredJsonMock
    ).not.toHaveBeenCalled();
  });

  it("rejects when questions are empty", async () => {
    await expect(
      generateFlashcards(requirements, [])
    ).rejects.toThrow(
      "At least one question is needed to generate flashcards"
    );

    expect(
      generateStructuredJsonMock
    ).not.toHaveBeenCalled();
  });

  it("rejects invalid LLM output", async () => {
    generateStructuredJsonMock.mockResolvedValue({
      flashcards: [
        {
          front: "What is React?",
          requirement_ids: ["req-technical-001"],
        },
      ],
    });

    await expect(
      generateFlashcards(requirements, questions)
    ).rejects.toThrow();
  });
});