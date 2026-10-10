"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { SectionTitle } from "@/components/page-header";
import { enumLabel, formatSet, shortDate } from "./labels";

export type LibraryItem = {
  id: string;
  name: string;
  primary_muscle: string;
  equipment: string;
  custom: boolean;
};

export type RecentItem = LibraryItem & {
  lastAt: string;
  topWeight: number | null;
  topReps: number;
};

const PAGE = 40;

// names that start with a digit ("21 Calf Raises") are usually imported
// shorthand, so they sort after real names
function libraryOrder(a: LibraryItem, b: LibraryItem) {
  const da = /^\d/.test(a.name);
  const db = /^\d/.test(b.name);
  if (da !== db) return da ? 1 : -1;
  return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
}

export function ExerciseBrowser({
  items,
  recent,
  recentDays,
}: {
  items: LibraryItem[];
  recent: RecentItem[];
  recentDays: number;
}) {
  const [q, setQ] = useState("");
  const [muscle, setMuscle] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  const sorted = useMemo(() => items.slice().sort(libraryOrder), [items]);

  const muscles = useMemo(() => {
    const set = new Set(items.map((i) => i.primary_muscle));
    set.delete("other");
    return Array.from(set).sort();
  }, [items]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return sorted.filter((i) => {
      if (muscle && i.primary_muscle !== muscle) return false;
      if (needle && !i.name.toLowerCase().includes(needle)) return false;
      return true;
    });
  }, [sorted, q, muscle]);

  const narrowed = q.trim() !== "" || muscle !== null;
  const visible = narrowed || expanded ? filtered : filtered.slice(0, PAGE);

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <SectionTitle>Recently trained</SectionTitle>
        {recent.length === 0 ? (
          <div className="card p-5 text-[15px] text-(--muted)">
            Nothing logged in the last {recentDays} days. Finish a workout and
            your lifts show up here with their latest top set.
          </div>
        ) : (
          <ul className="card divide-y divide-(--border) overflow-hidden">
            {recent.map((r) => (
              <li key={r.id}>
                <Link
                  href={`/exercises/${r.id}`}
                  className="flex min-h-16 items-center gap-3 px-4 py-3 transition-colors active:bg-(--surface-2)"
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[16px] font-medium">
                      {r.name}
                    </div>
                    <div className="label mt-0.5">{shortDate(r.lastAt)}</div>
                  </div>
                  <div className="num shrink-0 text-[19px]">
                    {formatSet(r.topWeight, r.topReps)}
                  </div>
                  <Chevron />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <SectionTitle>All exercises</SectionTitle>
        <div className="relative">
          <svg
            className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-(--faint)"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            aria-hidden
          >
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-3.5-3.5" />
          </svg>
          <input
            type="text"
            inputMode="search"
            enterKeyHint="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search exercises"
            aria-label="Search exercises"
            className="h-12 w-full rounded-[12px] border border-(--border) bg-(--surface) pr-3 pl-10 text-(--foreground) outline-none placeholder:text-(--faint) focus:border-(--accent)"
          />
        </div>

        <div className="no-scrollbar -mx-4 flex gap-1.5 overflow-x-auto px-4">
          <FilterChip active={muscle === null} onClick={() => setMuscle(null)}>
            All
          </FilterChip>
          {muscles.map((m) => (
            <FilterChip
              key={m}
              active={muscle === m}
              onClick={() => setMuscle(muscle === m ? null : m)}
            >
              {enumLabel(m)}
            </FilterChip>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="card p-5 text-[15px] text-(--muted)">
            No exercises match. Try a shorter search or another muscle group.
          </div>
        ) : (
          <>
            <ul className="card divide-y divide-(--border) overflow-hidden">
              {visible.map((i) => (
                <li key={i.id}>
                  <LibraryRow item={i} />
                </li>
              ))}
            </ul>
            {visible.length < filtered.length && (
              <button
                type="button"
                onClick={() => setExpanded(true)}
                className="btn btn-secondary btn-block"
              >
                Show all <span className="num">{filtered.length}</span>{" "}
                exercises
              </button>
            )}
          </>
        )}
      </section>
    </div>
  );
}

function LibraryRow({ item }: { item: LibraryItem }) {
  const muscle = enumLabel(item.primary_muscle);
  const equipment = enumLabel(item.equipment);
  const hasMeta = muscle || equipment || item.custom;
  return (
    <Link
      href={`/exercises/${item.id}`}
      className="flex min-h-14 items-center gap-3 px-4 py-3 transition-colors active:bg-(--surface-2)"
    >
      <div className="min-w-0 flex-1">
        <div className="truncate text-[16px]">{item.name}</div>
        {hasMeta && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {muscle && <span className="chip">{muscle}</span>}
            {equipment && <span className="chip">{equipment}</span>}
            {item.custom && <span className="chip">Custom</span>}
          </div>
        )}
      </div>
      <Chevron />
    </Link>
  );
}

function FilterChip({
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
      aria-pressed={active}
      className="flex h-11 shrink-0 items-center"
    >
      <span
        className={`inline-flex h-8 items-center rounded-full px-3.5 text-[14px] font-semibold transition-colors ${
          active
            ? "bg-(--accent) text-(--accent-contrast)"
            : "bg-(--surface-2) text-(--muted)"
        }`}
      >
        {children}
      </span>
    </button>
  );
}

function Chevron() {
  return (
    <svg
      className="shrink-0 text-(--faint)"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M9 5l7 7-7 7" />
    </svg>
  );
}
