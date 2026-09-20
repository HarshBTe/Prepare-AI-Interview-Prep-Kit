export interface FetchedPage {
  url: string;
  status: number;
  contentType: string;
  text: string;
}

export interface RankedLink {
  url: string;
  score: number;
  reason: string;
}

export interface CrawlResult {
  pages: FetchedPage[];
  pagesUsed: string[];
}