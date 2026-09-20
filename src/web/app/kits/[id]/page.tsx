"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";

import { getKit, updateKit } from "../../../lib/kits";
import type { InterviewKit } from "../../../types/kit";
import type { BuilderMeta } from "../../../../types/builder";
import KitBuilder from "../../../components/KitBuilder";

export default function KitDetailsPage() {
  const params = useParams();
  const router = useRouter();

  const [kit, setKit] = useState<InterviewKit | null>(null);
  const [builderMeta, setBuilderMeta] =
    useState<BuilderMeta | null>(null);

  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState("");

  const kitId = params.id as string;

  useEffect(() => {
    async function loadKit() {
      try {
        setLoading(true);
        setError("");

        const result = await getKit(kitId);

        setTitle(result.title);

        if (result.data) {
          setKit(result.data);
          setBuilderMeta(result.builderMeta);
        } else {
          setError(
            "Interview kit data is not available."
          );
        }
      } catch (err) {
        console.error(
          "Failed to load kit:",
          err
        );

        setError(
          "Unable to load this interview kit."
        );
      } finally {
        setLoading(false);
      }
    }

    if (kitId) {
      loadKit();
    }
  }, [kitId]);

  async function handleSave(
    updatedKit: InterviewKit,
    updatedMeta: BuilderMeta
  ) {
    const result = await updateKit(
      kitId,
      updatedKit,
      updatedMeta
    );

    if (result.data) {
      setKit(result.data);
    }

    setBuilderMeta(result.builderMeta);
    setTitle(result.title);
    setEditing(false);
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-2 text-gray-600">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading interview kit...
        </div>
      </main>
    );
  }

  if (error || !kit || !builderMeta) {
    return (
      <main className="min-h-screen p-6">
        <button
          onClick={() =>
            router.push("/dashboard")
          }
          className="mb-6 flex items-center gap-2 text-sm text-gray-600 hover:text-black"
        >
          <ArrowLeft size={18} />
          Back to Dashboard
        </button>

        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-red-700">
          {error || "Interview kit not found."}
        </div>
      </main>
    );
  }

  /*
   * ============================
   * BUILDER MODE
   * ============================
   */

  if (editing) {
    return (
      <main className="min-h-screen bg-gray-50 p-6">
        <div className="mx-auto max-w-6xl">
          <button
            onClick={() => setEditing(false)}
            className="mb-6 flex items-center gap-2 text-sm text-gray-600 hover:text-black"
          >
            <ArrowLeft size={18} />
            Back to Kit
          </button>

          <KitBuilder
  kitId={kitId}
  initialKit={kit}
  initialMeta={builderMeta}
  onSave={handleSave}
  onCancel={() => setEditing(false)}
/>
        </div>
      </main>
    );
  }

  /*
   * ============================
   * VIEW MODE
   * ============================
   */

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-6xl">
        <button
          onClick={() =>
            router.push("/dashboard")
          }
          className="mb-6 flex items-center gap-2 text-sm text-gray-600 hover:text-black"
        >
          <ArrowLeft size={18} />
          Back to Dashboard
        </button>

        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {title}
            </h1>

            <p className="mt-2 text-sm text-gray-500">
              {kit.source.company} ·{" "}
              {kit.source.role}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setEditing(true)}
              className="rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-800 transition hover:bg-gray-100"
            >
              Edit Kit
            </button>

            <button
              onClick={() =>
                router.push(
                  `/kits/${kitId}/practice`
                )
              }
              className="rounded-lg bg-black px-5 py-2.5 text-sm font-medium text-white transition hover:bg-gray-800"
            >
              Practice Flashcards
            </button>
          </div>
        </div>

        {/* Company Brief */}

        <section className="rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-xl font-semibold">
            Company Brief
          </h2>

          <p className="mb-4 text-gray-700">
            {kit.company_brief.summary}
          </p>

          <h3 className="mb-2 font-semibold">
            What they do
          </h3>

          <p className="text-gray-700">
            {kit.company_brief.what_they_do}
          </p>
        </section>

        {/* Role */}

        <section className="mt-6 rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-xl font-semibold">
            Role
          </h2>

          <p className="text-gray-700">
            <strong>Title:</strong>{" "}
            {kit.role.title}
          </p>

          <p className="mt-2 text-gray-700">
            <strong>Seniority:</strong>{" "}
            {kit.role.seniority}
          </p>
        </section>

        {/* Requirements */}

        <section className="mt-6 rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-xl font-semibold">
            Requirements
          </h2>

          <div className="space-y-3">
            {kit.role.requirements.map(
              (requirement) => (
                <div
                  key={requirement.id}
                  className="rounded-lg border p-4"
                >
                  <p className="font-medium text-gray-900">
                    {requirement.text}
                  </p>

                  <div className="mt-2 flex gap-2 text-xs">
                    <span className="rounded bg-gray-100 px-2 py-1">
                      {requirement.kind}
                    </span>

                    <span className="rounded bg-gray-100 px-2 py-1">
                      {requirement.priority}
                    </span>
                  </div>
                </div>
              )
            )}
          </div>
        </section>

        {/* Interview Questions */}

        <section className="mt-6 rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-xl font-semibold">
            Interview Questions
          </h2>

          <div className="space-y-4">
            {kit.questions.map(
              (question, index) => (
                <div
                  key={question.id}
                  className="rounded-lg border p-4"
                >
                  <p className="font-medium text-gray-900">
                    {index + 1}.{" "}
                    {question.prompt}
                  </p>

                  <div className="mt-2 flex flex-wrap gap-2 text-xs">
                    <span className="rounded bg-gray-100 px-2 py-1">
                      {question.category}
                    </span>

                    <span className="rounded bg-gray-100 px-2 py-1">
                      Difficulty{" "}
                      {question.difficulty}
                    </span>
                  </div>

                  <div className="mt-4">
                    <p className="text-sm font-semibold text-gray-700">
                      Answer outline
                    </p>

                    <p className="mt-1 text-sm text-gray-600">
                      {question.answer_outline}
                    </p>
                  </div>
                </div>
              )
            )}
          </div>
        </section>

        {/* Preparation Schedule */}

        <section className="mt-6 rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-xl font-semibold">
            Preparation Schedule
          </h2>

          <div className="space-y-4">
            {kit.schedule.days.map((day) => (
              <div
                key={day.day}
                className="rounded-lg border p-4"
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900">
                    Day {day.day}
                  </h3>

                  <span className="rounded bg-gray-100 px-2 py-1 text-sm text-gray-600">
                    {day.minutes} minutes
                  </span>
                </div>

                <p className="mt-2 text-sm text-gray-700">
                  <strong>Focus:</strong>{" "}
                  {day.focus}
                </p>

                <div className="mt-3">
                  <p className="text-sm font-semibold text-gray-700">
                    Questions
                  </p>

                  {day.question_ids
                    .length > 0 ? (
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-gray-600">
                      {day.question_ids.map(
                        (questionId) => {
                          const question =
                            kit.questions.find(
                              (item) =>
                                item.id ===
                                questionId
                            );

                          return (
                            <li
                              key={questionId}
                            >
                              {question
                                ? question.prompt
                                : questionId}
                            </li>
                          );
                        }
                      )}
                    </ul>
                  ) : (
                    <p className="mt-1 text-sm text-gray-500">
                      No questions assigned.
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}