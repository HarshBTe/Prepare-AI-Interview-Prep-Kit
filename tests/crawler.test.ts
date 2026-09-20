import { beforeEach, describe, expect, it, vi } from "vitest";

const { fetchPageMock } = vi.hoisted(() => ({
  fetchPageMock: vi.fn(),
}));

vi.mock("../src/crawler/fetchPage", () => ({
  fetchPage: fetchPageMock,
}));

import { crawlCompany } from "../src/crawler/crawler";
import type { FetchedPage } from "../src/crawler/types";

describe("Company crawler", () => {
  beforeEach(() => {
    fetchPageMock.mockReset();
  });

  it("should crawl the homepage and relevant internal pages", async () => {
    const homepage: FetchedPage = {
      url: "https://example.com/",
      status: 200,
      contentType: "text/html",
      text: `
        <html>
          <body>
            <a href="/about">About Us</a>
            <a href="/careers">Careers</a>
            <a href="/team">Our Team</a>
          </body>
        </html>
      `,
    };

    const careersPage: FetchedPage = {
      url: "https://example.com/careers",
      status: 200,
      contentType: "text/html",
      text: `
        <html>
          <body>
            <h1>Careers</h1>
            <p>Join our engineering team.</p>
          </body>
        </html>
      `,
    };

    const aboutPage: FetchedPage = {
      url: "https://example.com/about",
      status: 200,
      contentType: "text/html",
      text: `
        <html>
          <body>
            <h1>About</h1>
          </body>
        </html>
      `,
    };

    fetchPageMock.mockImplementation(async (url: string) => {
      if (url === "https://example.com/") {
        return homepage;
      }

      if (url === "https://example.com/careers") {
        return careersPage;
      }

      if (url === "https://example.com/about") {
        return aboutPage;
      }

      throw new Error(`Unexpected URL: ${url}`);
    });

    const result = await crawlCompany(
      "https://example.com/",
      {
        maxPages: 3,
        respectRobots: false,
      }
    );

    expect(result.pages.length).toBeGreaterThan(0);

    expect(result.pagesUsed).toContain(
      "https://example.com/"
    );

    expect(result.pagesUsed).toContain(
      "https://example.com/careers"
    );
  });

  it("should respect the maximum page limit", async () => {
    const homepage: FetchedPage = {
      url: "https://example.com/",
      status: 200,
      contentType: "text/html",
      text: `
        <a href="/careers">Careers</a>
        <a href="/about">About</a>
        <a href="/team">Team</a>
        <a href="/company">Company</a>
        <a href="/interview">Interview</a>
      `,
    };

    fetchPageMock.mockImplementation(async (url: string) => ({
      url,
      status: 200,
      contentType: "text/html",
      text: "<p>Page</p>",
    }));

const result = await crawlCompany(
  "https://example.com/",
  {
    maxPages: 3,
    respectRobots: false,
  }
);

    expect(result.pages.length).toBeLessThanOrEqual(3);
  });

  it("should not crawl external links", async () => {
    const homepage: FetchedPage = {
      url: "https://example.com/",
      status: 200,
      contentType: "text/html",
      text: `
        <a href="https://evil.example.com/careers">
          Careers
        </a>

        <a href="/about">
          About
        </a>
      `,
    };

    fetchPageMock.mockImplementation(async (url: string) => {
      if (url === "https://example.com/") {
        return homepage;
      }

      return {
        url,
        status: 200,
        contentType: "text/html",
        text: "<p>About</p>",
      };
    });

    const result = await crawlCompany(
      "https://example.com/",
      {
        maxPages: 3,
        respectRobots: false,
      }
    );

    expect(result.pagesUsed).not.toContain(
      "https://evil.example.com/careers"
    );
  });

  it("should continue when a page fails to load", async () => {
    const homepage: FetchedPage = {
      url: "https://example.com/",
      status: 200,
      contentType: "text/html",
      text: `
        <a href="/careers">Careers</a>
        <a href="/about">About</a>
      `,
    };

    fetchPageMock.mockImplementation(async (url: string) => {
      if (url === "https://example.com/") {
        return homepage;
      }

      if (url === "https://example.com/careers") {
        throw new Error("Request failed");
      }

      return {
        url,
        status: 200,
        contentType: "text/html",
        text: "<p>About page</p>",
      };
    });

    const result = await crawlCompany(
      "https://example.com/",
      {
        maxPages: 3,
        respectRobots: false,
      }
    );

    expect(result.pagesUsed).toContain(
      "https://example.com/"
    );

    expect(result.pagesUsed).toContain(
      "https://example.com/about"
    );
  });

  it("should not return duplicate pages", async () => {
    const homepage: FetchedPage = {
      url: "https://example.com/",
      status: 200,
      contentType: "text/html",
      text: `
        <a href="/careers">Careers</a>
        <a href="/careers#engineering">
          Engineering Careers
        </a>
      `,
    };

    fetchPageMock.mockImplementation(async (url: string) => ({
      url,
      status: 200,
      contentType: "text/html",
      text: "<p>Page</p>",
    }));

    const result = await crawlCompany(
      "https://example.com/",
      {
        maxPages: 5,
        respectRobots: false,
      }
    );

    const uniqueUrls = new Set(result.pagesUsed);

    expect(result.pagesUsed.length).toBe(
      uniqueUrls.size
    );
  });
});