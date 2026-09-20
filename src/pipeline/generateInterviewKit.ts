import { crawlCompany } from "../crawler/crawler";
import { validateCompanyUrl } from "../lib/validation/urlValidation";
import { validateInterviewKit } from "../lib/validation/validateKit";
import { buildCompanyBrief } from "./companyBrief";
import { fillCoverageGaps } from "./gapFill";
import { generateFlashcards } from "./flashcards";
import { generateQuestions } from "./questions";
import { extractRequirementsFromJd } from "./requirements";
import { allocateSchedule } from "./schedule";
import type { InterviewKit, Source } from "../types/kit";

export interface GenerateInterviewKitInput {
  jd: string;
  company_url: string;
  days: number;
  role?: string;
  location?: string;
}

export async function generateInterviewKit(
  input: GenerateInterviewKitInput
): Promise<InterviewKit> {
  const jd = input.jd.trim();

  if (!jd) {
    throw new Error("Job description is required");
  }

  if (
    !Number.isInteger(input.days) ||
    input.days < 1 ||
    input.days > 60
  ) {
    throw new Error(
      "days must be an integer between 1 and 60"
    );
  }

  const validatedUrl = await validateCompanyUrl(
    input.company_url
  );

  const role = await extractRequirementsFromJd(jd);

  const crawlResult = await crawlCompany(
    validatedUrl.toString()
  );

  if (crawlResult.pages.length === 0) {
    throw new Error(
      "COMPANY_UNREACHABLE: Unable to retrieve company pages"
    );
  }

  const companyBrief = await buildCompanyBrief(
    crawlResult.pages
  );

  const initialQuestions = await generateQuestions(
    role,
    companyBrief
  );

  const gapFillResult = await fillCoverageGaps(
    role,
    companyBrief,
    initialQuestions
  );

  const flashcards = await generateFlashcards(
    role.requirements,
    gapFillResult.questions
  );

  const schedule = allocateSchedule(
    gapFillResult.questions,
    role.requirements,
    input.days
  );

  const source: Source = {
    company:
      extractCompanyName(validatedUrl.hostname),
    company_url: validatedUrl.toString(),
    role: input.role?.trim() || role.title,
    location: input.location?.trim() || "",
    jd_chars: jd.length,
    researched_at: new Date().toISOString(),
    pages_used: crawlResult.pagesUsed,
  };

  const kit: InterviewKit = {
    source,
    company_brief: companyBrief,
    role,
    questions: gapFillResult.questions,
    flashcards,
    schedule,
    coverage: {
      uncovered_requirement_ids:
        gapFillResult.uncoveredRequirementIds,
      passes: gapFillResult.passes,
    },
  };

  return validateInterviewKit(kit);
}

function extractCompanyName(
  hostname: string
): string {
  return hostname
    .replace(/^www\./, "")
    .split(".")[0]
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (character) =>
      character.toUpperCase()
    );
}