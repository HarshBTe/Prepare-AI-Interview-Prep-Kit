import { describe, expect, it } from "vitest";
import type { InterviewKit } from "../src/types/kit";

function validateAppendixA(kit: InterviewKit): void {
  expect(kit).toHaveProperty("source");
  expect(kit).toHaveProperty("company_brief");
  expect(kit).toHaveProperty("role");
  expect(kit).toHaveProperty("questions");
  expect(kit).toHaveProperty("flashcards");
  expect(kit).toHaveProperty("schedule");
  expect(kit).toHaveProperty("coverage");

  expect(Array.isArray(kit.questions)).toBe(true);
  expect(Array.isArray(kit.flashcards)).toBe(true);

  expect(kit.source).toBeDefined();
  expect(kit.company_brief).toBeDefined();
  expect(kit.role).toBeDefined();
  expect(kit.schedule).toBeDefined();
  expect(kit.coverage).toBeDefined();
}

describe("Appendix A", () => {
  it("uses the required InterviewKit top-level structure", () => {
    const sampleKit: InterviewKit = {
      source: {
        company: "Test Company",
        company_url: "https://example.com",
        role: "Frontend Developer",
        location: "India",
        jd_chars: 100,
        researched_at: new Date().toISOString(),
        pages_used: ["https://example.com"],
      },

      company_brief: {
        summary: "Test company summary",
        what_they_do: "Test company description",
        sources: ["https://example.com"],
      },

      role: {
        title: "Frontend Developer",
        seniority: "Junior",
        responsibilities: ["Build web applications"],
        requirements: [
          {
            id: "req-001",
            text: "React experience",
            kind: "technical",
            priority: "must",
          },
        ],
      },

      questions: [
        {
          id: "q-001",
          requirement_ids: ["req-001"],
          category: "technical",
          prompt: "Explain React hooks.",
          answer_outline: "Discuss useState and useEffect.",
          difficulty: 1,
        },
      ],

      flashcards: [
        {
          id: "fc-001",
          front: "What is useEffect?",
          back: "A React hook for side effects.",
          requirement_ids: ["req-001"],
        },
      ],

      schedule: {
        days_available: 1,
        days: [
          {
            day: 1,
            focus: "React fundamentals",
            question_ids: ["q-001"],
            minutes: 30,
          },
        ],
      },

      coverage: {
        uncovered_requirement_ids: [],
        passes: 1,
      },
    };

    validateAppendixA(sampleKit);
  });
});