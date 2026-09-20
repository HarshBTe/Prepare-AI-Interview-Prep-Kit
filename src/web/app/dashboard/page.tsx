"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import {
  Plus,
  BookOpen,
  LogOut,
} from "lucide-react";

import { useAuth } from "../../context/AuthContext";

export default function DashboardPage() {
  const router = useRouter();

  const {
    user,
    loading,
    logout,
  } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-gray-600">
          Loading...
        </div>
      </main>
    );
  }

  if (!user) {
    return null;
  }

  async function handleLogout() {
    try {
      await logout();
      router.replace("/login");
    } catch {
      // Even if logout request fails,
      // remove the local authenticated state.
      router.replace("/login");
    }
  }

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              AI Interview Prep Kit
            </h1>

            <p className="text-sm text-gray-500">
              Your interview preparation workspace
            </p>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100"
          >
            <LogOut size={16} />

            Logout
          </button>
        </div>
      </header>

      {/* Dashboard */}
      <section className="mx-auto max-w-7xl px-6 py-10">
        <div className="mb-8">
          <p className="text-sm text-gray-500">
            Signed in as
          </p>

          <h2 className="mt-1 text-3xl font-bold text-gray-900">
            {user.email}
          </h2>
        </div>

        {/* Actions */}
        <div className="grid gap-6 md:grid-cols-2">
          <Link
            href="/kits/new"
            className="group rounded-2xl border bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
          >
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-black text-white">
              <Plus size={24} />
            </div>

            <h3 className="text-xl font-semibold text-gray-900">
              Create Interview Kit
            </h3>

            <p className="mt-2 text-sm leading-6 text-gray-600">
              Add a job description, company website,
              and preparation time to generate a
              personalized interview kit.
            </p>

            <span className="mt-5 inline-block text-sm font-medium text-black group-hover:underline">
              Create a kit →
            </span>
          </Link>

          <Link
            href="/kits"
            className="group rounded-2xl border bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
          >
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gray-900 text-white">
              <BookOpen size={24} />
            </div>

            <h3 className="text-xl font-semibold text-gray-900">
              My Interview Kits
            </h3>

            <p className="mt-2 text-sm leading-6 text-gray-600">
              View previously generated interview
              preparation kits and continue practicing.
            </p>

            <span className="mt-5 inline-block text-sm font-medium text-black group-hover:underline">
              View my kits →
            </span>
          </Link>
        </div>
      </section>
    </main>
  );
}