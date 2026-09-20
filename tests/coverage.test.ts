import { describe, expect, it } from "vitest";
import { checkCoverage } from "../src/pipeline/coverage";
import type { Question, Requirement } from "../src/types/kit";

describe("Coverage checker", () => {
  it("should identify uncovered must requirements", () => {
    const requirements: Requirement[] = [
      {
        id: "req-1",
        text: "React.js",
        kind: "technical",
        priority: "must",
      },
      {
        id: "req-2",
        text: "TypeScript",
        kind: "technical",
        priority: "must",
      },
      {
        id: "req-3",
        text: "Communication",
        kind: "behavioural",
        priority: "nice",
      },
    ];

    const questions: Question[] = [
      {
        id: "q-1",
        requirement_ids: ["req-1"],
        category: "technical",
        prompt: "Explain your experience with React.",
        answer_outline: "Discuss components, hooks and state management.",
        difficulty: 2,
      },
      {
        id: "q-2",
        requirement_ids: ["req-3"],
        category: "behavioural",
        prompt: "Tell me about a communication challenge.",
        answer_outline: "Describe situation, action and result.",
        difficulty: 1,
      },
    ];

    const result = checkCoverage(requirements, questions);

    expect(result.uncoveredRequirementIds).toEqual(["req-2"]);
    expect(result.passes).toBe(1);
  });

  it("should return no uncovered requirements when all must requirements are covered", () => {
    const requirements: Requirement[] = [
      {
        id: "req-1",
        text: "React.js",
        kind: "technical",
        priority: "must",
      },
      {
        id: "req-2",
        text: "TypeScript",
        kind: "technical",
        priority: "must",
      },
    ];

    const questions: Question[] = [
      {
        id: "q-1",
        requirement_ids: ["req-1", "req-2"],
        category: "technical",
        prompt: "Explain your React and TypeScript experience.",
        answer_outline: "Discuss React with TypeScript.",
        difficulty: 2,
      },
    ];

    const result = checkCoverage(requirements, questions);

    expect(result.uncoveredRequirementIds).toEqual([]);
  });

  it("should ignore nice-to-have requirements", () => {
    const requirements: Requirement[] = [
      {
        id: "req-1",
        text: "React.js",
        kind: "technical",
        priority: "must",
      },
      {
        id: "req-2",
        text: "GraphQL",
        kind: "technical",
        priority: "nice",
      },
    ];

    const questions: Question[] = [
      {
        id: "q-1",
        requirement_ids: ["req-1"],
        category: "technical",
        prompt: "Explain your React experience.",
        answer_outline: "Discuss React projects.",
        difficulty: 2,
      },
    ];

    const result = checkCoverage(requirements, questions);

    expect(result.uncoveredRequirementIds).toEqual([]);
  });
});