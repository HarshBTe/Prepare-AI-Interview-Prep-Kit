import { describe, expect, it } from "vitest";
import { interviewKitSchema } from "../src/lib/validation/kitSchema";

describe("Interview Kit Schema", () => {
  it("accepts a valid kit structure", () => {
    const kit = {
      source: {
        company: "Acme",
        company_url: "https://example.com",
        role: "Senior Backend Engineer",
        location: "Remote",
        jd_chars: 1200,
        researched_at: new Date().toISOString(),
        pages_used: ["https://example.com"],
      },

      company_brief: {
        summary: "A technology company.",
        what_they_do: "Builds software products.",
        sources: ["https://example.com"],
      },

      role: {
        title: "Senior Backend Engineer",
        seniority: "Senior",
        responsibilities: [
          "Build backend services",
        ],
        requirements: [
          {
            id: "r1",
            text: "Node.js experience",
            kind: "technical",
            priority: "must",
          },
        ],
      },

      questions: [
        {
          id: "q1",
          requirement_ids: ["r1"],
          category: "technical",
          prompt: "Explain your Node.js experience.",
          answer_outline: "Discuss relevant projects.",
          difficulty: 2,
        },
      ],

      flashcards: [
        {
          id: "f1",
          front: "What is Node.js?",
          back: "A JavaScript runtime.",
          requirement_ids: ["r1"],
        },
      ],

      schedule: {
        days_available: 1,
        days: [
          {
            day: 1,
            focus: "Technical",
            question_ids: ["q1"],
            minutes: 15,
          },
        ],
      },

      coverage: {
        uncovered_requirement_ids: [],
        passes: 1,
      },
    };

    const result = interviewKitSchema.safeParse(kit);

    expect(result.success).toBe(true);
  });
});