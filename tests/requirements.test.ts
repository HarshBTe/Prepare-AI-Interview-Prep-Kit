import { beforeEach, describe, expect, it, vi } from "vitest";

const { generateStructuredJsonMock } = vi.hoisted(() => ({
  generateStructuredJsonMock: vi.fn(),
}));

vi.mock("../src/pipeline/llm", () => ({
  generateStructuredJson: generateStructuredJsonMock,
}));

import { extractRequirementsFromJd } from "../src/pipeline/requirements";

describe("extractRequirementsFromJd", () => {
  beforeEach(() => {
    generateStructuredJsonMock.mockReset();
  });

  it("extracts and normalizes role requirements", async () => {
    generateStructuredJsonMock.mockResolvedValue({
      title: "Frontend Developer",
      seniority: "Mid-level",
      responsibilities: [
        " Build React applications ",
        "Collaborate with backend developers",
      ],
      requirements: [
        {
          text: "React.js experience",
          kind: "technical",
          priority: "must",
        },
        {
          text: "TypeScript experience",
          kind: "technical",
          priority: "must",
        },
        {
          text: "Strong communication",
          kind: "behavioural",
          priority: "nice",
        },
      ],
    });

    const role = await extractRequirementsFromJd(`
      We are looking for a Frontend Developer.
      Experience with React.js and TypeScript is required.
      Strong communication skills are preferred.
    `);

    expect(role.title).toBe("Frontend Developer");
    expect(role.seniority).toBe("Mid-level");

    expect(role.responsibilities).toEqual([
      "Build React applications",
      "Collaborate with backend developers",
    ]);

    expect(role.requirements).toHaveLength(3);

    expect(role.requirements[0]).toEqual({
      id: "req-technical-001",
      text: "React.js experience",
      kind: "technical",
      priority: "must",
    });

    expect(role.requirements[1].id).toBe("req-technical-002");

    expect(role.requirements[2]).toEqual({
      id: "req-behavioural-003",
      text: "Strong communication",
      kind: "behavioural",
      priority: "nice",
    });
  });

  it("keeps a thin JD thin", async () => {
    generateStructuredJsonMock.mockResolvedValue({
      title: "Software Engineer",
      seniority: "Not specified",
      responsibilities: ["Build software"],
      requirements: [
        {
          text: "JavaScript experience",
          kind: "technical",
          priority: "must",
        },
      ],
    });

    const role = await extractRequirementsFromJd(
      "Software Engineer. JavaScript experience required."
    );

    expect(role.title).toBe("Software Engineer");
    expect(role.requirements).toHaveLength(1);
  });

  it("rejects an empty JD", async () => {
    await expect(
      extractRequirementsFromJd("   ")
    ).rejects.toThrow("Job description is required");

    expect(generateStructuredJsonMock).not.toHaveBeenCalled();
  });

  it("rejects invalid LLM output", async () => {
    generateStructuredJsonMock.mockResolvedValue({
      title: "Frontend Developer",
      seniority: "Mid-level",
      responsibilities: [],
      requirements: [
        {
          text: "React.js",
          kind: "invalid-kind",
          priority: "must",
        },
      ],
    });

    await expect(
      extractRequirementsFromJd("Frontend Developer")
    ).rejects.toThrow();
  });
});