// src/pipeline/llm.ts

import axios from "axios";

const GROQ_API_URL =
  "https://api.groq.com/openai/v1/chat/completions";

const DEFAULT_MODEL = "openai/gpt-oss-20b";

const MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 500;

export interface LLMMessage {
  role: "system" | "user";
  content: string;
}

export interface JsonSchema {
  type:
    | "object"
    | "array"
    | "string"
    | "number"
    | "integer"
    | "boolean";

  properties?: Record<string, unknown>;
  items?: Record<string, unknown>;
  required?: string[];
  additionalProperties?: boolean;
  enum?: string[];
}

export interface GenerateStructuredJsonOptions {
  messages: LLMMessage[];
  schemaName: string;
  schema: JsonSchema;
  model?: string;
}

export class LLMError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly status?: number
  ) {
    super(message);
    this.name = "LLMError";
  }
}

function getApiKey(): string {
  const apiKey = process.env.GROQ_API_KEY;

  console.log("Groq configuration:", {
    exists: Boolean(apiKey),
    startsWithGsk: apiKey?.startsWith("gsk_"),
    length: apiKey?.length,
  });

  if (!apiKey) {
    throw new LLMError(
      "GROQ_API_KEY is not configured",
      "LLM_API_KEY_MISSING"
    );
  }

  return apiKey;
}

function getModel(model?: string): string {
  return model || process.env.LLM_MODEL || DEFAULT_MODEL;
}

function isRetryableStatus(status?: number): boolean {
  if (!status) {
    return true;
  }

  return (
    status === 408 ||
    status === 429 ||
    status >= 500
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/**
 * Get retry delay from Groq's response.
 *
 * Groq may provide retry information in:
 * - retry-after header
 * - x-ratelimit-reset-requests
 * - x-ratelimit-reset-tokens
 *
 * If unavailable, fall back to exponential backoff.
 */
function getRetryDelay(
  error: unknown,
  attempt: number
): number {
  const fallbackDelay =
    INITIAL_BACKOFF_MS * 2 ** attempt;

  if (!axios.isAxiosError(error)) {
    return fallbackDelay;
  }

  const headers = error.response?.headers;

  if (!headers) {
    return fallbackDelay;
  }

  // Axios normalizes response headers to lowercase,
  // but get() also makes this safe.
  const retryAfter =
    headers["retry-after"] ??
    headers["Retry-After"];

  if (retryAfter) {
    const retryAfterSeconds = Number(retryAfter);

    if (
      Number.isFinite(retryAfterSeconds) &&
      retryAfterSeconds > 0
    ) {
      return Math.ceil(retryAfterSeconds * 1000);
    }

    // Sometimes retry-after can be an HTTP date.
    const retryDate = Date.parse(String(retryAfter));

    if (!Number.isNaN(retryDate)) {
      const delay = retryDate - Date.now();

      if (delay > 0) {
        return delay;
      }
    }
  }

  return fallbackDelay;
}

function extractContent(response: {
  status?: number;
  data?: {
    choices?: Array<{
      message?: {
        content?: string | null;
      };
    }>;
  };
}): string {
  console.log("Groq response status:", response.status);

  console.log(
    "Groq response data:",
    JSON.stringify(response.data, null, 2)
  );

  const content =
    response.data?.choices?.[0]?.message?.content;

  if (!content) {
    throw new LLMError(
      "LLM returned an empty response",
      "LLM_EMPTY_RESPONSE"
    );
  }

  return content;
}

export async function generateStructuredJson(
  options: GenerateStructuredJsonOptions
): Promise<unknown> {
  console.log("🔥 generateStructuredJson CALLED");

  const apiKey = getApiKey();

  console.log("🔥 API key loaded successfully");

  const model = getModel(options.model);

  console.log("🔥 Model:", model);

  let lastError: unknown = null;

  for (
    let attempt = 0;
    attempt <= MAX_RETRIES;
    attempt += 1
  ) {
    try {
      console.log(
        `Sending request to Groq... attempt ${
          attempt + 1
        }/${MAX_RETRIES + 1}`
      );

      const response = await axios.post(
        GROQ_API_URL,
        {
          model,
          messages: options.messages,
          temperature: 0,

          response_format: {
            type: "json_schema",
            json_schema: {
              name: options.schemaName,
              strict: true,
              schema: options.schema,
            },
          },
        },
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          timeout: 30_000,
        }
      );

      console.log("Groq request completed");

      const content = extractContent(response);

      try {
        return JSON.parse(content);
      } catch {
        throw new LLMError(
          "LLM returned invalid JSON",
          "LLM_INVALID_JSON"
        );
      }
    } catch (error) {
      lastError = error;

      // -----------------------------
      // LLM-generated response errors
      // -----------------------------
      if (error instanceof LLMError) {
        if (attempt < MAX_RETRIES) {
          const delay =
            INITIAL_BACKOFF_MS * 2 ** attempt;

          console.log(
            `LLM response error. Retrying in ${delay}ms...`
          );

          await sleep(delay);
          continue;
        }

        throw error;
      }

      // -----------------------------
      // Axios / Groq API errors
      // -----------------------------
      if (axios.isAxiosError(error)) {
        const status = error.response?.status;

        console.error("Groq API error:", {
          status,
          data: error.response?.data,
        });

        // Non-retryable error
        if (
          !isRetryableStatus(status) ||
          attempt === MAX_RETRIES
        ) {
          throw new LLMError(
            `LLM request failed${
              status
                ? ` with status ${status}`
                : ""
            }`,
            status === 429
              ? "LLM_RATE_LIMITED"
              : "LLM_REQUEST_FAILED",
            status
          );
        }

        // -----------------------------
        // IMPORTANT: 429 handling
        // -----------------------------
        const delay = getRetryDelay(
          error,
          attempt
        );

        if (status === 429) {
          console.log(
            `Groq rate limit reached. Waiting ${Math.ceil(
              delay / 1000
            )}s before retry...`
          );
        } else {
          console.log(
            `Retryable Groq error (${status}). Waiting ${Math.ceil(
              delay / 1000
            )}s before retry...`
          );
        }

        await sleep(delay);

        continue;
      }

      // -----------------------------
      // Unknown errors
      // -----------------------------
      if (attempt < MAX_RETRIES) {
        const delay =
          INITIAL_BACKOFF_MS * 2 ** attempt;

        console.log(
          `Unknown LLM error. Retrying in ${delay}ms...`
        );

        await sleep(delay);

        continue;
      }
    }
  }

  console.error(
    "LLM generation failed after all retries:",
    lastError
  );

  throw new LLMError(
    "LLM request failed after retries",
    "LLM_REQUEST_FAILED"
  );
}