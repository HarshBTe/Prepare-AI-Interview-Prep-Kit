import { beforeEach, describe, expect, it, vi } from "vitest";

const { generateStructuredJsonMock } = vi.hoisted(() => ({
  generateStructuredJsonMock: vi.fn(),
}));

vi.mock("../src/pipeline/llm", () => ({
  generateStructuredJson: generateStructuredJsonMock,
}));

import { buildCompanyBrief } from "../src/pipeline/companyBrief";
import type { FetchedPage } from "../src/crawler/types";

describe("buildCompanyBrief", () => {
  beforeEach(() => {
    generateStructuredJsonMock.mockReset();
  });

  it("builds a company brief from crawled pages", async () => {
    generateStructuredJsonMock.mockResolvedValue({
      summary:
        "Acme builds software products for business customers.",
      what_they_do:
        "The company provides software solutions for managing business workflows.",
    });

    const pages: FetchedPage[] = [
      {
        url: "https://acme.example.com/",
        status: 200,
        contentType: "text/html",
        text: `
          Acme builds software products for business customers.
          Our platform helps companies manage business workflows.
        `,
      },
      {
        url: "https://acme.example.com/about",
        status: 200,
        contentType: "text/html",
        text: `
          Acme provides software solutions for organizations.
        `,
      },
    ];

    const result = await buildCompanyBrief(pages);

    expect(result.summary).toBe(
      "Acme builds software products for business customers."
    );

    expect(result.what_they_do).toBe(
      "The company provides software solutions for managing business workflows."
    );

    expect(result.sources).toEqual([
      "https://acme.example.com/",
      "https://acme.example.com/about",
    ]);

    expect(generateStructuredJsonMock).toHaveBeenCalledTimes(1);
  });

  it("uses every crawled page as research context", async () => {
    generateStructuredJsonMock.mockResolvedValue({
      summary: "Company summary",
      what_they_do: "Company activity",
    });

    const pages: FetchedPage[] = [
      {
        url: "https://example.com/",
        status: 200,
        contentType: "text/html",
        text: "Homepage information",
      },
      {
        url: "https://example.com/careers",
        status: 200,
        contentType: "text/html",
        text: "Engineering and hiring information",
      },
    ];

    await buildCompanyBrief(pages);

    const call = generateStructuredJsonMock.mock.calls[0][0];

    const userMessage = call.messages.find(
      (message: { role: string }) => message.role === "user"
    );

    expect(userMessage.content).toContain(
      "https://example.com/"
    );

    expect(userMessage.content).toContain(
      "Homepage information"
    );

    expect(userMessage.content).toContain(
      "https://example.com/careers"
    );

    expect(userMessage.content).toContain(
      "Engineering and hiring information"
    );
  });

  it("keeps the source list controlled by the application", async () => {
    generateStructuredJsonMock.mockResolvedValue({
      summary: "Company summary",
      what_they_do: "Company activity",
    });

    const pages: FetchedPage[] = [
      {
        url: "https://example.com/",
        status: 200,
        contentType: "text/html",
        text: "Company information",
      },
    ];

    const result = await buildCompanyBrief(pages);

    expect(result.sources).toEqual([
      "https://example.com/",
    ]);
  });

  it("rejects empty research input", async () => {
    await expect(
      buildCompanyBrief([])
    ).rejects.toThrow(
      "No company pages were available for company research"
    );

    expect(generateStructuredJsonMock).not.toHaveBeenCalled();
  });

  it("rejects invalid LLM output", async () => {
    generateStructuredJsonMock.mockResolvedValue({
      summary: "Company summary",
    });

    const pages: FetchedPage[] = [
      {
        url: "https://example.com/",
        status: 200,
        contentType: "text/html",
        text: "Company information",
      },
    ];

    await expect(
      buildCompanyBrief(pages)
    ).rejects.toThrow();
  });
});