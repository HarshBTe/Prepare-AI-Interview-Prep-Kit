import { describe, expect, it, vi } from "vitest";
import axios from "axios";

import {
  generateStructuredJson,
  LLMError,
} from "../src/pipeline/llm";

vi.mock("axios");

const mockedAxios = vi.mocked(axios);

describe("LLM adapter", () => {
  it("should parse structured JSON returned by the provider", async () => {
    process.env.GROQ_API_KEY = "test-key";

    mockedAxios.post.mockResolvedValueOnce({
      data: {
        choices: [
          {
            message: {
              content: JSON.stringify({
                answer: "React is a JavaScript library.",
              }),
            },
          },
        ],
      },
    });

    const result = await generateStructuredJson({
      schemaName: "test_schema",
      schema: {
        type: "object",
        properties: {
          answer: {
            type: "string",
          },
        },
        required: ["answer"],
        additionalProperties: false,
      },
      messages: [
        {
          role: "system",
          content: "Return structured JSON.",
        },
        {
          role: "user",
          content: "What is React?",
        },
      ],
    });

    expect(result).toEqual({
      answer: "React is a JavaScript library.",
    });

    expect(mockedAxios.post).toHaveBeenCalledTimes(1);
  });

  it("should retry a rate-limited request", async () => {
    process.env.GROQ_API_KEY = "test-key";

    mockedAxios.post
      .mockRejectedValueOnce({
        response: {
          status: 429,
        },
        isAxiosError: true,
      })
      .mockResolvedValueOnce({
        data: {
          choices: [
            {
              message: {
                content: JSON.stringify({
                  answer: "Success after retry",
                }),
              },
            },
          ],
        },
      });

    const result = await generateStructuredJson({
      schemaName: "test_schema",
      schema: {
        type: "object",
        properties: {
          answer: {
            type: "string",
          },
        },
        required: ["answer"],
        additionalProperties: false,
      },
      messages: [
        {
          role: "user",
          content: "Test retry",
        },
      ],
    });

    expect(result).toEqual({
      answer: "Success after retry",
    });

    expect(mockedAxios.post).toHaveBeenCalledTimes(2);
  });

  it("should throw when API key is missing", async () => {
    delete process.env.GROQ_API_KEY;

    await expect(
      generateStructuredJson({
        schemaName: "test_schema",
        schema: {
          type: "object",
        },
        messages: [
          {
            role: "user",
            content: "Test",
          },
        ],
      })
    ).rejects.toBeInstanceOf(LLMError);
  });
});