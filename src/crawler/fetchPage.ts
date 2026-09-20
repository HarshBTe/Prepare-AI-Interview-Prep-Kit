// src/crawler/fetchPage.ts

import axios, { AxiosResponse } from "axios";
import { validateCompanyUrl } from "../lib/validation/urlValidation";
import type { FetchedPage } from "./types";

const MAX_PAYLOAD_BYTES = 2 * 1024 * 1024;
const REQUEST_TIMEOUT_MS = 5000;

const USER_AGENT =
  "AI-Interview-Prep-Kit/1.0 (+https://example.com/bot)";

function getContentLength(response: AxiosResponse): number {
  const value = response.headers["content-length"];

  if (!value) {
    return 0;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : 0;
}

function isHtmlContentType(contentType: string): boolean {
  return contentType.toLowerCase().includes("text/html");
}

export async function fetchPage(
  inputUrl: string,
  redirectCount = 0
): Promise<FetchedPage> {
  const validatedUrl = await validateCompanyUrl(inputUrl);

  if (redirectCount > 5) {
  throw new Error("Too many redirects");
}

  const response = await axios.get<string>(validatedUrl.toString(), {
    timeout: REQUEST_TIMEOUT_MS,

    headers: {
      "User-Agent": USER_AGENT,
      Accept: "text/html,application/xhtml+xml",
    },

    responseType: "text",

    // We need to inspect redirects ourselves so that
    // a public URL cannot redirect to a private address.
    maxRedirects: 0,

    validateStatus: (status) =>
      status >= 200 && status < 400,

    // Prevent axios from automatically accepting
    // arbitrarily large response bodies.
    maxContentLength: MAX_PAYLOAD_BYTES,
    maxBodyLength: MAX_PAYLOAD_BYTES,
  });

  // Handle redirects manually.
  if (
    response.status >= 300 &&
    response.status < 400 &&
    response.headers.location
  ) {
    const redirectedUrl = new URL(
      response.headers.location,
      validatedUrl
    ).toString();

    // Validate the redirect destination as well.

    return fetchPage(
  redirectedUrl,
  redirectCount + 1
);
  }

  const contentType = String(
    response.headers["content-type"] ?? ""
  );

  if (!isHtmlContentType(contentType)) {
    throw new Error(
      `Unsupported content type: ${contentType || "unknown"}`
    );
  }

  const contentLength = getContentLength(response);

  if (contentLength > MAX_PAYLOAD_BYTES) {
    throw new Error("Page exceeds the 2 MB payload limit");
  }

  const text = response.data;

  // Some servers do not provide Content-Length.
  // Therefore also check the actual response size.
  const actualSize = Buffer.byteLength(text, "utf8");

  if (actualSize > MAX_PAYLOAD_BYTES) {
    throw new Error("Page exceeds the 2 MB payload limit");
  }

  return {
    url: validatedUrl.toString(),
    status: response.status,
    contentType,
    text,
  };
}