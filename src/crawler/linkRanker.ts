import type { RankedLink } from "./types";

const HIGH_PRIORITY_KEYWORDS = [
  "hiring",
  "interview",
  "careers",
  "jobs",
  "culture",
  "engineering handbook",
  "engineering",
  "how we hire",
];

const MEDIUM_PRIORITY_KEYWORDS = [
  "about",
  "team",
  "mission",
  "company",
];

const BLACKLISTED_EXTENSIONS = [
  ".pdf",
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".svg",
  ".webp",
  ".zip",
  ".rar",
  ".mp4",
  ".mp3",
  ".avi",
  ".mov",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
  ".ppt",
  ".pptx",
];

function isBlacklisted(url: URL): boolean {
  const pathname = url.pathname.toLowerCase();

  return BLACKLISTED_EXTENSIONS.some((extension) =>
    pathname.endsWith(extension)
  );
}

function getLinkTextScore(text: string): {
  score: number;
  reason: string;
} {
  const normalizedText = text
    .toLowerCase()
    .trim()
    .replace(/[-_/]+/g, " ");

  for (const keyword of HIGH_PRIORITY_KEYWORDS) {
    const normalizedKeyword = keyword
      .toLowerCase()
      .replace(/[-_/]+/g, " ");

    if (normalizedText.includes(normalizedKeyword)) {
      return {
        score: 100,
        reason: `High-priority keyword: ${keyword}`,
      };
    }
  }

  for (const keyword of MEDIUM_PRIORITY_KEYWORDS) {
    const normalizedKeyword = keyword
      .toLowerCase()
      .replace(/[-_/]+/g, " ");

    if (normalizedText.includes(normalizedKeyword)) {
      return {
        score: 50,
        reason: `Medium-priority keyword: ${keyword}`,
      };
    }
  }

  return {
    score: 10,
    reason: "Internal page",
  };
}

export function rankInternalLinks(
  baseUrl: string,
  links: Array<{
    href: string;
    text: string;
  }>
): RankedLink[] {
  const base = new URL(baseUrl);

  const rankedLinks: RankedLink[] = [];

  for (const link of links) {
    if (!link.href) {
      continue;
    }

    let url: URL;

    try {
      url = new URL(link.href, base);
    } catch {
      continue;
    }

    if (!["http:", "https:"].includes(url.protocol)) {
      continue;
    }

    // Only crawl pages belonging to the same hostname.
    if (url.hostname !== base.hostname) {
      continue;
    }

    if (isBlacklisted(url)) {
      continue;
    }

    // Remove fragments because #section does not represent
    // a different page.
    url.hash = "";

    const { score, reason } = getLinkTextScore(
      link.text || url.pathname
    );

    rankedLinks.push({
      url: url.toString(),
      score,
      reason,
    });
  }

  // Remove duplicate URLs while preserving the highest score.
  const uniqueLinks = new Map<string, RankedLink>();

  for (const link of rankedLinks) {
    const existing = uniqueLinks.get(link.url);

    if (!existing || link.score > existing.score) {
      uniqueLinks.set(link.url, link);
    }
  }

  return [...uniqueLinks.values()].sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }

    return a.url.localeCompare(b.url);
  });
}