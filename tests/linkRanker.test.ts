import { describe, expect, it } from "vitest";
import { rankInternalLinks } from "../src/crawler/linkRanker";

describe("Link ranker", () => {
  const baseUrl = "https://example.com";

  it("should rank high-priority hiring links higher", () => {
  const result = rankInternalLinks(baseUrl, [
    {
      href: "/about",
      text: "About Us",
    },
    {
      href: "/careers",
      text: "Careers",
    },
    {
      href: "/how-we-hire",
      text: "How We Hire",
    },
  ]);

  const highPriorityLinks = result.filter(
    (link) => link.score === 100
  );

  expect(highPriorityLinks).toHaveLength(2);

  expect(
    highPriorityLinks.map((link) => link.url)
  ).toContain("https://example.com/careers");

  expect(
    highPriorityLinks.map((link) => link.url)
  ).toContain("https://example.com/how-we-hire");

  expect(result[0].score).toBe(100);
});

  it("should rank medium-priority links above normal links", () => {
    const result = rankInternalLinks(baseUrl, [
      {
        href: "/privacy",
        text: "Privacy Policy",
      },
      {
        href: "/team",
        text: "Our Team",
      },
    ]);

    expect(result[0].url).toBe(
      "https://example.com/team"
    );
    expect(result[0].score).toBe(50);
  });

  it("should ignore external links", () => {
    const result = rankInternalLinks(baseUrl, [
      {
        href: "https://other-company.com/careers",
        text: "Careers",
      },
    ]);

    expect(result).toHaveLength(0);
  });

  it("should ignore blacklisted file types", () => {
    const result = rankInternalLinks(baseUrl, [
      {
        href: "/company-brochure.pdf",
        text: "Company Brochure",
      },
      {
        href: "/logo.png",
        text: "Logo",
      },
      {
        href: "/careers",
        text: "Careers",
      },
    ]);

    expect(result).toHaveLength(1);
    expect(result[0].url).toBe(
      "https://example.com/careers"
    );
  });

  it("should remove URL fragments", () => {
    const result = rankInternalLinks(baseUrl, [
      {
        href: "/careers#engineering",
        text: "Careers",
      },
    ]);

    expect(result[0].url).toBe(
      "https://example.com/careers"
    );
  });

  it("should remove duplicate URLs", () => {
    const result = rankInternalLinks(baseUrl, [
      {
        href: "/careers",
        text: "Careers",
      },
      {
        href: "/careers#jobs",
        text: "Jobs",
      },
    ]);

    expect(result).toHaveLength(1);
    expect(result[0].score).toBe(100);
  });
});