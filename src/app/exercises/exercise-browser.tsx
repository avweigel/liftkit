"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type Item = {
  id: string;
  name: string;
  primary_muscle: string;
  equipment: string;
  mine: boolean;
};

export function ExerciseBrowser({ items }: { items: Item[] }) {
  const [q, setQ] = useState("");
  const [muscle, setMuscle] = useState<string | null>(null);

  const muscles = useMemo(
    () => Array.from(new Set(items.map((i) => i.primary_muscle))).sort(),
    [items],
  );

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return items.filter((i) => {
      if (muscle && i.primary_muscle !== muscle) return false;
      if (needle && !i.name.toLowerCase().includes(needle)) return false;
      return true;
    });
  }, [items, q, muscle]);

  return (
    <div className="space-y-4">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="search exercises…"
        className="h-11 w-full rounded-lg border border-(--border) bg-(--background) px-3 text-sm outline-none focus:border-(--accent)"
      />
      <div className="flex flex-wrap gap-1.5">
        <Chip active={muscle === null} onClick={() => setMuscle(null)}>
          all
        </Chip>
        {muscles.map((m) => (
          <Chip key={m} active={muscle === m} onClick={() => setMuscle(m)}>
            {m.replace("_", " ")}
          </Chip>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="rounded-lg border border-dashed border-(--border) p-6 text-center text-sm text-(--muted)">
          no exercises match.
        </p>
      ) : (
        <ul className="divide-y divide-(--border) overflow-hidden rounded-xl border border-(--border) bg-(--surface)">
          {filtered.map((i) => (
            <li key={i.id}>
              <Link
                href={`/exercises/${i.id}`}
                className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-(--accent-soft)"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-semibold">
                      {i.name}
                    </span>
                    {i.mine && (
                      <span className="rounded border border-(--border) px-1 text-[10px] uppercase tracking-wider text-(--muted)">
                        mine
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 text-xs text-(--muted)">
                    {i.primary_muscle.replace("_", " ")} · {i.equipment}
                  </div>
                </div>
                <span className="text-(--muted)">→</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1 text-xs font-medium transition ${
        active
          ? "bg-(--accent) text-(--accent-contrast)"
          : "border border-(--border) text-(--muted) hover:border-(--accent)"
      }`}
    >
      {children}
    </button>
  );
}
