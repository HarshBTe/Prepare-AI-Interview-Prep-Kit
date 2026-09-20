import { z } from "zod";
import { generateStructuredJson } from "./llm";
import type {
  CompanyBrief,
  Question,
  QuestionCategory,
  Requirement,
  Role,
  Difficulty,
} from "../types/kit";

const generatedQuestionSchema = z.object({
  requirement_ids: z.array(z.string()).min(1),
  category: z.enum([
    "technical",
    "behavioural",
    "system-design",
    "company-fit",
  ]),
  prompt: z.string().min(1),
  answer_outline: z.string().min(1),
  difficulty: z.union([
    z.literal(1),
    z.literal(2),
    z.literal(3),
  ]),
});

const generatedQuestionsResponseSchema = z.object({
  questions: z.array(generatedQuestionSchema).min(1),
});

const questionsJsonSchema = {
  type: "object" as const,
  properties: {
    questions: {
      type: "array" as const,
      items: {
        type: "object" as const,
        properties: {
          requirement_ids: {
            type: "array" as const,
            items: {
              type: "string" as const,
            },
            minItems: 1,
          },
          category: {
            type: "string" as const,
            enum: [
              "technical",
              "behavioural",
              "system-design",
              "company-fit",
            ],
          },
          prompt: {
            type: "string" as const,
          },
          answer_outline: {
            type: "string" as const,
          },
          difficulty: {
            type: "integer" as const,
            enum: [1, 2, 3],
          },
        },
        required: [
          "requirement_ids",
          "category",
          "prompt",
          "answer_outline",
          "difficulty",
        ],
        additionalProperties: false,
      },
    },
  },
  required: ["questions"],
  additionalProperties: false,
};

function createQuestionId(index: number): string {
  return `q-${String(index + 1).padStart(3, "0")}`;
}

function normalizeText(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function buildRequirementContext(
  requirements: Requirement[]
): string {
  return requirements
    .map(
      (requirement) =>
        `- ${requirement.id}: ${requirement.text} | ${requirement.kind} | ${requirement.priority}`
    )
    .join("\n");
}

function validateRequirementReferences(
  questions: z.infer<
    typeof generatedQuestionsResponseSchema
  >["questions"],
  requirements: Requirement[]
): void {
  const validRequirementIds = new Set(
    requirements.map((requirement) => requirement.id)
  );

  for (const question of questions) {
    for (const requirementId of question.requirement_ids) {
      if (!validRequirementIds.has(requirementId)) {
        throw new Error(
          `Question references unknown requirement ID: ${requirementId}`
        );
      }
    }
  }
}

function validateMustRequirementCoverage(
  questions: z.infer<
    typeof generatedQuestionsResponseSchema
  >["questions"],
  requirements: Requirement[]
): void {
  const coveredRequirementIds = new Set(
    questions.flatMap(
      (question) => question.requirement_ids
    )
  );

  const uncoveredMustRequirements = requirements.filter(
    (requirement) =>
      requirement.priority === "must" &&
      !coveredRequirementIds.has(requirement.id)
  );

  if (uncoveredMustRequirements.length > 0) {
    throw new Error(
      `Must requirements are not covered: ${uncoveredMustRequirements
        .map((requirement) => requirement.id)
        .join(", ")}`
    );
  }
}

function normalizeQuestions(
  questions: z.infer<
    typeof generatedQuestionsResponseSchema
  >["questions"]
): Question[] {
  return questions.map((question, index) => ({
    id: createQuestionId(index),
    requirement_ids: [
      ...new Set(question.requirement_ids),
    ],
    category: question.category as QuestionCategory,
    prompt: normalizeText(question.prompt),
    answer_outline: normalizeText(
      question.answer_outline
    ),
    difficulty: question.difficulty as Difficulty,
  }));
}

export async function generateQuestions(
  role: Role,
  companyBrief: CompanyBrief
): Promise<Question[]> {
  if (role.requirements.length === 0) {
    throw new Error(
      "At least one requirement is needed to generate questions"
    );
  }

  const requirementContext =
    buildRequirementContext(role.requirements);

  const mustRequirements = role.requirements
    .filter(
      (requirement) => requirement.priority === "must"
    )
    .map(
      (requirement) =>
        `- ${requirement.id}: ${requirement.text}`
    )
    .join("\n");

  const result = await generateStructuredJson({
    schemaName: "interview_questions",
    schema: questionsJsonSchema,

    messages: [
      {
        role: "system",
        content: `
You generate concise interview questions.

Rules:
1. Use ONLY the supplied requirements and company information.
2. Generate EXACTLY 6 questions.
3. Every question MUST contain at least one requirement_id.
4. Every requirement_id MUST exactly match a supplied requirement ID.
5. Every MUST requirement MUST be covered at least once.
6. A question may cover multiple requirements when they are related.
7. Do not invent requirements or company facts.
8. Avoid duplicate questions.
9. Keep each question focused on one interview topic.
10. Keep answer_outline to 1-2 short sentences.
11. Difficulty: 1 foundational, 2 intermediate, 3 advanced.
12. Return ONLY the requested JSON.
        `.trim(),
      },

      {
        role: "user",
        content: `
ROLE:
${role.title}

SENIORITY:
${role.seniority}

REQUIREMENTS:
${requirementContext}

MUST REQUIREMENTS:
${mustRequirements || "- None"}

COMPANY:
${companyBrief.summary}

Generate exactly 6 questions.

You MUST cover every MUST requirement.

When there are more than 6 must requirements, combine related
requirements into the same question using multiple requirement_ids.

Keep prompts concise.

Keep answer_outline very short.

Return only JSON.
        `.trim(),
      },
    ],
  });

  const parsed =
    generatedQuestionsResponseSchema.parse(result);

  validateRequirementReferences(
    parsed.questions,
    role.requirements
  );

  validateMustRequirementCoverage(
    parsed.questions,
    role.requirements
  );

  if (parsed.questions.length !== 6) {
    throw new Error(
      `Expected exactly 6 questions, received ${parsed.questions.length}`
    );
  }

  return normalizeQuestions(parsed.questions);
}



// ============================
// SELECTIVE CATEGORY REGENERATION
// ============================

export interface RegenerateCategoryResult {
  questions: Question[];
}

export async function generateQuestionsForCategory(
  role: Role,
  companyBrief: CompanyBrief,
  category: QuestionCategory,
  existingQuestions: Question[]
): Promise<Question[]> {
  if (role.requirements.length === 0) {
    throw new Error(
      "At least one requirement is needed to regenerate questions"
    );
  }

  const categoryRequirements = role.requirements.filter(
    (requirement) => {
      if (category === "technical") {
        return requirement.kind === "technical";
      }

      if (category === "behavioural") {
        return requirement.kind === "behavioural";
      }

      if (category === "system-design") {
        return (
          requirement.kind === "technical" ||
          requirement.kind === "domain"
        );
      }

      if (category === "company-fit") {
        return (
          requirement.kind === "behavioural" ||
          requirement.kind === "domain"
        );
      }

      return false;
    }
  );

  const requirementsToUse =
    categoryRequirements.length > 0
      ? categoryRequirements
      : role.requirements;

  const requirementContext = requirementsToUse
    .map(
      (requirement) =>
        `- ${requirement.id}: ${requirement.text} | kind=${requirement.kind} | priority=${requirement.priority}`
    )
    .join("\n");

  const existingQuestionContext = existingQuestions
    .map(
      (question) =>
        `- ${question.prompt}`
    )
    .join("\n");

  const result = await generateStructuredJson({
    schemaName: `regenerate_${category}_questions`,
    schema: questionsJsonSchema,

    messages: [
      {
        role: "system",
        content: `
You generate interview questions for ONE specific interview category.

CATEGORY:
${category}

Rules:

1. Generate EXACTLY 3 questions.
2. Every question MUST belong to the requested category.
3. Every question MUST contain at least one valid requirement_id.
4. Only use supplied requirement IDs.
5. Use the supplied role and company information only.
6. Do not invent company facts.
7. Do not duplicate the existing questions.
8. Keep each question focused on one topic.
9. Answer outlines must contain concise interview talking points.
10. Difficulty must be 1, 2, or 3.
11. Prefer higher-priority requirements.
12. Questions should be meaningfully different from the existing questions.
13. Return ONLY structured JSON.

The existing questions are provided only to help avoid duplicates.
Do not modify or reproduce them.
        `.trim(),
      },

      {
        role: "user",
        content: `
ROLE:
${role.title}

SENIORITY:
${role.seniority}

REQUESTED CATEGORY:
${category}

RELEVANT REQUIREMENTS:
${requirementContext}

COMPANY SUMMARY:
${companyBrief.summary}

WHAT THE COMPANY DOES:
${companyBrief.what_they_do}

EXISTING QUESTIONS:
${existingQuestionContext || "- None"}

Generate exactly 3 NEW ${category} interview questions.

Return only JSON.
        `.trim(),
      },
    ],
  });

  const parsed =
    generatedQuestionsResponseSchema.parse(result);

  validateRequirementReferences(
    parsed.questions,
    role.requirements
  );

  const filteredQuestions = parsed.questions.filter(
    (question) => question.category === category
  );

  if (filteredQuestions.length !== 3) {
    throw new Error(
      `Expected exactly 3 ${category} questions, received ${filteredQuestions.length}`
    );
  }

  return filteredQuestions.map((question, index) => ({
    id: `regen-${category}-${Date.now()}-${index}`,
    requirement_ids: [
      ...new Set(question.requirement_ids),
    ],
    category: question.category as QuestionCategory,
    prompt: normalizeText(question.prompt),
    answer_outline: normalizeText(
      question.answer_outline
    ),
    difficulty: question.difficulty as Difficulty,
  }));
}