import axios from "axios";
import * as cheerio from "cheerio";
import { fetchPage } from "./fetchPage";
import { rankInternalLinks } from "./linkRanker";
import { validateCompanyUrl } from "../lib/validation/urlValidation";
import type {
  CrawlResult,
  FetchedPage,
  RankedLink,
} from "./types";

const MAX_PAGES = 6;
const MAX_REDIRECTS = 5;

const USER_AGENT =
  "AI-Interview-Prep-Kit/1.0 (+https://example.com/bot)";

interface CrawlOptions {
  maxPages?: number;
  respectRobots?: boolean;
}

function extractLinks(
  html: string
): Array<{ href: string; text: string }> {
  const $ = cheerio.load(html);

  const links: Array<{ href: string; text: string }> = [];

  $("a[href]").each((_, element) => {
    const href = $(element).attr("href");

    if (!href) {
      return;
    }

    const text = $(element).text().replace(/\s+/g, " ").trim();

    links.push({
      href,
      text,
    });
  });

  return links;
}

async function canCrawl(
  url: string,
  respectRobots: boolean
): Promise<boolean> {
  if (!respectRobots) {
    return true;
  }

  let validatedUrl: URL;

  try {
    validatedUrl = await validateCompanyUrl(url);
  } catch {
    return false;
  }

  const robotsUrl = new URL("/robots.txt", validatedUrl);

  try {
    const response = await axios.get<string>(robotsUrl.toString(), {
      timeout: 5000,
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "text/plain,text/*",
      },
      responseType: "text",
      maxContentLength: 100 * 1024,
      maxBodyLength: 100 * 1024,
      validateStatus: (status) => status >= 200 && status < 400,
    });

    if (response.status >= 300) {
      return true;
    }

    return isAllowedByRobots(
      response.data,
      validatedUrl.pathname
    );
  } catch {
    // If robots.txt cannot be retrieved, continue crawling.
    return true;
  }
}

function isAllowedByRobots(
  robotsText: string,
  pathname: string
): boolean {
  const lines = robotsText.split(/\r?\n/);

  let appliesToOurUserAgent = false;
  let appliesToWildcard = false;
  let disallowRules: string[] = [];

  for (const rawLine of lines) {
    const line = rawLine.split("#")[0].trim();

    if (!line) {
      continue;
    }

    const separatorIndex = line.indexOf(":");

    if (separatorIndex === -1) {
      continue;
    }

    const directive = line
      .slice(0, separatorIndex)
      .trim()
      .toLowerCase();

    const value = line
      .slice(separatorIndex + 1)
      .trim();

    if (directive === "user-agent") {
      const normalizedAgent = value.toLowerCase();

      appliesToOurUserAgent =
        normalizedAgent.includes(
          "ai-interview-prep-kit"
        );

      appliesToWildcard = normalizedAgent === "*";

      continue;
    }

    if (directive === "disallow") {
      if (
        appliesToOurUserAgent ||
        appliesToWildcard
      ) {
        if (value) {
          disallowRules.push(value);
        }
      }
    }
  }

  return !disallowRules.some((rule) =>
    pathname.startsWith(rule)
  );
}

function deduplicatePages(
  pages: FetchedPage[]
): FetchedPage[] {
  const unique = new Map<string, FetchedPage>();

  for (const page of pages) {
    if (!unique.has(page.url)) {
      unique.set(page.url, page);
    }
  }

  return [...unique.values()];
}

async function crawlPage(
  url: string,
  pages: FetchedPage[],
  visited: Set<string>,
  respectRobots: boolean
): Promise<RankedLink[]> {
  if (visited.has(url)) {
    return [];
  }

  visited.add(url);

 if (respectRobots) {
  const allowed = await canCrawl(url, respectRobots);

  if (!allowed) {
    return [];
  }
}

  try {
    const page = await fetchPage(url);

    pages.push(page);

    const links = extractLinks(page.text);

    return rankInternalLinks(url, links);
  } catch {
    return [];
  }
}

export async function crawlCompany(
  companyUrl: string,
  options: CrawlOptions = {}
): Promise<CrawlResult> {
  const maxPages = Math.min(
    Math.max(options.maxPages ?? MAX_PAGES, 1),
    MAX_PAGES
  );

  const pages: FetchedPage[] = [];
  const visited = new Set<string>();

  // Crawl homepage first.
  const homepageLinks = await crawlPage(
  companyUrl,
  pages,
  visited,
  options.respectRobots ?? true
);

  const rankedLinks = [...homepageLinks];

  // Fetch highest-ranked internal pages.
  for (
    const link of rankedLinks.slice(0, maxPages - 1)
  ) {
    if (pages.length >= maxPages) {
      break;
    }

   await crawlPage(
  link.url,
  pages,
  visited,
  options.respectRobots ?? true
);
  }

  const uniquePages = deduplicatePages(pages);

  return {
    pages: uniquePages,
    pagesUsed: uniquePages.map((page) => page.url),
  };
}