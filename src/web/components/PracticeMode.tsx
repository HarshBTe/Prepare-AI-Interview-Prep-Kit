"use client";

import { useMemo, useState } from "react";
import type { Flashcard } from "../../../src/types/kit";

interface PracticeModeProps {
  flashcards: Flashcard[];
}

type Confidence = 1 | 2 | 3;

interface CardProgress {
  confidence?: Confidence;
  revealed: boolean;
}

export default function PracticeMode({
  flashcards,
}: PracticeModeProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const [progress, setProgress] = useState<
    Record<string, CardProgress>
  >({});

  const currentCard = flashcards[currentIndex];

  const currentProgress = currentCard
    ? progress[currentCard.id]
    : undefined;

  const revealed = currentProgress?.revealed ?? false;

  const orderedFlashcards = useMemo(() => {
    return [...flashcards].sort((a, b) => {
      const aConfidence = progress[a.id]?.confidence ?? 0;
      const bConfidence = progress[b.id]?.confidence ?? 0;

      return aConfidence - bConfidence;
    });
  }, [flashcards, progress]);

  const handleReveal = () => {
    if (!currentCard) return;

    setProgress((prev) => ({
      ...prev,
      [currentCard.id]: {
        ...prev[currentCard.id],
        revealed: true,
      },
    }));
  };

  const handleConfidence = (confidence: Confidence) => {
    if (!currentCard) return;

    setProgress((prev) => ({
      ...prev,
      [currentCard.id]: {
        revealed: true,
        confidence,
      },
    }));
  };

  const handleNext = () => {
    if (currentIndex < flashcards.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  if (!flashcards.length) {
    return (
      <div className="rounded-xl border bg-white p-8 text-center">
        <h2 className="text-xl font-semibold">
          No flashcards available
        </h2>

        <p className="mt-2 text-gray-500">
          Generate or add flashcards before starting practice.
        </p>
      </div>
    );
  }

  if (!currentCard) {
    return null;
  }

  return (
    <div className="mx-auto max-w-2xl">
      {/* Progress */}
      <div className="mb-4 flex items-center justify-between">
        <span className="text-sm text-gray-500">
          Card {currentIndex + 1} of {flashcards.length}
        </span>

        <span className="text-sm text-gray-500">
          Confidence:{" "}
          {currentProgress?.confidence
            ? currentProgress.confidence
            : "Not rated"}
        </span>
      </div>

      {/* Flashcard */}
      <div className="rounded-2xl border bg-white p-8 shadow-sm">
        <div className="mb-6">
          <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Question
          </span>

          <h2 className="mt-3 text-xl font-semibold text-gray-900">
            {currentCard.front}
          </h2>
        </div>

        {!revealed ? (
          <button
            type="button"
            onClick={handleReveal}
            className="w-full rounded-lg bg-black px-4 py-3 font-medium text-white hover:opacity-90"
          >
            Reveal Answer
          </button>
        ) : (
          <>
            <div className="mb-6 rounded-lg bg-gray-50 p-5">
              <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Answer
              </span>

              <p className="mt-2 text-gray-700">
                {currentCard.back}
              </p>
            </div>

            {/* Confidence */}
            <div>
              <p className="mb-3 text-sm font-medium text-gray-700">
                How confident are you?
              </p>

              <div className="grid grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => handleConfidence(1)}
                  className="rounded-lg border px-4 py-3 hover:bg-gray-50"
                >
                  <span className="block font-semibold">1</span>
                  <span className="text-xs text-gray-500">
                    Low
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handleConfidence(2)}
                  className="rounded-lg border px-4 py-3 hover:bg-gray-50"
                >
                  <span className="block font-semibold">2</span>
                  <span className="text-xs text-gray-500">
                    Medium
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handleConfidence(3)}
                  className="rounded-lg border px-4 py-3 hover:bg-gray-50"
                >
                  <span className="block font-semibold">3</span>
                  <span className="text-xs text-gray-500">
                    High
                  </span>
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Navigation */}
      <div className="mt-5 flex justify-between">
        <button
          type="button"
          onClick={handlePrevious}
          disabled={currentIndex === 0}
          className="rounded-lg border px-5 py-2 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Previous
        </button>

        <button
          type="button"
          onClick={handleNext}
          disabled={currentIndex === flashcards.length - 1}
          className="rounded-lg bg-black px-5 py-2 text-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  );
}