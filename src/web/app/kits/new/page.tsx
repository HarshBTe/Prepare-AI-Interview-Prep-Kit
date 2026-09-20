// src/web/app/kits/new/page.tsx

"use client";

import {
  FormEvent,
  useState,
} from "react";

import { useRouter } from "next/navigation";
import Link from "next/link";

import {
  ArrowLeft,
  Sparkles,
} from "lucide-react";

import {
  generateKit,
} from "../../../lib/kits";

export default function NewKitPage() {
  const router = useRouter();

  const [jd, setJd] = useState("");

  const [companyUrl, setCompanyUrl] =
    useState("");

  const [days, setDays] =
    useState("7");

  const [error, setError] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");

    const trimmedJd = jd.trim();
    const trimmedCompanyUrl =
      companyUrl.trim();

    if (!trimmedJd) {
      setError(
        "Please enter the job description."
      );
      return;
    }

    if (!trimmedCompanyUrl) {
      setError(
        "Please enter the company website."
      );
      return;
    }

    const parsedDays = Number(days);

    if (
      !Number.isInteger(parsedDays) ||
      parsedDays < 1 ||
      parsedDays > 60
    ) {
      setError(
        "Preparation days must be between 1 and 60."
      );
      return;
    }

    setLoading(true);

    try {
      const result = await generateKit({
        jd: trimmedJd,
        company_url: trimmedCompanyUrl,
        days: parsedDays,
      });

      router.push(
        `/kits/${result.kitId}`
      );
    } catch (error: unknown) {
      if (
        typeof error === "object" &&
        error !== null &&
        "response" in error
      ) {
        const axiosError =
          error as {
            response?: {
              data?: {
                error?: {
                  message?: string;
                };
              };
            };
          };

        setError(
          axiosError.response?.data?.error
            ?.message ??
            "Failed to generate interview kit."
        );
      } else {
        setError(
          "Failed to generate interview kit."
        );
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-4xl items-center px-6 py-4">
          <Link
            href="/dashboard"
            className="mr-4 rounded-lg p-2 text-gray-600 hover:bg-gray-100"
            aria-label="Back to dashboard"
          >
            <ArrowLeft size={20} />
          </Link>

          <div>
            <h1 className="text-xl font-bold text-gray-900">
              Create Interview Kit
            </h1>

            <p className="text-sm text-gray-500">
              Generate a personalized preparation plan
            </p>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-4xl px-6 py-10">
        <div className="rounded-2xl border bg-white p-6 shadow-sm sm:p-8">
          <div className="mb-8">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-black text-white">
              <Sparkles size={24} />
            </div>

            <h2 className="text-2xl font-bold text-gray-900">
              Prepare for your interview
            </h2>

            <p className="mt-2 text-gray-600">
              Give us the job description, company
              website, and the amount of time you have
              to prepare.
            </p>
          </div>

          {error && (
            <div
              role="alert"
              className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              {error}
            </div>
          )}

          <form
            onSubmit={handleSubmit}
            className="space-y-6"
          >
            <div>
              <label
                htmlFor="company-url"
                className="mb-2 block text-sm font-medium text-gray-800"
              >
                Company website
              </label>

              <input
                id="company-url"
                type="url"
                value={companyUrl}
                onChange={(event) =>
                  setCompanyUrl(
                    event.target.value
                  )
                }
                placeholder="https://example.com"
                required
                disabled={loading}
                className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none transition focus:border-black focus:ring-2 focus:ring-gray-200 disabled:bg-gray-100"
              />

              <p className="mt-2 text-xs text-gray-500">
                Use the company's public website.
              </p>
            </div>

            <div>
              <label
                htmlFor="days"
                className="mb-2 block text-sm font-medium text-gray-800"
              >
                Preparation days
              </label>

              <input
                id="days"
                type="number"
                min={1}
                max={60}
                value={days}
                onChange={(event) =>
                  setDays(event.target.value)
                }
                required
                disabled={loading}
                className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none transition focus:border-black focus:ring-2 focus:ring-gray-200 disabled:bg-gray-100"
              />

              <p className="mt-2 text-xs text-gray-500">
                Choose between 1 and 60 days.
              </p>
            </div>

            <div>
              <label
                htmlFor="job-description"
                className="mb-2 block text-sm font-medium text-gray-800"
              >
                Job description
              </label>

              <textarea
                id="job-description"
                value={jd}
                onChange={(event) =>
                  setJd(event.target.value)
                }
                placeholder="Paste the complete job description here..."
                required
                disabled={loading}
                rows={14}
                className="w-full resize-y rounded-lg border border-gray-300 px-4 py-3 outline-none transition focus:border-black focus:ring-2 focus:ring-gray-200 disabled:bg-gray-100"
              />

              <div className="mt-2 flex justify-end">
                <span className="text-xs text-gray-500">
                  {jd.length} characters
                </span>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-black px-5 py-3 font-medium text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Sparkles size={18} />

              {loading
                ? "Generating your kit..."
                : "Generate Interview Kit"}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}