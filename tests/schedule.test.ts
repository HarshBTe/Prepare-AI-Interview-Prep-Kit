import { describe, expect, it } from "vitest";
import {
  allocateSchedule,
} from "../src/pipeline/schedule";

const requirements = [
  {
    id: "req-tech-001",
    text: "React",
    kind: "technical" as const,
    priority: "must" as const,
  },
  {
    id: "req-tech-002",
    text: "Node.js",
    kind: "technical" as const,
    priority: "must" as const,
  },
  {
    id: "req-domain-001",
    text: "REST APIs",
    kind: "domain" as const,
    priority: "nice" as const,
  },
];

const questions = [
  {
    id: "q-001",
    requirement_ids: ["req-tech-001"],
    category: "technical" as const,
    prompt: "Explain React rendering.",
    answer_outline: "Discuss rendering.",
    difficulty: 2 as const,
  },
  {
    id: "q-002",
    requirement_ids: ["req-tech-002"],
    category: "system-design" as const,
    prompt: "Design a scalable API.",
    answer_outline: "Discuss scaling.",
    difficulty: 3 as const,
  },
  {
    id: "q-003",
    requirement_ids: ["req-domain-001"],
    category: "technical" as const,
    prompt: "Explain REST.",
    answer_outline: "Discuss REST principles.",
    difficulty: 1 as const,
  },
  {
    id: "q-004",
    requirement_ids: [],
    category: "behavioural" as const,
    prompt: "Tell me about teamwork.",
    answer_outline: "Use STAR.",
    difficulty: 1 as const,
  },
  {
    id: "q-005",
    requirement_ids: [],
    category: "company-fit" as const,
    prompt: "Why this company?",
    answer_outline: "Discuss company fit.",
    difficulty: 2 as const,
  },
];

describe("allocateSchedule", () => {
  it("creates exactly the requested number of days", () => {
    const schedule = allocateSchedule(
      questions,
      requirements,
      5
    );

    expect(schedule.days_available).toBe(5);
    expect(schedule.days).toHaveLength(5);

    expect(schedule.days.map((day) => day.day)).toEqual([
      1,
      2,
      3,
      4,
      5,
    ]);
  });

  it("uses integer minutes", () => {
    const schedule = allocateSchedule(
      questions,
      requirements,
      5
    );

    for (const day of schedule.days) {
      expect(Number.isInteger(day.minutes)).toBe(
        true
      );
    }
  });

  it("schedules every question exactly once", () => {
    const schedule = allocateSchedule(
      questions,
      requirements,
      5
    );

    const scheduledIds =
      schedule.days.flatMap(
        (day) => day.question_ids
      );

    expect(scheduledIds).toHaveLength(
      questions.length
    );

    expect(new Set(scheduledIds).size).toBe(
      questions.length
    );
  });

  it("keeps behavioural and company-fit questions in the final two days", () => {
    const schedule = allocateSchedule(
      questions,
      requirements,
      5
    );

    const finalDays = schedule.days
      .slice(-2)
      .flatMap((day) => day.question_ids);

    expect(finalDays).toContain("q-004");
    expect(finalDays).toContain("q-005");

    const earlyDays = schedule.days
      .slice(0, -2)
      .flatMap((day) => day.question_ids);

    expect(earlyDays).not.toContain("q-004");
    expect(earlyDays).not.toContain("q-005");
  });

  it("places technical and system-design work before final preparation", () => {
    const schedule = allocateSchedule(
      questions,
      requirements,
      5
    );

    const earlyDays = schedule.days
      .slice(0, 3)
      .flatMap((day) => day.question_ids);

    expect(earlyDays).toContain("q-001");
    expect(earlyDays).toContain("q-002");
    expect(earlyDays).toContain("q-003");
  });

  it("covers every must requirement", () => {
    const schedule = allocateSchedule(
      questions,
      requirements,
      5
    );

    const scheduledIds =
      new Set(
        schedule.days.flatMap(
          (day) => day.question_ids
        )
      );

    const scheduledQuestions =
      questions.filter((question) =>
        scheduledIds.has(question.id)
      );

    const coveredRequirements =
      new Set(
        scheduledQuestions.flatMap(
          (question) =>
            question.requirement_ids
        )
      );

    expect(
      coveredRequirements.has("req-tech-001")
    ).toBe(true);

    expect(
      coveredRequirements.has("req-tech-002")
    ).toBe(true);
  });

  it("supports a one-day schedule", () => {
    const schedule = allocateSchedule(
      questions,
      requirements,
      1
    );

    expect(schedule.days).toHaveLength(1);

    const scheduledIds =
      schedule.days.flatMap(
        (day) => day.question_ids
      );

    expect(scheduledIds).toHaveLength(
      questions.length
    );
  });

  it("supports a sixty-day schedule", () => {
    const schedule = allocateSchedule(
      questions,
      requirements,
      60
    );

    expect(schedule.days).toHaveLength(60);

    const scheduledIds =
      schedule.days.flatMap(
        (day) => day.question_ids
      );

    expect(scheduledIds).toHaveLength(
      questions.length
    );
  });

  it("produces deterministic output", () => {
    const first = allocateSchedule(
      questions,
      requirements,
      5
    );

    const second = allocateSchedule(
      questions,
      requirements,
      5
    );

    expect(second).toEqual(first);
  });

  it("rejects invalid day counts", () => {
    expect(() =>
      allocateSchedule(
        questions,
        requirements,
        0
      )
    ).toThrow(
      "daysAvailable must be a positive integer"
    );

    expect(() =>
      allocateSchedule(
        questions,
        requirements,
        1.5
      )
    ).toThrow(
      "daysAvailable must be a positive integer"
    );
  });
});