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
        setError(data.error ?? "Import failed. Check the link or CSV and try again.");
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
      setError(e instanceof Error ? e.message : "Import failed. Try again.");
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="card space-y-5 p-4">
        <label className="block space-y-1.5">
          <span className="label">Plan name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="For example, 5/3/1 spring cycle"
            className={inputCls}
          />
        </label>

        <div
          role="tablist"
          aria-label="Import source"
          className="grid grid-cols-2 gap-1 rounded-[14px] bg-(--surface-2) p-1"
        >
          <SourceTab
            selected={source === "url"}
            onClick={() => setSource("url")}
          >
            Sheet link
          </SourceTab>
          <SourceTab
            selected={source === "csv"}
            onClick={() => setSource("csv")}
          >
            Paste CSV
          </SourceTab>
        </div>

        {source === "url" ? (
          <label className="block space-y-1.5">
            <span className="label">Google Sheet link</span>
            <input
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
              placeholder="https://docs.google.com/spreadsheets/d/..."
              inputMode="url"
              className={inputCls}
            />
            <span className="block text-[13px] text-(--muted)">
              Share the sheet as &ldquo;Anyone with the link can view&rdquo;
              first.
            </span>
          </label>
        ) : (
          <label className="block space-y-1.5">
            <span className="label">CSV</span>
            <textarea
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              rows={8}
              placeholder={`week,day,day_name,exercise,sets,reps,weight,rest_sec,notes\n1,1,Push,Bench Press,3,5,135,180,`}
              className="w-full resize-y rounded-xl border border-(--border) bg-(--background) p-3 font-mono text-[13px] outline-none focus:border-(--accent)"
            />
          </label>
        )}

        <details className="group rounded-xl bg-(--surface-2) px-3">
          <summary className="flex min-h-11 cursor-pointer list-none items-center text-[14px] font-medium [&::-webkit-details-marker]:hidden">
            Which columns does the sheet need?
          </summary>
          <p className="pb-3 text-[13px] text-(--muted)">
            One row per exercise with these columns: week, day, day_name,
            exercise, sets, reps, weight, rest_sec, notes. Weight, rest and
            notes can be blank.
          </p>
        </details>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => runImport("preview")}
            disabled={pending || name.trim().length === 0}
            className="btn btn-primary flex-1"
          >
            {pending && !preview ? "Loading preview…" : "Preview plan"}
          </button>
          {preview && (
            <button
              type="button"
              onClick={() => {
                setPreview(null);
                setResolutions({});
              }}
              className="btn btn-secondary"
            >
              Clear preview
            </button>
          )}
        </div>

        {error && <p className="text-[14px] text-(--danger)">{error}</p>}
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

function SourceTab({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={selected}
      onClick={onClick}
      className={`h-11 rounded-[11px] text-[15px] font-semibold transition-colors duration-150 ${
        selected
          ? "bg-(--surface) text-(--foreground)"
          : "text-(--muted)"
      }`}
    >
      {children}
    </button>
  );
}

const inputCls =
  "block h-11 w-full rounded-xl border border-(--border) bg-(--background) px-3 text-[16px] outline-none focus:border-(--accent)";

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
      <div className="card flex flex-wrap gap-1.5 p-4">
        <span className="chip chip-ok">
          <span className="num">{preview.match_summary.matched}</span> matched
        </span>
        {preview.match_summary.unmatched > 0 && (
          <span className="chip chip-accent">
            <span className="num">{preview.match_summary.unmatched}</span> new
            names
          </span>
        )}
        <span className="chip">
          <span className="num">{preview.match_summary.total_rows}</span> rows
        </span>
        {willCreate > 0 && (
          <p className="mt-1 w-full text-[13px] text-(--muted)">
            {willCreate} new exercise{willCreate === 1 ? "" : "s"} will be
            added to your library.
          </p>
        )}
      </div>

      {preview.row_errors.length > 0 && (
        <details className="card px-4">
          <summary className="flex min-h-11 cursor-pointer list-none items-center text-[15px] font-medium text-(--danger) [&::-webkit-details-marker]:hidden">
            {preview.row_errors.length} row
            {preview.row_errors.length === 1 ? " was" : "s were"} skipped
          </summary>
          <ul className="space-y-1 pb-3 text-[13px] text-(--muted)">
            {preview.row_errors.map((e) => (
              <li key={e.row_index}>
                Row <span className="num">{e.row_index + 2}</span>: {e.message}
              </li>
            ))}
          </ul>
        </details>
      )}

      <div className="space-y-4">
        {preview.weeks.map((w) => (
          <section key={w.week_number} className="card space-y-4 p-4">
            <h3 className="display text-[20px]">
              {w.name || `Week ${w.week_number}`}
            </h3>
            {w.days.map((d) => (
              <div key={d.day_number} className="space-y-2">
                <div className="flex items-baseline gap-2">
                  <span className="label">
                    Day <span className="num">{d.day_number}</span>
                  </span>
                  {d.name && (
                    <span className="text-[15px] font-semibold">{d.name}</span>
                  )}
                </div>
                <ul className="divide-y divide-(--border) overflow-hidden rounded-xl bg-(--surface-2)">
                  {d.exercises.map((ex) => (
                    <li key={ex.row_index} className="space-y-1.5 px-3 py-2.5">
                      <div className="flex items-start justify-between gap-3">
                        <span className="min-w-0 text-[15px] font-medium">
                          {ex.raw_name}
                        </span>
                        <span className="num shrink-0 text-[15px]">
                          {ex.prescribed_sets} &times; {ex.prescribed_reps}
                          {ex.prescribed_weight !== null
                            ? ` @ ${ex.prescribed_weight}`
                            : ""}
                        </span>
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

      <div className="space-y-2">
        <button
          type="button"
          onClick={onConfirm}
          disabled={pending}
          className="btn btn-primary btn-block"
        >
          {pending ? "Saving…" : "Save plan"}
        </button>
        {unmatched.length > 0 && (
          <p className="text-center text-[13px] text-(--muted)">
            New names are added to your exercise library.
          </p>
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
      <p className="text-[13px] text-(--muted)">
        Matched to {ex.matched_exercise_name}
        {ex.score < 1 ? (
          <>
            {" "}
            (<span className="num">{Math.round(ex.score * 100)}%</span>)
          </>
        ) : null}
      </p>
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
      aria-label={`Exercise for ${ex.raw_name}`}
      className="block h-11 w-full rounded-xl border border-(--border) bg-(--surface) px-3 text-[16px] outline-none focus:border-(--accent)"
    >
      <option value="__new">Create new: {ex.raw_name}</option>
      {ex.suggestions.map((s) => (
        <option key={s.id} value={s.id}>
          Use {s.name} ({Math.round(s.score * 100)}%)
        </option>
      ))}
    </select>
  );
}
