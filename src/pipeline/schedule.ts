import type {
  DaySchedule,
  Question,
  Requirement,
  Schedule,
} from "../types/kit";

const BASE_MINUTES_BY_DIFFICULTY: Record<
  Question["difficulty"],
  number
> = {
  1: 20,
  2: 30,
  3: 45,
};

const SYSTEM_DESIGN_EXTRA_MINUTES = 15;

// Review sessions are used only when a requested day
// would otherwise remain empty.
const REVIEW_MINUTES = 15;


function getQuestionMinutes(question: Question): number {
  const baseMinutes =
    BASE_MINUTES_BY_DIFFICULTY[question.difficulty];

  if (question.category === "system-design") {
    return baseMinutes + SYSTEM_DESIGN_EXTRA_MINUTES;
  }

  return baseMinutes;
}

function getQuestionPriority(
  question: Question,
  requirements: Requirement[]
): number {
  const requirementMap = new Map(
    requirements.map((requirement) => [
      requirement.id,
      requirement,
    ])
  );

  const linkedRequirements = question.requirement_ids
    .map((id) => requirementMap.get(id))
    .filter(
      (requirement): requirement is Requirement =>
        Boolean(requirement)
    );

  const hasMustRequirement = linkedRequirements.some(
    (requirement) => requirement.priority === "must"
  );

  let score = 0;

  // Mandatory requirements should be handled earlier.
  if (hasMustRequirement) {
    score += 100;
  }

  // Heavy technical/system-design material goes earlier.
  if (question.category === "system-design") {
    score += 40;
  }

  if (question.category === "technical") {
    score += 20;
  }

  // More difficult questions get earlier placement.
  score += question.difficulty * 10;

  return score;
}

function isFinalPreparationQuestion(
  question: Question
): boolean {
  return (
    question.category === "behavioural" ||
    question.category === "company-fit"
  );
}

function createEmptyDays(
  daysAvailable: number
): DaySchedule[] {
  return Array.from(
    { length: daysAvailable },
    (_, index) => ({
      day: index + 1,
      focus: "Interview preparation",
      question_ids: [],
      minutes: 0,
    })
  );
}

function getTechnicalDayLimit(
  daysAvailable: number
): number {
  if (daysAvailable <= 1) {
    return 1;
  }

  return Math.max(1, daysAvailable - 2);
}

function findLeastLoadedTechnicalDay(
  days: DaySchedule[],
  technicalDayLimit: number
): number {
  let selectedIndex = 0;

  for (
    let index = 1;
    index < technicalDayLimit;
    index += 1
  ) {
    if (
      days[index].minutes <
      days[selectedIndex].minutes
    ) {
      selectedIndex = index;
    }
  }

  return selectedIndex;
}

function findLeastLoadedFinalDay(
  days: DaySchedule[],
  finalDayStart: number
): number {
  let selectedIndex = finalDayStart;

  for (
    let index = finalDayStart + 1;
    index < days.length;
    index += 1
  ) {
    if (
      days[index].minutes <
      days[selectedIndex].minutes
    ) {
      selectedIndex = index;
    }
  }

  return selectedIndex;
}

function updateDayFocus(
  days: DaySchedule[],
  questions: Question[]
): void {
  const questionMap = new Map(
    questions.map((question) => [
      question.id,
      question,
    ])
  );

  for (const day of days) {
    const dayQuestions = day.question_ids
      .map((id) => questionMap.get(id))
      .filter(
        (question): question is Question =>
          Boolean(question)
      );

    const categories = new Set(
      dayQuestions.map((question) => question.category)
    );

    if (
      categories.has("behavioural") ||
      categories.has("company-fit")
    ) {
      day.focus = "Behavioural and company fit";
    } else if (
      categories.has("system-design")
    ) {
      day.focus =
        "System design and technical preparation";
    } else if (categories.has("technical")) {
      day.focus = "Technical preparation";
    } else {
      day.focus = "Interview preparation";
    }
  }
}

/**
 * Ensures that requested preparation days are not left
 * completely empty when there are enough questions to
 * support review sessions.
 *
 * Review sessions reuse existing questions rather than
 * creating fabricated question IDs.
 */
function fillEmptyPreparationDays(
  days: DaySchedule[],
  questions: Question[]
): void {
  if (questions.length === 0) {
    return;
  }

  const sortedQuestions = [...questions].sort(
    (a, b) => {
      if (b.difficulty !== a.difficulty) {
        return b.difficulty - a.difficulty;
      }

      return a.id.localeCompare(b.id);
    }
  );

  let reviewIndex = 0;

  for (const day of days) {
    if (day.question_ids.length > 0) {
      continue;
    }

    const reviewQuestion =
      sortedQuestions[
        reviewIndex % sortedQuestions.length
      ];

    day.question_ids.push(reviewQuestion.id);
    day.minutes = REVIEW_MINUTES;
    day.focus = "Review and interview preparation";

    reviewIndex += 1;
  }
}

function validateScheduledQuestionIds(
  days: DaySchedule[],
  questions: Question[]
): void {
  const questionIds = new Set(
    questions.map((question) => question.id)
  );

  for (const day of days) {
    for (const questionId of day.question_ids) {
      if (!questionIds.has(questionId)) {
        throw new Error(
          `Schedule references unknown question ID: ${questionId}`
        );
      }
    }
  }
}

function validateMustRequirementCoverage(
  days: DaySchedule[],
  questions: Question[],
  requirements: Requirement[]
): void {
  const scheduledQuestionIds = new Set(
    days.flatMap((day) => day.question_ids)
  );

  const scheduledQuestions = questions.filter(
    (question) =>
      scheduledQuestionIds.has(question.id)
  );

  const scheduledRequirementIds = new Set(
    scheduledQuestions.flatMap(
      (question) => question.requirement_ids
    )
  );

  const uncoveredMustRequirements = requirements
    .filter(
      (requirement) =>
        requirement.priority === "must"
    )
    .filter(
      (requirement) =>
        !scheduledRequirementIds.has(requirement.id)
    );

  if (uncoveredMustRequirements.length > 0) {
    throw new Error(
      `Schedule does not cover must requirements: ${uncoveredMustRequirements
        .map((requirement) => requirement.id)
        .join(", ")}`
    );
  }
}

export function allocateSchedule(
  questions: Question[],
  requirements: Requirement[],
  daysAvailable: number
): Schedule {
  if (
    !Number.isInteger(daysAvailable) ||
    daysAvailable < 1
  ) {
    throw new Error(
      "daysAvailable must be a positive integer"
    );
  }

  const days = createEmptyDays(daysAvailable);

  if (questions.length === 0) {
    return {
      days_available: daysAvailable,
      days,
    };
  }

  const sortedQuestions = [...questions].sort(
    (a, b) => {
      const priorityDifference =
        getQuestionPriority(b, requirements) -
        getQuestionPriority(a, requirements);

      if (priorityDifference !== 0) {
        return priorityDifference;
      }

      return a.id.localeCompare(b.id);
    }
  );

  const technicalDayLimit =
    getTechnicalDayLimit(daysAvailable);

  const finalDayStart =
    daysAvailable === 1
      ? 0
      : Math.max(0, daysAvailable - 2);

  for (const question of sortedQuestions) {
    const minutes = getQuestionMinutes(question);

    let targetDay: number;

    if (
      isFinalPreparationQuestion(question) &&
      daysAvailable > 1
    ) {
      targetDay = findLeastLoadedFinalDay(
        days,
        finalDayStart
      );
    } else {
      targetDay = findLeastLoadedTechnicalDay(
        days,
        technicalDayLimit
      );
    }

    days[targetDay].question_ids.push(
      question.id
    );

    days[targetDay].minutes += minutes;
  }

  updateDayFocus(days, questions);

  /*
   * If there are no behavioural/company-fit questions,
   * the final preparation days would otherwise be empty.
   *
   * Reuse existing questions as short review sessions
   * so every requested preparation day has useful work.
   */
  fillEmptyPreparationDays(days, questions);

  validateScheduledQuestionIds(
    days,
    questions
  );

  validateMustRequirementCoverage(
    days,
    questions,
    requirements
  );

  return {
    days_available: daysAvailable,
    days,
  };
}