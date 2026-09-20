import type { Question, Requirement } from "../types/kit";

export interface CoverageResult {
  uncoveredRequirementIds: string[];
  passes: number;
}

export function findUncoveredRequirements(
  requirements: Requirement[],
  questions: Question[]
): string[] {
  const mustRequirementIds = requirements
    .filter((requirement) => requirement.priority === "must")
    .map((requirement) => requirement.id);

  const coveredRequirementIds = new Set(
    questions.flatMap((question) => question.requirement_ids)
  );

  return mustRequirementIds.filter(
    (requirementId) => !coveredRequirementIds.has(requirementId)
  );
}

export function checkCoverage(
  requirements: Requirement[],
  questions: Question[]
): CoverageResult {
  return {
    uncoveredRequirementIds: findUncoveredRequirements(
      requirements,
      questions
    ),
    passes: 1,
  };
}