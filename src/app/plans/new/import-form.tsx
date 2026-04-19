"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type PreviewExercise = {
  row_index: number;
  raw_name: string;
  matched_exercise_id: string | null;
  matched_exercise_name: string | null;
  score: number;
  suggestions: Array<{ id: string; name: string; score: number }>;
  order_index: number;
  prescribed_sets: number;
  prescribed_reps: string;
  prescribed_weight: number | null;
  rest_seconds: number | null;
  notes: string | null;
};

type PreviewDay = {
  day_number: number;
  name: string | null;
  notes: string | null;
  exercises: PreviewExercise[];
};

type PreviewWeek = {
  week_number: number;
  name: string | null;
  days: PreviewDay[];
};

type PreviewResponse = {
  mode: "preview";
  name: string;
  source_url: string | null;
  row_errors: Array<{ row_index: number; message: string }>;
  weeks: PreviewWeek[];
  unmatched_names: string[];
  match_summary: { total_rows: number; matched: number; unmatched: number };
};

type Source = "url" | "csv";

export function ImportForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [source, setSource] = useState<Source>("url");
  const [sourceUrl, setSourceUrl] = useState("");
  const [csvText, setCsvText] = useState("");
  const [preview, setPreview] = useState<PreviewResponse | null>(null);
  const [resolutions, setResolutions] = useState<
    Record<string, string | null>
  >({});
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runImport = async (mode: "preview" | "commit") => {
    setPending(true);
    setError(null);
    try {
      const body = {
        name: name.trim(),
        mode,
        sourceUrl: source === "url" ? sourceUrl.trim() : undefined,
        csvText: source === "csv" ? csvText : undefined,
        exerciseResolutions: mode === "commit" ? resolutions : undefined,
      };
      const res = await fetch("/api/plans/import", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "import failed");
        setPending(false);
        return;
      }
      if (mode === "preview") {
        setPreview(data as PreviewResponse);
        setResolutions({});
      } else {
        router.push(`/plans/${data.plan_id}`);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "import failed");
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4 rounded-lg border border-zinc-200 p-5 dark:border-zinc-800">
        <label className="block space-y-1.5">
          <span className="text-sm">plan name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. 5/3/1 spring cycle"
            className="h-11 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm outline-none focus:border-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:focus:border-zinc-100"
          />
        </label>

        <div className="flex gap-2 text-sm">
          <button
            type="button"
            onClick={() => setSource("url")}
            className={`rounded-md px-3 py-1.5 ${source === "url" ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900" : "border border-zinc-300 dark:border-zinc-700"}`}
          >
            sheet url
          </button>
          <button
            type="button"
            onClick={() => setSource("csv")}
            className={`rounded-md px-3 py-1.5 ${source === "csv" ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900" : "border border-zinc-300 dark:border-zinc-700"}`}
          >
            paste csv
          </button>
        </div>

        {source === "url" ? (
          <label className="block space-y-1.5">
            <span className="text-sm">google sheet url</span>
            <input
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
              placeholder="https://docs.google.com/spreadsheets/d/..."
              className="h-11 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm outline-none focus:border-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:focus:border-zinc-100"
            />
            <span className="block text-xs text-zinc-500">
              sheet must be shared as &quot;anyone with the link can view.&quot;
            </span>
          </label>
        ) : (
          <label className="block space-y-1.5">
            <span className="text-sm">csv</span>
            <textarea
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              rows={8}
              placeholder={`week,day,day_name,exercise,sets,reps,weight,rest_sec,notes\n1,1,Push,Bench Press,3,5,135,180,`}
              className="w-full resize-y rounded-lg border border-zinc-300 bg-white p-3 font-mono text-xs outline-none focus:border-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:focus:border-zinc-100"
            />
          </label>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => runImport("preview")}
            disabled={pending || name.trim().length === 0}
            className="inline-flex h-11 items-center rounded-lg bg-zinc-900 px-5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            {pending && !preview ? "fetching…" : "preview"}
          </button>
          {preview && (
            <button
              type="button"
              onClick={() => {
                setPreview(null);
                setResolutions({});
              }}
              className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
            >
              reset preview
            </button>
          )}
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>

      {preview && (
        <PreviewView
          preview={preview}
          resolutions={resolutions}
          setResolutions={setResolutions}
          onConfirm={() => runImport("commit")}
          pending={pending}
        />
      )}
    </div>
  );
}

function PreviewView({
  preview,
  resolutions,
  setResolutions,
  onConfirm,
  pending,
}: {
  preview: PreviewResponse;
  resolutions: Record<string, string | null>;
  setResolutions: (
    update: (prev: Record<string, string | null>) => Record<string, string | null>,
  ) => void;
  onConfirm: () => void;
  pending: boolean;
}) {
  const unmatched = preview.unmatched_names.filter(
    (n) => !(n in resolutions) || resolutions[n] === null,
  );
  const willCreate = preview.unmatched_names.filter(
    (n) => !(n in resolutions) || resolutions[n] === null,
  ).length;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-4 rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-sm dark:border-zinc-800 dark:bg-zinc-900">
        <span>
          <strong>{preview.match_summary.matched}</strong> matched /{" "}
          <strong>{preview.match_summary.unmatched}</strong> unmatched /{" "}
          {preview.match_summary.total_rows} rows
        </span>
        {willCreate > 0 && (
          <span className="text-zinc-500">
            {willCreate} new exercise{willCreate === 1 ? "" : "s"} will be
            created
          </span>
        )}
      </div>

      {preview.row_errors.length > 0 && (
        <details className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm dark:border-amber-900 dark:bg-amber-950/30">
          <summary className="cursor-pointer font-medium text-amber-800 dark:text-amber-200">
            {preview.row_errors.length} row{" "}
            {preview.row_errors.length === 1 ? "was" : "were"} skipped
          </summary>
          <ul className="mt-2 space-y-1 text-xs text-amber-800 dark:text-amber-200">
            {preview.row_errors.map((e) => (
              <li key={e.row_index}>
                row {e.row_index + 2}: {e.message}
              </li>
            ))}
          </ul>
        </details>
      )}

      <div className="space-y-6">
        {preview.weeks.map((w) => (
          <section
            key={w.week_number}
            className="space-y-3 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800"
          >
            <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
              week {w.week_number}
            </h3>
            {w.days.map((d) => (
              <div key={d.day_number} className="space-y-2">
                <div className="text-sm font-medium">
                  day {d.day_number}
                  {d.name ? ` · ${d.name}` : ""}
                </div>
                <ul className="space-y-2 text-sm">
                  {d.exercises.map((ex) => (
                    <li
                      key={ex.row_index}
                      className="flex flex-wrap items-center justify-between gap-2 rounded border border-zinc-200 px-3 py-2 dark:border-zinc-800"
                    >
                      <div className="min-w-0">
                        <div className="truncate">
                          <span className="font-medium">{ex.raw_name}</span>
                          <span className="ml-2 text-xs text-zinc-500">
                            {ex.prescribed_sets}×{ex.prescribed_reps}
                            {ex.prescribed_weight !== null
                              ? ` @ ${ex.prescribed_weight}`
                              : ""}
                          </span>
                        </div>
                      </div>
                      <UnmatchedPicker
                        ex={ex}
                        resolution={resolutions[ex.raw_name]}
                        onChange={(id) =>
                          setResolutions((prev) => ({
                            ...prev,
                            [ex.raw_name]: id,
                          }))
                        }
                      />
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </section>
        ))}
      </div>

      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={onConfirm}
          disabled={pending}
          className="inline-flex h-11 items-center rounded-lg bg-zinc-900 px-5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {pending ? "saving…" : "save plan"}
        </button>
        {unmatched.length > 0 && (
          <span className="text-xs text-zinc-500">
            unmatched names will be added to your exercise library
          </span>
        )}
      </div>
    </div>
  );
}

function UnmatchedPicker({
  ex,
  resolution,
  onChange,
}: {
  ex: PreviewExercise;
  resolution: string | null | undefined;
  onChange: (id: string | null) => void;
}) {
  if (ex.matched_exercise_id && resolution === undefined) {
    return (
      <span className="text-xs text-zinc-500">
        matched: {ex.matched_exercise_name}
        {ex.score < 1 ? ` (${Math.round(ex.score * 100)}%)` : ""}
      </span>
    );
  }
  const value =
    resolution === undefined ? ex.matched_exercise_id ?? "__new" : resolution ?? "__new";
  return (
    <select
      value={value}
      onChange={(e) => {
        const v = e.target.value;
        onChange(v === "__new" ? null : v);
      }}
      className="rounded border border-zinc-300 bg-white px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-950"
    >
      <option value="__new">create new: {ex.raw_name}</option>
      {ex.suggestions.map((s) => (
        <option key={s.id} value={s.id}>
          use {s.name} ({Math.round(s.score * 100)}%)
        </option>
      ))}
    </select>
  );
}
