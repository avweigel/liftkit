"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Result = {
  created: string[];
  skipped: string[];
  created_exercises: number;
};

export function SeedButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);

  const run = async () => {
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/plans/seed-phases", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "seed failed");
        return;
      }
      setResult(data as Result);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "seed failed");
    } finally {
      setPending(false);
    }
  };

  if (result) {
    return (
      <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="font-medium">
          imported {result.created.length} phase
          {result.created.length === 1 ? "" : "s"} ·{" "}
          {result.created_exercises} new exercise
          {result.created_exercises === 1 ? "" : "s"}
        </div>
        {result.skipped.length > 0 && (
          <p className="mt-1 text-xs text-zinc-500">
            skipped (already in your plans): {result.skipped.join(", ")}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={run}
        disabled={pending}
        className="inline-flex h-10 items-center rounded-lg border border-zinc-300 bg-white px-4 text-sm font-medium hover:bg-zinc-50 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-950 dark:hover:bg-zinc-900"
      >
        {pending ? "importing…" : "import phases 1-12"}
      </button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
