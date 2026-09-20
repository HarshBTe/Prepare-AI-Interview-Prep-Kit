import dotenv from "dotenv";

dotenv.config();

import fs from "node:fs/promises";
import path from "node:path";
import { generateInterviewKit } from "../pipeline/generateInterviewKit";
import type { InterviewKit } from "../types/kit";

interface EvaluationCase {
  id: string;
  jd: string;
  company_url: string;
  days: number;
  role?: string;
  location?: string;
}

interface EvaluationSuccess {
  id: string;
  status: "ok";
  kit: InterviewKit;
}

interface EvaluationFailure {
  id: string;
  status: "failed";
  error: {
    code: string;
    message: string;
  };
}

interface EvaluationOutput {
  version: "1.0";
  generated_at: string;
  kits: Array<EvaluationSuccess | EvaluationFailure>;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function isRateLimitError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  return (
    error.message.includes("status 429") ||
    error.message.includes("rate_limit_exceeded")
  );
}

async function generateCaseWithRetry(
  testCase: EvaluationCase,
  maxAttempts = 3,
): Promise<InterviewKit> {
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await generateInterviewKit({
        jd: testCase.jd,
        company_url: testCase.company_url,
        days: testCase.days,
        role: testCase.role,
        location: testCase.location,
      });
    } catch (error) {
      const rateLimited = isRateLimitError(error);

      if (!rateLimited || attempt === maxAttempts) {
        throw error;
      }

      const waitTime = attempt * 15_000;

      console.log(
        `Rate limit reached for ${testCase.id}. ` +
        `Waiting ${waitTime / 1000}s before retry ${attempt + 1}/${maxAttempts}...`,
      );

      await sleep(waitTime);
    }
  }

  throw new Error("Unexpected retry failure");
}

function getArgument(name: string): string | undefined {
  const index = process.argv.indexOf(name);

  if (index === -1) {
    return undefined;
  }

  return process.argv[index + 1];
}

function validateCase(input: unknown): EvaluationCase {
  if (!input || typeof input !== "object") {
    throw new Error("Case must be an object");
  }

  const item = input as Record<string, unknown>;

  if (typeof item.id !== "string" || !item.id.trim()) {
    throw new Error("Missing or invalid id");
  }

  if (typeof item.jd !== "string" || !item.jd.trim()) {
    throw new Error("Missing or invalid jd");
  }

  if (
    typeof item.company_url !== "string" ||
    !item.company_url.trim()
  ) {
    throw new Error("Missing or invalid company_url");
  }

  if (
    typeof item.days !== "number" ||
    !Number.isInteger(item.days) ||
    item.days < 1 ||
    item.days > 60
  ) {
    throw new Error("days must be an integer between 1 and 60");
  }

  if (
    item.role !== undefined &&
    typeof item.role !== "string"
  ) {
    throw new Error("role must be a string");
  }

  if (
    item.location !== undefined &&
    typeof item.location !== "string"
  ) {
    throw new Error("location must be a string");
  }

  return {
    id: item.id,
    jd: item.jd,
    company_url: item.company_url,
    days: item.days,
    role: item.role as string | undefined,
    location: item.location as string | undefined,
  };
}

function getErrorDetails(error: unknown): {
  code: string;
  message: string;
} {
  if (error instanceof Error) {
    const errorWithCode = error as Error & {
      code?: unknown;
    };

    return {
      code:
        typeof errorWithCode.code === "string"
          ? errorWithCode.code
          : "EVALUATION_FAILED",
      message: error.message,
    };
  }

  return {
    code: "EVALUATION_FAILED",
    message: "Unknown evaluation error",
  };
}

async function main(): Promise<void> {
  const inputArgument = getArgument("--input");
  const outputArgument = getArgument("--output");

  if (!inputArgument || !outputArgument) {
    throw new Error(
      "Usage: npm run evaluate -- --input <cases.json> --output <kits.json>",
    );
  }

  const inputPath = path.resolve(process.cwd(), inputArgument);
  const outputPath = path.resolve(process.cwd(), outputArgument);

  const rawInput = await fs.readFile(inputPath, "utf-8");

  const parsedInput: unknown = JSON.parse(rawInput);

  if (!Array.isArray(parsedInput)) {
    throw new Error("Input file must contain a JSON array");
  }

  const cases: EvaluationCase[] = [];

  for (let index = 0; index < parsedInput.length; index += 1) {
    try {
      cases.push(validateCase(parsedInput[index]));
    } catch (error) {
      const details = getErrorDetails(error);

      console.error(
        `Invalid case at index ${index}: ${details.message}`,
      );

      /*
       * Keep the evaluator running even if one input case
       * is malformed.
       */
    }
  }

  const results: Array<EvaluationSuccess | EvaluationFailure> = [];

 for (let index = 0; index < cases.length; index += 1) {
  const testCase = cases[index];

  if (index > 0) {
    console.log("\nWaiting before next case...");
    await sleep(10_000);
  }

  console.log(`\nGenerating kit: ${testCase.id}`);

  try {
      const kit = await generateCaseWithRetry(testCase);

      results.push({
        id: testCase.id,
        status: "ok",
        kit,
      });

      console.log(`✓ ${testCase.id} completed`);
    } catch (error) {
      const details = getErrorDetails(error);

      results.push({
        id: testCase.id,
        status: "failed",
        error: details,
      });

      console.error(
        `✗ ${testCase.id} failed: ${details.message}`,
      );
    }
  }

  const output: EvaluationOutput = {
    version: "1.0",
    generated_at: new Date().toISOString(),
    kits: results,
  };

  await fs.mkdir(path.dirname(outputPath), {
    recursive: true,
  });

  await fs.writeFile(
    outputPath,
    `${JSON.stringify(output, null, 2)}\n`,
    "utf-8",
  );

  const successful = results.filter(
    (result) => result.status === "ok",
  ).length;

  const failed = results.length - successful;

  console.log("\n================================");
  console.log("Batch evaluation completed");
  console.log(`Total: ${results.length}`);
  console.log(`Successful: ${successful}`);
  console.log(`Failed: ${failed}`);
  console.log(`Output: ${outputPath}`);
  console.log("================================");
}

main().catch((error: unknown) => {
  const details = getErrorDetails(error);

  console.error("\nBatch evaluator failed:");
  console.error(details.message);

  process.exitCode = 1;
});