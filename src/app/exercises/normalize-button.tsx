"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Result = {
  merged: Array<{ from: string; into: string }>;
  renamed: Array<{ from: string; to: string }>;
  unknowns: Array<{ id: string; name: string }>;
  total: number;
  day_renamed: Array<{ from: string; to: string }>;
};

export function NormalizeButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);

  const run = async () => {
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/exercises/normalize", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "normalize failed");
        return;
      }
      setResult(data as Result);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "normalize failed");
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="space-y-3 rounded-xl border border-(--border) bg-(--surface) p-4">
      <div>
        <h2 className="text-sm font-semibold">clean up names</h2>
        <p className="mt-0.5 text-xs text-(--muted)">
          expand abbreviations on exercises (db → dumbbell) and plan days
          (c/t → chest &amp; triceps), merge duplicate exercises into the
          global library, and add descriptions where the movement is known.
        </p>
      </div>
      {!result && (
        <button
          type="button"
          onClick={run}
          disabled={pending}
          className="inline-flex h-10 items-center rounded-lg bg-(--accent) px-4 text-sm font-semibold text-(--accent-contrast) disabled:opacity-60"
        >
          {pending ? "normalizing…" : "normalize my exercises"}
        </button>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
      {result && (
        <div className="space-y-3 text-sm">
          <div className="flex flex-wrap gap-3 rounded-lg bg-(--background) p-3 text-xs">
            <span>
              <strong className="tabular-nums">{result.merged.length}</strong>{" "}
              merged
            </span>
            <span>
              <strong className="tabular-nums">{result.renamed.length}</strong>{" "}
              renamed
            </span>
            <span>
              <strong className="tabular-nums">{result.unknowns.length}</strong>{" "}
              unknown
            </span>
            <span>
              <strong className="tabular-nums">
                {result.day_renamed.length}
              </strong>{" "}
              day names
            </span>
            <span className="text-(--muted)">
              of {result.total} user-owned
            </span>
          </div>
          {result.renamed.length > 0 && (
            <details className="rounded border border-(--border) bg-(--background) p-3 text-xs">
              <summary className="cursor-pointer font-semibold">
                exercises renamed ({result.renamed.length})
              </summary>
              <ul className="mt-2 space-y-0.5">
                {result.renamed.map((r) => (
                  <li key={r.from}>
                    {r.from} → <strong>{r.to}</strong>
                  </li>
                ))}
              </ul>
            </details>
          )}
          {result.day_renamed.length > 0 && (
            <details className="rounded border border-(--border) bg-(--background) p-3 text-xs">
              <summary className="cursor-pointer font-semibold">
                day names expanded ({result.day_renamed.length})
              </summary>
              <ul className="mt-2 space-y-0.5">
                {result.day_renamed.map((r, i) => (
                  <li key={`${r.from}-${i}`}>
                    {r.from} → <strong>{r.to}</strong>
                  </li>
                ))}
              </ul>
            </details>
          )}
          {result.merged.length > 0 && (
            <details className="rounded border border-(--border) bg-(--background) p-3 text-xs">
              <summary className="cursor-pointer font-semibold">
                merged into global library ({result.merged.length})
              </summary>
              <ul className="mt-2 space-y-0.5">
                {result.merged.map((r) => (
                  <li key={r.from}>
                    {r.from} → <strong>{r.into}</strong>
                  </li>
                ))}
              </ul>
            </details>
          )}
          {result.unknowns.length > 0 && (
            <details
              className="rounded border border-amber-300 bg-amber-50 p-3 text-xs dark:border-amber-900 dark:bg-amber-950/30"
              open
            >
              <summary className="cursor-pointer font-semibold text-amber-800 dark:text-amber-200">
                need your help ({result.unknowns.length})
              </summary>
              <p className="mt-2 text-amber-800 dark:text-amber-300">
                we don&apos;t have these in our library yet. tell claude what
                they are and we&apos;ll add them:
              </p>
              <ul className="mt-2 space-y-0.5 text-amber-900 dark:text-amber-100">
                {result.unknowns.map((u) => (
                  <li key={u.id}>{u.name}</li>
                ))}
              </ul>
            </details>
          )}
          <button
            type="button"
            onClick={() => setResult(null)}
            className="text-xs text-(--muted) underline"
          >
            close
          </button>
        </div>
      )}
    </div>
  );
}
