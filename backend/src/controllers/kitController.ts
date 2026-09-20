// kitController.ts

import type {
  Request,
  Response,
  NextFunction,
} from "express";

import {
  generateInterviewKit,
} from "../../../src/pipeline/generateInterviewKit";

import {
  generateKitRequestSchema,
} from "../validators/kitValidator";

import {
  generateQuestionsForCategory,
} from "../../../src/pipeline/questions";


import {
  checkCoverage,
} from "../../../src/pipeline/coverage";

import {
  allocateSchedule,
} from "../../../src/pipeline/schedule";

import {
  generateFlashcards,
} from "../../../src/pipeline/flashcards";


import type {
  InterviewKit,
  QuestionCategory,
  Question,
  Flashcard,
} from "../../../src/types/kit";

import { AppError } from "../utils/AppError";
import { Kit } from "../models/Kit";


function buildDefaultBuilderMeta(
  kit: InterviewKit
) {
  return {
    questions: Object.fromEntries(
      kit.questions.map((question) => [
        question.id,
        {
          origin: "generated" as const,
          isPinned: false,
        },
      ])
    ),

    flashcards: Object.fromEntries(
      kit.flashcards.map((flashcard) => [
        flashcard.id,
        {
          origin: "generated" as const,
          isPinned: false,
        },
      ])
    ),

    companyBrief: {
      origin: "generated" as const,
      isPinned: false,
    },
  };
}

export async function generateKit(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const parsed = generateKitRequestSchema.safeParse(
      req.body
    );

    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0];

      throw new AppError(
        firstIssue?.message ??
          "Invalid request body",
        400,
        "VALIDATION_ERROR"
      );
    }

    const userId = req.userId;

    if (!userId) {
      throw new AppError(
        "Authentication is required",
        401,
        "AUTHENTICATION_REQUIRED"
      );
    }

    /*
     * Prevent duplicate generation requests.
     */
    const existingGeneratingKit =
      await Kit.findOne({
        userId,
        status: "generating",
      }).lean();

    if (existingGeneratingKit) {
      throw new AppError(
        "An interview kit is already being generated",
        409,
        "GENERATION_IN_PROGRESS"
      );
    }

    /*
     * Create the record before starting the
     * expensive interview-kit generation pipeline.
     */
    let generatingKit;

    try {
      generatingKit = await Kit.create({
  userId,
  title:
    parsed.data.role?.trim() ||
    "Interview Prep Kit",
  status: "generating",
  kit: null,
  builderMeta: {
    questions: {},
    flashcards: {},
    companyBrief: {
      origin: "generated",
      isPinned: false,
    },
  },
});
    } catch (error) {
      /*
       * The partial unique MongoDB index protects
       * against two requests racing between the
       * findOne() check and Kit.create().
       */
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === 11000
      ) {
        throw new AppError(
          "An interview kit is already being generated",
          409,
          "GENERATION_IN_PROGRESS"
        );
      }

      throw error;
    }

    try {
      const kit = await generateInterviewKit(
        parsed.data
      );

      generatingKit.status = "ready";
      generatingKit.title = kit.role.title;
      generatingKit.kit = kit;
      generatingKit.builderMeta = {
  questions: Object.fromEntries(
    kit.questions.map((question) => [
      question.id,
      {
        origin: "generated",
        isPinned: false,
      },
    ])
  ),

  flashcards: Object.fromEntries(
    kit.flashcards.map((flashcard) => [
      flashcard.id,
      {
        origin: "generated",
        isPinned: false,
      },
    ])
  ),

  companyBrief: {
    origin: "generated",
    isPinned: false,
  },
};
      generatingKit.errorCode = undefined;
      generatingKit.errorMessage = undefined;

      await generatingKit.save();

      res.status(201).json({
        success: true,
        kitId: generatingKit._id.toString(),
        kit: generatingKit.kit,
      });
    } catch (generationError) {
      const message =
        generationError instanceof Error
          ? generationError.message
          : "Interview kit generation failed";

      generatingKit.status = "failed";
      generatingKit.errorCode =
        "GENERATION_FAILED";
      generatingKit.errorMessage = message;

      await generatingKit.save();

      throw generationError;
    }
  } catch (error) {
    next(error);
  }
}



export async function getKit(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.userId;

    if (!userId) {
      throw new AppError(
        "Authentication is required",
        401,
        "AUTHENTICATION_REQUIRED"
      );
    }

    const kit = await Kit.findOne({
      _id: req.params.id,
      userId,
    }).lean();

    if (!kit) {
      throw new AppError(
        "Kit not found",
        404,
        "KIT_NOT_FOUND"
      );
    }

    const builderMeta =
      kit.builderMeta ??
      (kit.kit
        ? buildDefaultBuilderMeta(kit.kit)
        : {
            questions: {},
            flashcards: {},
            companyBrief: {
              origin: "generated" as const,
              isPinned: false,
            },
          });

    res.json({
      success: true,
      kit: {
        id: kit._id.toString(),
        title: kit.title,
        status: kit.status,
        data: kit.kit,
        builderMeta,
        createdAt: kit.createdAt,
        updatedAt: kit.updatedAt,
      },
    });
  } catch (error) {
    next(error);
  }
}



export async function getKits(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
   

  const userId = req.userId;

if (!userId) {
  throw new AppError(
    "Authentication is required",
    401,
    "AUTHENTICATION_REQUIRED"
  );
}

const kits = await Kit.find({
  userId,
})
  .select("_id title status createdAt updatedAt")
  .sort({ updatedAt: -1 })
  .lean();

    res.json({
      success: true,
      kits: kits.map((kit) => ({
        id: kit._id.toString(),
        title: kit.title,
        status: kit.status,
        createdAt: kit.createdAt,
        updatedAt: kit.updatedAt,
      })),
    });
  } catch (error) {
    next(error);
  }
}


export async function updateKit(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.userId;

    if (!userId) {
      throw new AppError(
        "Authentication is required",
        401,
        "AUTHENTICATION_REQUIRED"
      );
    }

    const kitId = req.params.id;

    const existingKit = await Kit.findOne({
      _id: kitId,
      userId,
    });

    if (!existingKit) {
      throw new AppError(
        "Kit not found",
        404,
        "KIT_NOT_FOUND"
      );
    }

    if (existingKit.status !== "ready") {
      throw new AppError(
        "Only a ready interview kit can be edited",
        400,
        "KIT_NOT_READY"
      );
    }

const updatedKit = req.body?.kit;

if (!updatedKit) {
  throw new AppError(
    "Kit data is required",
    400,
    "KIT_DATA_REQUIRED"
  );
}

for (const question of updatedKit.questions ?? []) {
  if (
    !Array.isArray(question.requirement_ids) ||
    question.requirement_ids.length === 0
  ) {
    throw new AppError(
      `Question "${question.id}" must reference at least one requirement`,
      400,
      "QUESTION_REQUIREMENT_REQUIRED"
    );
  }
}

const incomingBuilderMeta = req.body?.builderMeta;

if (!updatedKit) {
  throw new AppError(
    "Kit data is required",
    400,
    "KIT_DATA_REQUIRED"
  );
}

    const currentKit = existingKit.kit;

    if (!currentKit) {
      throw new AppError(
        "Existing kit data is not available",
        400,
        "KIT_DATA_NOT_AVAILABLE"
      );
    }

    const currentMeta = existingKit.builderMeta;

    /*
     * -----------------------------
     * QUESTIONS METADATA
     * -----------------------------
     */

    const existingQuestionsById = new Map(
      currentKit.questions.map((question) => [
        question.id,
        question,
      ])
    );

    const previousQuestionMeta =
      currentMeta?.questions ?? {};

    const updatedQuestionMeta: Record<
      string,
      {
        origin:
          | "generated"
          | "user_added"
          | "user_edited";
        isPinned: boolean;
      }
    > = {};

    for (const question of updatedKit.questions) {
      const previousQuestion =
        existingQuestionsById.get(question.id);

      const previousMeta =
        previousQuestionMeta[question.id];

      /*
       * New question
       */
      if (!previousQuestion) {
        updatedQuestionMeta[question.id] = {
          origin: "user_added",
          isPinned: false,
        };

        continue;
      }

      /*
       * Existing question
       */
      const questionChanged =
        JSON.stringify(previousQuestion) !==
        JSON.stringify(question);

      updatedQuestionMeta[question.id] = {
        origin: questionChanged
          ? "user_edited"
          : previousMeta?.origin ?? "generated",

        isPinned:
          previousMeta?.isPinned ?? false,
      };
    }

    /*
     * -----------------------------
     * FLASHCARD METADATA
     * -----------------------------
     */

    const existingFlashcardsById = new Map(
      currentKit.flashcards.map((flashcard) => [
        flashcard.id,
        flashcard,
      ])
    );

    const previousFlashcardMeta =
      currentMeta?.flashcards ?? {};

    const updatedFlashcardMeta: Record<
      string,
      {
        origin:
          | "generated"
          | "user_added"
          | "user_edited";
        isPinned: boolean;
      }
    > = {};

    for (const flashcard of updatedKit.flashcards) {
      const previousFlashcard =
        existingFlashcardsById.get(flashcard.id);

      const previousMeta =
        previousFlashcardMeta[flashcard.id];

      /*
       * New flashcard
       */
      if (!previousFlashcard) {
        updatedFlashcardMeta[flashcard.id] = {
          origin: "user_added",
          isPinned: false,
        };

        continue;
      }

      /*
       * Existing flashcard
       */
      const flashcardChanged =
        JSON.stringify(previousFlashcard) !==
        JSON.stringify(flashcard);

      updatedFlashcardMeta[flashcard.id] = {
        origin: flashcardChanged
          ? "user_edited"
          : previousMeta?.origin ?? "generated",

        isPinned:
          previousMeta?.isPinned ?? false,
      };
    }

    /*
     * -----------------------------
     * COMPANY BRIEF METADATA
     * -----------------------------
     */

    const companyBriefChanged =
      JSON.stringify(currentKit.company_brief) !==
      JSON.stringify(updatedKit.company_brief);

    const previousBriefMeta =
      currentMeta?.companyBrief;

    const updatedCompanyBriefMeta = {
      origin: companyBriefChanged
        ? ("user_edited" as const)
        : previousBriefMeta?.origin ?? "generated",

      isPinned:
        previousBriefMeta?.isPinned ?? false,
    };

    /*
     * -----------------------------
     * SAVE KIT + METADATA
     * -----------------------------
     */

    existingKit.kit = updatedKit;

  existingKit.builderMeta = {
  questions: updatedQuestionMeta,
  flashcards: updatedFlashcardMeta,
  companyBrief: updatedCompanyBriefMeta,
};

/*
 * Preserve Builder metadata explicitly sent
 * by the frontend, especially pin state.
 */
if (incomingBuilderMeta) {
  existingKit.builderMeta = {
    questions: Object.fromEntries(
      Object.entries(updatedQuestionMeta).map(
        ([questionId, questionMeta]) => [
          questionId,
          {
            ...questionMeta,
            isPinned:
              incomingBuilderMeta.questions?.[
                questionId
              ]?.isPinned ??
              questionMeta.isPinned,
          },
        ]
      )
    ),

    flashcards: Object.fromEntries(
      Object.entries(updatedFlashcardMeta).map(
        ([flashcardId, flashcardMeta]) => [
          flashcardId,
          {
            ...flashcardMeta,
            isPinned:
              incomingBuilderMeta.flashcards?.[
                flashcardId
              ]?.isPinned ??
              flashcardMeta.isPinned,
          },
        ]
      )
    ),

    companyBrief: {
      ...updatedCompanyBriefMeta,
      isPinned:
        incomingBuilderMeta.companyBrief
          ?.isPinned ??
        updatedCompanyBriefMeta.isPinned,
    },
  };
}

    if (updatedKit.role?.title) {
      existingKit.title = updatedKit.role.title;
    }

    await existingKit.save();

   res.json({
  success: true,
  kit: {
    id: existingKit._id.toString(),
    title: existingKit.title,
    status: existingKit.status,
    data: existingKit.kit,
    builderMeta: existingKit.builderMeta,
    createdAt: existingKit.createdAt,
    updatedAt: existingKit.updatedAt,
  },
});
  } catch (error) {
    next(error);
  }
}



// ============================
// SELECTIVE QUESTION REGENERATION
// ============================
export async function regenerateKitSection(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.userId;

    if (!userId) {
      throw new AppError(
        "Authentication is required",
        401,
        "AUTHENTICATION_REQUIRED"
      );
    }

    const kitId = req.params.id;

    const section = req.body?.section as
      | QuestionCategory
      | undefined;

    const validSections: QuestionCategory[] = [
      "technical",
      "behavioural",
      "system-design",
      "company-fit",
    ];

    if (!section || !validSections.includes(section)) {
      throw new AppError(
        "Invalid section. Expected technical, behavioural, system-design, or company-fit",
        400,
        "INVALID_REGENERATION_SECTION"
      );
    }

    const existingKit = await Kit.findOne({
      _id: kitId,
      userId,
    });

    if (!existingKit) {
      throw new AppError(
        "Kit not found",
        404,
        "KIT_NOT_FOUND"
      );
    }

    if (existingKit.status !== "ready") {
      throw new AppError(
        "Only a ready interview kit can be regenerated",
        400,
        "KIT_NOT_READY"
      );
    }

    if (!existingKit.kit) {
      throw new AppError(
        "Existing kit data is not available",
        400,
        "KIT_DATA_NOT_AVAILABLE"
      );
    }

    const currentKit = existingKit.kit;

    const currentMeta =
      existingKit.builderMeta ??
      buildDefaultBuilderMeta(currentKit);

    /*
     * -----------------------------------------
     * 1. FIND QUESTIONS IN REQUESTED SECTION
     * -----------------------------------------
     */

    const sectionQuestions =
      currentKit.questions.filter(
        (question) =>
          question.category === section
      );

    /*
     * -----------------------------------------
     * 2. PRESERVE HUMAN WORK
     * -----------------------------------------
     *
     * Never replace:
     *
     * - user_added
     * - user_edited
     * - pinned
     */

    const preservedQuestions =
      sectionQuestions.filter((question) => {
        const metadata =
          currentMeta.questions[question.id];

        return (
          metadata?.origin === "user_added" ||
          metadata?.origin === "user_edited" ||
          metadata?.isPinned === true
        );
      });

    /*
     * -----------------------------------------
     * 3. GENERATE NEW QUESTIONS
     * -----------------------------------------
     */

    const regeneratedQuestions =
      await generateQuestionsForCategory(
        currentKit.role,
        currentKit.company_brief,
        section,
        currentKit.questions
      );

    /*
     * -----------------------------------------
     * 4. MERGE QUESTIONS
     * -----------------------------------------
     */

    const questionsOutsideSection =
      currentKit.questions.filter(
        (question) =>
          question.category !== section
      );

    const mergedQuestions: Question[] = [
      ...questionsOutsideSection,
      ...preservedQuestions,
      ...regeneratedQuestions,
    ];

    /*
     * -----------------------------------------
     * 5. RECALCULATE COVERAGE
     * -----------------------------------------
     */

   const coverageResult = checkCoverage(
  currentKit.role.requirements,
  mergedQuestions
);

const coverage = {
  uncovered_requirement_ids:
    coverageResult.uncoveredRequirementIds,
  passes: coverageResult.passes,
};

    /*
     * -----------------------------------------
     * 6. REBUILD SCHEDULE
     * -----------------------------------------
     */

    const daysAvailable =
      currentKit.schedule.days_available;

    const schedule = allocateSchedule(
      mergedQuestions,
      currentKit.role.requirements,
      daysAvailable
    );

    /*
     * -----------------------------------------
     * 7. REGENERATE FLASHCARDS
     * -----------------------------------------
     *
     * Human-edited / pinned flashcards stay.
     * Generated unpinned flashcards are replaced.
     */

    const preservedFlashcards =
      currentKit.flashcards.filter(
        (flashcard) => {
          const metadata =
            currentMeta.flashcards[
              flashcard.id
            ];

          return (
            metadata?.origin === "user_added" ||
            metadata?.origin === "user_edited" ||
            metadata?.isPinned === true
          );
        }
      );

    const generatedFlashcards =
      await generateFlashcards(
        currentKit.role.requirements,
        mergedQuestions
      );

    /*
     * Generated flashcards already use
     * fc-001, fc-002, etc.
     *
     * To avoid collisions with preserved
     * human flashcards, give regenerated
     * flashcards unique IDs.
     */

    const regeneratedFlashcards: Flashcard[] =
      generatedFlashcards.map(
        (flashcard, index) => ({
          ...flashcard,
          id: `regen-fc-${Date.now()}-${index}`,
        })
      );

    const mergedFlashcards: Flashcard[] = [
      ...preservedFlashcards,
      ...regeneratedFlashcards,
    ];

    /*
     * -----------------------------------------
     * 8. REBUILD QUESTION METADATA
     * -----------------------------------------
     */

    const updatedQuestionMeta =
      Object.fromEntries(
        mergedQuestions.map((question) => {
          const previousMeta =
            currentMeta.questions[question.id];

          if (previousMeta) {
            return [
              question.id,
              {
                origin: previousMeta.origin,
                isPinned:
                  previousMeta.isPinned,
              },
            ];
          }

          return [
            question.id,
            {
              origin: "generated" as const,
              isPinned: false,
            },
          ];
        })
      );

    /*
     * -----------------------------------------
     * 9. REBUILD FLASHCARD METADATA
     * -----------------------------------------
     */

    const updatedFlashcardMeta =
      Object.fromEntries(
        mergedFlashcards.map((flashcard) => {
          const previousMeta =
            currentMeta.flashcards[
              flashcard.id
            ];

          if (previousMeta) {
            return [
              flashcard.id,
              {
                origin: previousMeta.origin,
                isPinned:
                  previousMeta.isPinned,
              },
            ];
          }

          return [
            flashcard.id,
            {
              origin: "generated" as const,
              isPinned: false,
            },
          ];
        })
      );

    /*
     * -----------------------------------------
     * 10. BUILD FINAL KIT
     * -----------------------------------------
     */

    const updatedKit: InterviewKit = {
      ...currentKit,

      questions: mergedQuestions,

      flashcards: mergedFlashcards,

      coverage,

      schedule,
    };

    /*
     * -----------------------------------------
     * 11. SAVE
     * -----------------------------------------
     */

    existingKit.kit = updatedKit;

    existingKit.builderMeta = {
      questions: updatedQuestionMeta,

      flashcards: updatedFlashcardMeta,

      companyBrief:
        currentMeta.companyBrief,
    };

    await existingKit.save();

    /*
     * -----------------------------------------
     * 12. RESPONSE
     * -----------------------------------------
     */

    res.json({
      success: true,

      message:
        `${section} section regenerated successfully`,

      kit: {
        id: existingKit._id.toString(),
        title: existingKit.title,
        status: existingKit.status,
        data: existingKit.kit,
        builderMeta:
          existingKit.builderMeta,
        createdAt:
          existingKit.createdAt,
        updatedAt:
          existingKit.updatedAt,
      },
    });
  } catch (error) {
    next(error);
  }
}