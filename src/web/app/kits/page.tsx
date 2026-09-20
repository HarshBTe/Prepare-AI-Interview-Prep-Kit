"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  BookOpen,
  Clock,
  Loader2,
  Plus,
} from "lucide-react";

import { getKits, type KitSummary } from "../../lib/kits";

export default function KitsPage() {
  const router = useRouter();

  const [kits, setKits] = useState<KitSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadKits() {
      try {
        setLoading(true);
        setError("");

        const data = await getKits();
        setKits(data);
      } catch (err) {
        console.error("Failed to load kits:", err);
        setError("Unable to load your interview kits.");
      } finally {
        setLoading(false);
      }
    }

    loadKits();
  }, []);

  function formatDate(date: string) {
    return new Date(date).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  function getStatusClasses(status: KitSummary["status"]) {
    switch (status) {
      case "ready":
        return "bg-green-100 text-green-700";

      case "generating":
        return "bg-yellow-100 text-yellow-700";

      case "failed":
        return "bg-red-100 text-red-700";

      default:
        return "bg-gray-100 text-gray-700";
    }
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <button
            type="button"
            onClick={() => router.push("/dashboard")}
            className="flex items-center gap-2 text-sm font-medium text-gray-600 transition hover:text-black"
          >
            <ArrowLeft size={18} />
            Dashboard
          </button>

          <button
            type="button"
            onClick={() => router.push("/kits/new")}
            className="flex items-center gap-2 rounded-lg bg-black px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-800"
          >
            <Plus size={17} />
            Create Kit
          </button>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-6 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            My Interview Kits
          </h1>

          <p className="mt-2 text-sm text-gray-500">
            View and continue your interview preparation.
          </p>
        </div>

        {loading && (
          <div className="flex min-h-[300px] items-center justify-center rounded-xl border bg-white">
            <div className="flex items-center gap-2 text-gray-600">
              <Loader2
                size={20}
                className="animate-spin"
              />
              Loading your kits...
            </div>
          </div>
        )}

        {!loading && error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-700">
            {error}
          </div>
        )}

        {!loading && !error && kits.length === 0 && (
          <div className="rounded-xl border bg-white p-10 text-center shadow-sm">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gray-100">
              <BookOpen size={25} className="text-gray-600" />
            </div>

            <h2 className="mt-5 text-xl font-semibold text-gray-900">
              No interview kits yet
            </h2>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-gray-500">
              Create your first personalized interview preparation
              kit using a job description and company website.
            </p>

            <button
              type="button"
              onClick={() => router.push("/kits/new")}
              className="mt-6 rounded-lg bg-black px-5 py-2.5 text-sm font-medium text-white hover:bg-gray-800"
            >
              Create Your First Kit
            </button>
          </div>
        )}

        {!loading && !error && kits.length > 0 && (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {kits.map((kit) => (
              <button
                type="button"
                key={kit.id}
                onClick={() => {
                  if (kit.status === "ready") {
                    router.push(`/kits/${kit.id}`);
                  }
                }}
                disabled={kit.status !== "ready"}
                className="group text-left"
              >
                <div
                  className={`h-full rounded-xl border bg-white p-6 shadow-sm transition ${
                    kit.status === "ready"
                      ? "hover:-translate-y-1 hover:shadow-md"
                      : "cursor-not-allowed opacity-80"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-black text-white">
                      <BookOpen size={21} />
                    </div>

                    <span
                      className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${getStatusClasses(
                        kit.status
                      )}`}
                    >
                      {kit.status}
                    </span>
                  </div>

                  <h2 className="mt-5 line-clamp-2 text-lg font-semibold text-gray-900">
                    {kit.title}
                  </h2>

                  <div className="mt-4 flex items-center gap-2 text-sm text-gray-500">
                    <Clock size={15} />

                    <span>
                      Updated {formatDate(kit.updatedAt)}
                    </span>
                  </div>

                  {kit.status === "ready" && (
                    <p className="mt-5 text-sm font-medium text-black group-hover:underline">
                      Open kit →
                    </p>
                  )}

                  {kit.status === "generating" && (
                    <p className="mt-5 text-sm text-yellow-700">
                      Kit is still being generated...
                    </p>
                  )}

                  {kit.status === "failed" && (
                    <p className="mt-5 text-sm text-red-600">
                      Generation failed. Create a new kit.
                    </p>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}