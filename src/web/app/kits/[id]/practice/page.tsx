"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Check,
  ChevronRight,
  Eye,
  RotateCcw,
} from "lucide-react";

import { getKit } from "../../../../lib/kits";
import type { Flashcard, InterviewKit } from "../../../../types/kit";

type Confidence = 1 | 2 | 3;

interface CardResult {
  cardId: string;
  confidence: Confidence;
}

export default function PracticeFlashcardsPage() {
  const params = useParams();
  const router = useRouter();

  const kitId = params.id as string;

  const [kit, setKit] = useState<InterviewKit | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [currentIndex, setCurrentIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [results, setResults] = useState<CardResult[]>([]);
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    async function loadKit() {
      try {
        setLoading(true);
        setError("");

        const result = await getKit(kitId);

        if (!result.data) {
          setError("Interview kit data is not available.");
          return;
        }

        setKit(result.data);
      } catch (err) {
        console.error("Failed to load flashcards:", err);
        setError("Unable to load flashcards.");
      } finally {
        setLoading(false);
      }
    }

    if (kitId) {
      loadKit();
    }
  }, [kitId]);

  /*
   * Low-confidence cards are moved earlier in the
   * next review cycle.
   */
  const orderedCards = useMemo(() => {
    if (!kit) {
      return [];
    }

    const lowConfidenceIds = new Set(
      results
        .filter((result) => result.confidence === 1)
        .map((result) => result.cardId)
    );

    const lowConfidenceCards: Flashcard[] = [];
    const otherCards: Flashcard[] = [];

    kit.flashcards.forEach((card) => {
      if (lowConfidenceIds.has(card.id)) {
        lowConfidenceCards.push(card);
      } else {
        otherCards.push(card);
      }
    });

    return [...lowConfidenceCards, ...otherCards];
  }, [kit, results]);

  const currentCard = orderedCards[currentIndex];

  function handleReveal() {
    setRevealed(true);
  }

  function handleConfidence(confidence: Confidence) {
    if (!currentCard) {
      return;
    }

    setResults((previous) => {
      const existing = previous.find(
        (result) => result.cardId === currentCard.id
      );

      if (existing) {
        return previous.map((result) =>
          result.cardId === currentCard.id
            ? {
                ...result,
                confidence,
              }
            : result
        );
      }

      return [
        ...previous,
        {
          cardId: currentCard.id,
          confidence,
        },
      ];
    });

    if (currentIndex >= orderedCards.length - 1) {
      setFinished(true);
      return;
    }

    setCurrentIndex((previous) => previous + 1);
    setRevealed(false);
  }

  function restartPractice() {
    setCurrentIndex(0);
    setRevealed(false);
    setResults([]);
    setFinished(false);
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <div className="text-gray-600">
          Loading flashcards...
        </div>
      </main>
    );
  }

  if (error || !kit) {
    return (
      <main className="min-h-screen bg-gray-50 p-6">
        <div className="mx-auto max-w-4xl">
          <button
            onClick={() => router.push(`/kits/${kitId}`)}
            className="mb-6 flex items-center gap-2 text-sm text-gray-600 hover:text-black"
          >
            <ArrowLeft size={18} />
            Back to Kit
          </button>

          <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-700">
            {error || "Interview kit not found."}
          </div>
        </div>
      </main>
    );
  }

  if (kit.flashcards.length === 0) {
    return (
      <main className="min-h-screen bg-gray-50 p-6">
        <div className="mx-auto max-w-4xl">
          <button
            onClick={() => router.push(`/kits/${kitId}`)}
            className="mb-6 flex items-center gap-2 text-sm text-gray-600 hover:text-black"
          >
            <ArrowLeft size={18} />
            Back to Kit
          </button>

          <div className="rounded-xl border bg-white p-8 text-center shadow-sm">
            <h1 className="text-2xl font-bold text-gray-900">
              No Flashcards Available
            </h1>

            <p className="mt-2 text-gray-600">
              This interview kit does not contain any flashcards.
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (finished) {
    const lowConfidenceCount = results.filter(
      (result) => result.confidence === 1
    ).length;

    const mediumConfidenceCount = results.filter(
      (result) => result.confidence === 2
    ).length;

    const highConfidenceCount = results.filter(
      (result) => result.confidence === 3
    ).length;

    return (
      <main className="min-h-screen bg-gray-50 p-6">
        <div className="mx-auto max-w-4xl">
          <button
            onClick={() => router.push(`/kits/${kitId}`)}
            className="mb-6 flex items-center gap-2 text-sm text-gray-600 hover:text-black"
          >
            <ArrowLeft size={18} />
            Back to Kit
          </button>

          <div className="rounded-xl border bg-white p-8 shadow-sm">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
              <Check className="text-green-600" size={28} />
            </div>

            <h1 className="mt-5 text-3xl font-bold text-gray-900">
              Practice Complete
            </h1>

            <p className="mt-2 text-gray-600">
              You reviewed all {kit.flashcards.length} flashcards.
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              <div className="rounded-lg border p-5">
                <p className="text-sm text-gray-500">
                  Low confidence
                </p>
                <p className="mt-1 text-2xl font-bold text-gray-900">
                  {lowConfidenceCount}
                </p>
              </div>

              <div className="rounded-lg border p-5">
                <p className="text-sm text-gray-500">
                  Medium confidence
                </p>
                <p className="mt-1 text-2xl font-bold text-gray-900">
                  {mediumConfidenceCount}
                </p>
              </div>

              <div className="rounded-lg border p-5">
                <p className="text-sm text-gray-500">
                  High confidence
                </p>
                <p className="mt-1 text-2xl font-bold text-gray-900">
                  {highConfidenceCount}
                </p>
              </div>
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <button
                onClick={restartPractice}
                className="flex items-center gap-2 rounded-lg bg-black px-5 py-2.5 text-sm font-medium text-white hover:bg-gray-800"
              >
                <RotateCcw size={17} />
                Practice Again
              </button>

              <button
                onClick={() => router.push(`/kits/${kitId}`)}
                className="rounded-lg border px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Back to Kit
              </button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-4xl">
        <button
          onClick={() => router.push(`/kits/${kitId}`)}
          className="mb-6 flex items-center gap-2 text-sm text-gray-600 hover:text-black"
        >
          <ArrowLeft size={18} />
          Back to Kit
        </button>

        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Practice Flashcards
              </h1>

              <p className="mt-1 text-sm text-gray-500">
                {kit.source.company} · {kit.source.role}
              </p>
            </div>

            <span className="text-sm font-medium text-gray-600">
              {currentIndex + 1} / {orderedCards.length}
            </span>
          </div>

          <div className="mt-4 h-2 overflow-hidden rounded-full bg-gray-200">
            <div
              className="h-full bg-black transition-all"
              style={{
                width: `${
                  ((currentIndex + 1) /
                    orderedCards.length) *
                  100
                }%`,
              }}
            />
          </div>
        </div>

        <div className="rounded-xl border bg-white p-6 shadow-sm sm:p-8">
          <div className="mb-6 flex items-center justify-between">
            <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
              Flashcard {currentIndex + 1}
            </span>

            <span className="text-xs text-gray-400">
              {currentCard.requirement_ids.length} linked
              requirement
              {currentCard.requirement_ids.length === 1
                ? ""
                : "s"}
            </span>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
              Question
            </p>

            <h2 className="mt-3 text-2xl font-semibold leading-relaxed text-gray-900">
              {currentCard.front}
            </h2>
          </div>

          {revealed && (
            <div className="mt-8 rounded-xl bg-gray-50 p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                Answer
              </p>

              <p className="mt-3 leading-7 text-gray-700">
                {currentCard.back}
              </p>
            </div>
          )}

          {!revealed ? (
            <button
              onClick={handleReveal}
              className="mt-8 flex w-full items-center justify-center gap-2 rounded-lg bg-black px-5 py-3 font-medium text-white hover:bg-gray-800"
            >
              <Eye size={18} />
              Reveal Answer
            </button>
          ) : (
            <div className="mt-8">
              <p className="mb-3 text-sm font-medium text-gray-700">
                How confident are you?
              </p>

              <div className="grid gap-3 sm:grid-cols-3">
                <button
                  onClick={() => handleConfidence(1)}
                  className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 hover:bg-red-100"
                >
                  1 — Low
                </button>

                <button
                  onClick={() => handleConfidence(2)}
                  className="rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm font-medium text-yellow-700 hover:bg-yellow-100"
                >
                  2 — Medium
                </button>

                <button
                  onClick={() => handleConfidence(3)}
                  className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700 hover:bg-green-100"
                >
                  3 — High
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="mt-4 flex justify-between text-sm text-gray-500">
          <span>
            Low-confidence cards will be prioritized for review.
          </span>

          {revealed && (
            <span className="flex items-center gap-1">
              Choose confidence
              <ChevronRight size={16} />
            </span>
          )}
        </div>
      </div>
    </main>
  );
}