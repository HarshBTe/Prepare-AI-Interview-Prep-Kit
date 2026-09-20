"use client";

import { useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Pin,
  Plus,
  Save,
  Trash2,
  X,
} from "lucide-react";

import type {
  InterviewKit,
  QuestionCategory,
  Difficulty,
} from "../types/kit";

import type { BuilderMeta } from "../../../src/types/builder";

import { regenerateKitSection } from "@/lib/kits";

interface KitBuilderProps {
  kitId: string;
  initialKit: InterviewKit;
  initialMeta: BuilderMeta;
  onSave: (
    kit: InterviewKit,
    meta: BuilderMeta
  ) => Promise<void>;
  onCancel: () => void;
}

export default function KitBuilder({
  kitId,
  initialKit,
  initialMeta,
  onSave,
  onCancel,
}: KitBuilderProps) {
  const [kit, setKit] = useState<InterviewKit>(
    structuredClone(initialKit)
  );

  const [meta, setMeta] = useState<BuilderMeta>(
    structuredClone(initialMeta)
  );

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const [regeneratingSection, setRegeneratingSection] =
  useState<QuestionCategory | null>(null);

const [regenerateError, setRegenerateError] =
  useState("");

  function updateCompanySummary(value: string) {
    setKit((current) => ({
      ...current,
      company_brief: {
        ...current.company_brief,
        summary: value,
      },
    }));

    setMeta((current) => ({
      ...current,
      companyBrief: {
        ...current.companyBrief,
        origin: "user_edited",
      },
    }));
  }

  function updateCompanyWhatTheyDo(value: string) {
    setKit((current) => ({
      ...current,
      company_brief: {
        ...current.company_brief,
        what_they_do: value,
      },
    }));

    setMeta((current) => ({
      ...current,
      companyBrief: {
        ...current.companyBrief,
        origin: "user_edited",
      },
    }));
  }

  function updateQuestion(
    questionId: string,
    field: "prompt" | "answer_outline",
    value: string
  ) {
    setKit((current) => ({
      ...current,
      questions: current.questions.map((question) =>
        question.id === questionId
          ? {
              ...question,
              [field]: value,
            }
          : question
      ),
    }));

    setMeta((current) => ({
      ...current,
      questions: {
        ...current.questions,
        [questionId]: {
          ...(current.questions[questionId] ?? {
            origin: "generated",
            isPinned: false,
          }),
          origin: "user_edited",
        },
      },
    }));
  }

  function updateQuestionCategory(
    questionId: string,
    category: QuestionCategory
  ) {
    setKit((current) => ({
      ...current,
      questions: current.questions.map((question) =>
        question.id === questionId
          ? {
              ...question,
              category,
            }
          : question
      ),
    }));

    setMeta((current) => ({
      ...current,
      questions: {
        ...current.questions,
        [questionId]: {
          ...(current.questions[questionId] ?? {
            origin: "generated",
            isPinned: false,
          }),
          origin: "user_edited",
        },
      },
    }));
  }

  function updateQuestionDifficulty(
    questionId: string,
    difficulty: Difficulty
  ) {
    setKit((current) => ({
      ...current,
      questions: current.questions.map((question) =>
        question.id === questionId
          ? {
              ...question,
              difficulty,
            }
          : question
      ),
    }));

    setMeta((current) => ({
      ...current,
      questions: {
        ...current.questions,
        [questionId]: {
          ...(current.questions[questionId] ?? {
            origin: "generated",
            isPinned: false,
          }),
          origin: "user_edited",
        },
      },
    }));
  }

  function deleteQuestion(questionId: string) {
    setKit((current) => ({
      ...current,
      questions: current.questions.filter(
        (question) => question.id !== questionId
      ),
      schedule: {
        ...current.schedule,
        days: current.schedule.days.map((day) => ({
          ...day,
          question_ids: day.question_ids.filter(
            (id) => id !== questionId
          ),
        })),
      },
    }));

    setMeta((current) => {
      const nextQuestions = {
        ...current.questions,
      };

      delete nextQuestions[questionId];

      return {
        ...current,
        questions: nextQuestions,
      };
    });
  }

function addQuestion() {
  const newId = `user-q-${Date.now()}`;

  const firstRequirement =
    kit.role.requirements[0];

  const newQuestion = {
    id: newId,
    requirement_ids: firstRequirement
      ? [firstRequirement.id]
      : [],
    category: "technical" as QuestionCategory,
    prompt: "",
    answer_outline: "",
    difficulty: 1 as Difficulty,
  };

  setKit((current) => ({
    ...current,
    questions: [
      ...current.questions,
      newQuestion,
    ],
  }));

  setMeta((current) => ({
    ...current,
    questions: {
      ...current.questions,
      [newId]: {
        origin: "user_added",
        isPinned: false,
      },
    },
  }));
}

  function moveQuestion(
    questionId: string,
    direction: "up" | "down"
  ) {
    setKit((current) => {
      const questions = [...current.questions];

      const index = questions.findIndex(
        (question) => question.id === questionId
      );

      if (index === -1) {
        return current;
      }

      const targetIndex =
        direction === "up"
          ? index - 1
          : index + 1;

      if (
        targetIndex < 0 ||
        targetIndex >= questions.length
      ) {
        return current;
      }

      [
        questions[index],
        questions[targetIndex],
      ] = [
        questions[targetIndex],
        questions[index],
      ];

      return {
        ...current,
        questions,
      };
    });
  }

  function toggleQuestionPin(questionId: string) {
    setMeta((current) => ({
      ...current,
      questions: {
        ...current.questions,
        [questionId]: {
          ...(current.questions[questionId] ?? {
            origin: "generated",
            isPinned: false,
          }),
          isPinned:
            !(
              current.questions[questionId]
                ?.isPinned ?? false
            ),
        },
      },
    }));
  }

  function updateFlashcard(
    flashcardId: string,
    field: "front" | "back",
    value: string
  ) {
    setKit((current) => ({
      ...current,
      flashcards: current.flashcards.map(
        (flashcard) =>
          flashcard.id === flashcardId
            ? {
                ...flashcard,
                [field]: value,
              }
            : flashcard
      ),
    }));

    setMeta((current) => ({
      ...current,
      flashcards: {
        ...current.flashcards,
        [flashcardId]: {
          ...(current.flashcards[flashcardId] ?? {
            origin: "generated",
            isPinned: false,
          }),
          origin: "user_edited",
        },
      },
    }));
  }

  function toggleFlashcardPin(
    flashcardId: string
  ) {
    setMeta((current) => ({
      ...current,
      flashcards: {
        ...current.flashcards,
        [flashcardId]: {
          ...(current.flashcards[flashcardId] ?? {
            origin: "generated",
            isPinned: false,
          }),
          isPinned:
            !(
              current.flashcards[flashcardId]
                ?.isPinned ?? false
            ),
        },
      },
    }));
  }

  function formatSectionName(
  section: QuestionCategory
): string {
  switch (section) {
    case "technical":
      return "Technical";

    case "behavioural":
      return "Behavioural";

    case "system-design":
      return "System Design";

    case "company-fit":
      return "Company Fit";

    default:
      return section;
  }
}

  async function handleRegenerateSection(
  section: QuestionCategory
) {
  try {
    setRegeneratingSection(section);
    setRegenerateError("");

    const response =
      await regenerateKitSection(
        kitId,
        section
      );

    if (!response?.kit?.data) {
      throw new Error(
        "Invalid regeneration response"
      );
    }

    setKit(
      structuredClone(response.kit.data)
    );

    setMeta(
      structuredClone(
        response.kit.builderMeta
      )
    );
  } catch (error) {
    console.error(
      `Failed to regenerate ${section} section:`,
      error
    );

    setRegenerateError(
      `Unable to regenerate ${formatSectionName(
        section
      )}. Please try again.`
    );
  } finally {
    setRegeneratingSection(null);
  }
}

  async function handleSave() {
    try {
      setSaving(true);
      setSaveError("");

      await onSave(kit, meta);
    } catch (error) {
      console.error(
        "Failed to save interview kit:",
        error
      );

      setSaveError(
        "Unable to save changes. Please try again."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}

      <div className="flex flex-col gap-3 rounded-xl border bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">
            Edit Interview Kit
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Make changes to your preparation kit.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={onCancel}
            disabled={saving}
            className="flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            <X size={16} />
            Cancel
          </button>

          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 rounded-lg bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
          >
            <Save size={16} />

            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>

      {saveError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {saveError}
        </div>
      )}

      {regenerateError && (
  <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
    {regenerateError}
  </div>
)}

      {/* Company Brief */}

      <section className="rounded-xl border bg-white p-6 shadow-sm">
        <h3 className="mb-5 text-lg font-semibold text-gray-900">
          Company Brief
        </h3>

        <div className="space-y-5">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Summary
            </label>

            <textarea
              value={kit.company_brief.summary}
              onChange={(event) =>
                updateCompanySummary(
                  event.target.value
                )
              }
              rows={4}
              className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-black"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              What they do
            </label>

            <textarea
              value={
                kit.company_brief.what_they_do
              }
              onChange={(event) =>
                updateCompanyWhatTheyDo(
                  event.target.value
                )
              }
              rows={4}
              className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-black"
            />
          </div>
        </div>
      </section>

      {/* Questions */}

      <section className="rounded-xl border bg-white p-6 shadow-sm">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Interview Questions
            </h3>

            <p className="text-sm text-gray-500">
              Edit, reorder, pin, add or delete questions.
            </p>
          </div>

         <div className="flex flex-wrap gap-2">
  <button
    onClick={() =>
      handleRegenerateSection("technical")
    }
    disabled={regeneratingSection !== null}
    className="rounded-lg border px-3 py-2 text-sm font-medium hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
  >
    {regeneratingSection === "technical"
      ? "Regenerating..."
      : "↻ Technical"}
  </button>

  <button
    onClick={() =>
      handleRegenerateSection("behavioural")
    }
    disabled={regeneratingSection !== null}
    className="rounded-lg border px-3 py-2 text-sm font-medium hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
  >
    {regeneratingSection === "behavioural"
      ? "Regenerating..."
      : "↻ Behavioural"}
  </button>

  <button
    onClick={() =>
      handleRegenerateSection("system-design")
    }
    disabled={regeneratingSection !== null}
    className="rounded-lg border px-3 py-2 text-sm font-medium hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
  >
    {regeneratingSection === "system-design"
      ? "Regenerating..."
      : "↻ System Design"}
  </button>

  <button
    onClick={() =>
      handleRegenerateSection("company-fit")
    }
    disabled={regeneratingSection !== null}
    className="rounded-lg border px-3 py-2 text-sm font-medium hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
  >
    {regeneratingSection === "company-fit"
      ? "Regenerating..."
      : "↻ Company Fit"}
  </button>

  <button
    onClick={addQuestion}
    disabled={regeneratingSection !== null}
    className="flex items-center justify-center gap-2 rounded-lg bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
  >
    <Plus size={16} />
    Add Question
  </button>
</div>
        </div>

        <div className="space-y-5">
          {kit.questions.map(
            (question, index) => {
              const questionMeta =
                meta.questions[
                  question.id
                ] ?? {
                  origin: "generated" as const,
                  isPinned: false,
                };

              return (
                <div
                  key={question.id}
                  className="rounded-xl border p-5"
                >
                  <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600">
                        Question {index + 1}
                      </span>

                      <span className="rounded bg-gray-100 px-2 py-1 text-xs text-gray-600">
                        {questionMeta.origin}
                      </span>

                      {questionMeta.isPinned && (
                        <span className="flex items-center gap-1 rounded bg-yellow-100 px-2 py-1 text-xs text-yellow-700">
                          <Pin size={12} />
                          Pinned
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() =>
                          moveQuestion(
                            question.id,
                            "up"
                          )
                        }
                        disabled={index === 0}
                        className="rounded border p-2 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-30"
                        title="Move up"
                      >
                        <ArrowUp size={15} />
                      </button>

                      <button
                        onClick={() =>
                          moveQuestion(
                            question.id,
                            "down"
                          )
                        }
                        disabled={
                          index ===
                          kit.questions.length - 1
                        }
                        className="rounded border p-2 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-30"
                        title="Move down"
                      >
                        <ArrowDown size={15} />
                      </button>

                      <button
                        onClick={() =>
                          toggleQuestionPin(
                            question.id
                          )
                        }
                        className="rounded border p-2 hover:bg-gray-50"
                        title="Pin question"
                      >
                        <Pin size={15} />
                      </button>

                      <button
                        onClick={() =>
                          deleteQuestion(
                            question.id
                          )
                        }
                        className="rounded border border-red-200 p-2 text-red-600 hover:bg-red-50"
                        title="Delete question"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700">
                        Question
                      </label>

                      <textarea
                        value={question.prompt}
                        onChange={(event) =>
                          updateQuestion(
                            question.id,
                            "prompt",
                            event.target.value
                          )
                        }
                        rows={3}
                        className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-black"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700">
                        Answer Outline
                      </label>

                      <textarea
                        value={
                          question.answer_outline
                        }
                        onChange={(event) =>
                          updateQuestion(
                            question.id,
                            "answer_outline",
                            event.target.value
                          )
                        }
                        rows={3}
                        className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-black"
                      />
                    </div>

                    <div>
  <label className="mb-2 block text-sm font-medium text-gray-700">
    Requirements
  </label>

  <div className="grid gap-2 rounded-lg border p-3 sm:grid-cols-2">
    {kit.role.requirements.map(
      (requirement) => {
        const checked =
          question.requirement_ids.includes(
            requirement.id
          );

        return (
          <label
            key={requirement.id}
            className="flex cursor-pointer items-start gap-2 rounded-md p-2 hover:bg-gray-50"
          >
            <input
              type="checkbox"
              checked={checked}
              onChange={() => {
                const nextRequirementIds =
                  checked
                    ? question.requirement_ids.filter(
                        (id) =>
                          id !== requirement.id
                      )
                    : [
                        ...question.requirement_ids,
                        requirement.id,
                      ];

                /*
                 * Never allow a question to have
                 * zero requirements.
                 */
                if (
                  nextRequirementIds.length === 0
                ) {
                  return;
                }

                setKit((current) => ({
                  ...current,
                  questions:
                    current.questions.map(
                      (item) =>
                        item.id === question.id
                          ? {
                              ...item,
                              requirement_ids:
                                nextRequirementIds,
                            }
                          : item
                    ),
                }));

                setMeta((current) => ({
                  ...current,
                  questions: {
                    ...current.questions,
                    [question.id]: {
                      ...(current.questions[
                        question.id
                      ] ?? {
                        origin: "generated",
                        isPinned: false,
                      }),
                      origin: "user_edited",
                    },
                  },
                }));
              }}
              className="mt-1"
            />

            <span className="text-sm text-gray-700">
              {requirement.text}
            </span>
          </label>
        );
      }
    )}
  </div>

  {question.requirement_ids.length === 0 && (
    <p className="mt-2 text-xs text-red-600">
      Select at least one requirement.
    </p>
  )}
</div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="mb-2 block text-sm font-medium text-gray-700">
                          Category
                        </label>

                        <select
                          value={
                            question.category
                          }
                          onChange={(event) =>
                            updateQuestionCategory(
                              question.id,
                              event.target
                                .value as QuestionCategory
                            )
                          }
                          className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-black"
                        >
                          <option value="technical">
                            Technical
                          </option>

                          <option value="behavioural">
                            Behavioural
                          </option>

                          <option value="system-design">
                            System Design
                          </option>

                          <option value="company-fit">
                            Company Fit
                          </option>
                        </select>
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-medium text-gray-700">
                          Difficulty
                        </label>

                        <select
                          value={
                            question.difficulty
                          }
                          onChange={(event) =>
                            updateQuestionDifficulty(
                              question.id,
                              Number(
                                event.target.value
                              ) as Difficulty
                            )
                          }
                          className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-black"
                        >
                          <option value={1}>
                            1 - Foundational
                          </option>

                          <option value={2}>
                            2 - Intermediate
                          </option>

                          <option value={3}>
                            3 - Advanced
                          </option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              );
            }
          )}
        </div>
      </section>

      {/* Flashcards */}

      <section className="rounded-xl border bg-white p-6 shadow-sm">
        <h3 className="mb-5 text-lg font-semibold text-gray-900">
          Flashcards
        </h3>

        <div className="space-y-5">
          {kit.flashcards.map((flashcard) => {
            const flashcardMeta =
              meta.flashcards[
                flashcard.id
              ] ?? {
                origin: "generated" as const,
                isPinned: false,
              };

            return (
              <div
                key={flashcard.id}
                className="rounded-xl border p-5"
              >
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex gap-2">
                    <span className="rounded bg-gray-100 px-2 py-1 text-xs text-gray-600">
                      {flashcardMeta.origin}
                    </span>

                    {flashcardMeta.isPinned && (
                      <span className="flex items-center gap-1 rounded bg-yellow-100 px-2 py-1 text-xs text-yellow-700">
                        <Pin size={12} />
                        Pinned
                      </span>
                    )}
                  </div>

                  <button
                    onClick={() =>
                      toggleFlashcardPin(
                        flashcard.id
                      )
                    }
                    className="rounded border p-2 hover:bg-gray-50"
                    title="Pin flashcard"
                  >
                    <Pin size={15} />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                      Front
                    </label>

                    <textarea
                      value={flashcard.front}
                      onChange={(event) =>
                        updateFlashcard(
                          flashcard.id,
                          "front",
                          event.target.value
                        )
                      }
                      rows={3}
                      className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-black"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                      Back
                    </label>

                    <textarea
                      value={flashcard.back}
                      onChange={(event) =>
                        updateFlashcard(
                          flashcard.id,
                          "back",
                          event.target.value
                        )
                      }
                      rows={3}
                      className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-black"
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}