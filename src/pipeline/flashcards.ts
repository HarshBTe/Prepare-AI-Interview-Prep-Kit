import { z } from "zod";
import { generateStructuredJson } from "./llm";
import type {
  Flashcard,
  Question,
  Requirement,
} from "../types/kit";

const generatedFlashcardSchema = z.object({
  front: z.string().min(1),
  back: z.string().min(1),
  requirement_ids: z.array(z.string()).min(1),
});

const generatedFlashcardsResponseSchema = z.object({
  flashcards: z.array(generatedFlashcardSchema),
});

const flashcardsJsonSchema = {
  type: "object" as const,
  properties: {
    flashcards: {
      type: "array" as const,
      items: {
        type: "object" as const,
        properties: {
          front: {
            type: "string" as const,
          },
          back: {
            type: "string" as const,
          },
          requirement_ids: {
            type: "array" as const,
            items: {
              type: "string" as const,
            },
          },
        },
        required: [
          "front",
          "back",
          "requirement_ids",
        ],
        additionalProperties: false,
      },
    },
  },
  required: ["flashcards"],
  additionalProperties: false,
};

function createFlashcardId(index: number): string {
  return `fc-${String(index + 1).padStart(3, "0")}`;
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
        `- ${requirement.id}: ${requirement.text} | kind=${requirement.kind} | priority=${requirement.priority}`
    )
    .join("\n");
}

function buildQuestionContext(
  questions: Question[]
): string {
  return questions
    .map(
      (question) =>
        `- ${question.id}: ${question.prompt.slice(0, 180)} | requirements=${question.requirement_ids.join(", ")}`
    )
    .join("\n");
}

function validateRequirementReferences(
  flashcards: Flashcard[],
  requirements: Requirement[]
): void {
  const validRequirementIds = new Set(
    requirements.map((requirement) => requirement.id)
  );

  for (const flashcard of flashcards) {
    for (const requirementId of flashcard.requirement_ids) {
      if (!validRequirementIds.has(requirementId)) {
        throw new Error(
          `Flashcard references unknown requirement ID: ${requirementId}`
        );
      }
    }
  }
}

export async function generateFlashcards(
  requirements: Requirement[],
  questions: Question[]
): Promise<Flashcard[]> {
  if (requirements.length === 0) {
    throw new Error(
      "At least one requirement is needed to generate flashcards"
    );
  }

  if (questions.length === 0) {
    throw new Error(
      "At least one question is needed to generate flashcards"
    );
  }

  const requirementContext =
    buildRequirementContext(requirements);

  const questionContext =
    buildQuestionContext(questions);

  const result = await generateStructuredJson({
    schemaName: "interview_flashcards",
    schema: flashcardsJsonSchema,
messages: [
  {
    role: "system",
    content: `
You generate concise interview study flashcards.

Rules:
1. Use ONLY the supplied requirements and interview questions.
2. Generate exactly 6 flashcards.
3. Each flashcard MUST contain:
   - front
   - back
   - requirement_ids
4. requirement_ids MUST be non-empty.
5. Every requirement ID MUST exactly match a supplied requirement ID.
6. Do not invent requirement IDs.
7. Keep front concise.
8. Keep back concise: 1-2 sentences or short key points.
9. Avoid duplicate flashcards.
10. Prefer must requirements.
11. Return ONLY valid JSON matching the schema.
    `.trim(),
  },
  {
    role: "user",
    content: `
REQUIREMENTS:
${requirementContext}

QUESTIONS:
${questionContext}

Generate exactly 6 concise flashcards.
    `.trim(),
  },
],
  });

  const parsed =
    generatedFlashcardsResponseSchema.parse(result);

    if (
  parsed.flashcards.length < 6 ||
  parsed.flashcards.length > 6
) {
  throw new Error(
    `Expected exactly 6 flashcards, received ${parsed.flashcards.length}`
  );
}

  const flashcards: Flashcard[] =
    parsed.flashcards.map((flashcard, index) => ({
      id: createFlashcardId(index),
      front: normalizeText(flashcard.front),
      back: normalizeText(flashcard.back),
      requirement_ids: [
        ...new Set(flashcard.requirement_ids),
      ],
    }));

  validateRequirementReferences(
    flashcards,
    requirements
  );

  return flashcards;
}