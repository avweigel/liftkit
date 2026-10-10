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
        setError(data.error ?? "Clean up failed. Try again.");
        return;
      }
      setResult(data as Result);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Clean up failed. Try again.");
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="card space-y-4 p-4">
      <div>
        <h3 className="text-[15px] font-semibold">Clean up exercise names</h3>
        <p className="mt-1 text-[14px] text-(--muted)">
          Expands abbreviations (db becomes dumbbell, c/t becomes chest and
          triceps), merges duplicates into the shared library and adds
          descriptions where the movement is known.
        </p>
      </div>

      {!result && (
        <button
          type="button"
          onClick={run}
          disabled={pending}
          className="btn btn-secondary btn-block"
        >
          {pending ? "Cleaning up" : "Clean up names"}
        </button>
      )}

      {error && <p className="text-[14px] text-(--danger)">{error}</p>}

      {result && (
        <div className="space-y-3">
          <div className="grid grid-cols-4 gap-2">
            <Stat value={result.merged.length} label="Merged" />
            <Stat value={result.renamed.length} label="Renamed" />
            <Stat value={result.unknowns.length} label="Unknown" />
            <Stat value={result.day_renamed.length} label="Day names" />
          </div>
          <p className="label">
            Checked <span className="num">{result.total}</span> custom
            exercises.
          </p>

          {result.renamed.length > 0 && (
            <Changes title="Exercises renamed" count={result.renamed.length}>
              {result.renamed.map((r) => (
                <Change key={r.from} from={r.from} to={r.to} />
              ))}
            </Changes>
          )}
          {result.day_renamed.length > 0 && (
            <Changes title="Day names expanded" count={result.day_renamed.length}>
              {result.day_renamed.map((r, i) => (
                <Change key={`${r.from}-${i}`} from={r.from} to={r.to} />
              ))}
            </Changes>
          )}
          {result.merged.length > 0 && (
            <Changes title="Merged into the library" count={result.merged.length}>
              {result.merged.map((r) => (
                <Change key={r.from} from={r.from} to={r.into} />
              ))}
            </Changes>
          )}
          {result.unknowns.length > 0 && (
            <Changes
              title="Not recognised"
              count={result.unknowns.length}
              open
            >
              <li className="pb-1 text-(--muted)">
                These are not in the library yet. They keep working as
                custom exercises.
              </li>
              {result.unknowns.map((u) => (
                <li key={u.id}>{u.name}</li>
              ))}
            </Changes>
          )}

          <button
            type="button"
            onClick={() => setResult(null)}
            className="btn btn-ghost btn-sm"
          >
            Done
          </button>
        </div>
      )}
    </div>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="rounded-[12px] bg-(--surface-2) px-2 py-2.5 text-center">
      <div className="num text-[20px]">{value}</div>
      <div className="text-[12px] text-(--muted)">{label}</div>
    </div>
  );
}

function Changes({
  title,
  count,
  open,
  children,
}: {
  title: string;
  count: number;
  open?: boolean;
  children: React.ReactNode;
}) {
  return (
    <details
      className="rounded-[12px] bg-(--surface-2) px-3 text-[14px]"
      open={open}
    >
      <summary className="flex min-h-11 cursor-pointer items-center justify-between gap-2 font-medium">
        {title}
        <span className="num text-(--muted)">{count}</span>
      </summary>
      <ul className="space-y-1 pb-3">{children}</ul>
    </details>
  );
}

function Change({ from, to }: { from: string; to: string }) {
  return (
    <li>
      <span className="text-(--muted)">{from}</span>
      <span className="text-(--faint)"> becomes </span>
      <span className="font-medium">{to}</span>
    </li>
  );
}
