"use client";

import { useState, useTransition } from "react";
import { deleteCardio, logCardio } from "@/lib/actions/cardio";
import {
  CARDIO_TYPES,
  type CardioKind,
  type CardioSuggestion,
} from "@/lib/program/cardio";

type Logged = {
  id: string;
  kind: CardioKind;
  minutes: number | null;
  place: "outside" | "gym" | null;
};

export function TonightCardio({
  suggestions,
  logged,
  todayLabel,
  tomorrowLabel,
  hardThisWeek,
  maxHard,
}: {
  suggestions: CardioSuggestion[];
  logged: Logged[];
  todayLabel: string;
  tomorrowLabel: string;
  hardThisWeek: number;
  maxHard: number;
}) {
  const [open, setOpen] = useState<CardioKind | null>(null);

  return (
    <section className="space-y-2 rounded-2xl border border-(--border) bg-(--surface) p-4">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-(--muted)">
          tonight&rsquo;s cardio
        </h2>
        <span className="text-[11px] text-(--muted) tabular-nums">
          hard this week: {hardThisWeek} of {maxHard}
        </span>
      </div>
      <p className="text-xs text-(--muted)">
        this morning: <span className="text-(--foreground)">{todayLabel}</span>{" "}
        · tomorrow: <span className="text-(--foreground)">{tomorrowLabel}</span>
      </p>

      {logged.length > 0 && (
        <ul className="space-y-1">
          {logged.map((l) => (
            <LoggedCardioRow key={l.id} entry={l} />
          ))}
        </ul>
      )}

      <ul className="space-y-1.5">
        {suggestions.map((s) => {
          const t = CARDIO_TYPES[s.kind];
          const isOpen = open === s.kind;
          return (
            <li
              key={s.kind}
              className={`rounded-lg border px-3 py-2 ${
                s.recommended
                  ? "border-(--accent) bg-(--accent-soft)"
                  : "border-(--border) bg-(--background)"
              } ${s.blocked ? "opacity-55" : ""}`}
            >
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : s.kind)}
                className="w-full text-left"
                aria-expanded={isOpen}
              >
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{t.title}</span>
                  {s.recommended && (
                    <span className="rounded-full bg-(--accent)/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-(--accent)">
                      best tonight
                    </span>
                  )}
                  {s.blocked && (
                    <span className="rounded-full bg-(--border) px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-(--muted)">
                      not tonight
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-(--muted)">{s.reason}</p>
              </button>
              {isOpen && (
                <CardioLogForm
                  kind={s.kind}
                  defaultMinutes={t.minutes}
                  onDone={() => setOpen(null)}
                />
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function CardioLogForm({
  kind,
  defaultMinutes,
  onDone,
}: {
  kind: CardioKind;
  defaultMinutes: number;
  onDone: () => void;
}) {
  const t = CARDIO_TYPES[kind];
  const [minutes, setMinutes] = useState(String(defaultMinutes));
  const [place, setPlace] = useState<"outside" | "gym">("outside");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const save = () => {
    setError(null);
    const m = minutes.trim() === "" ? null : Number(minutes);
    if (m !== null && (!Number.isInteger(m) || m <= 0)) {
      setError("enter whole minutes");
      return;
    }
    startTransition(async () => {
      try {
        await logCardio({ kind, minutes: m, place });
        onDone();
      } catch (e) {
        setError(e instanceof Error ? e.message : "save failed");
      }
    });
  };

  return (
    <div className="mt-2 space-y-2 border-t border-(--border) pt-2 text-xs">
      <p className="text-(--foreground)/80">{t.what}</p>
      <p className="text-(--muted)">
        outside: {t.outside} · gym: {t.gym}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5">
          <span className="text-(--muted)">min</span>
          <input
            type="text"
            inputMode="numeric"
            value={minutes}
            onChange={(e) => setMinutes(e.target.value)}
            className="h-9 w-16 rounded-md border border-(--border) bg-(--background) text-center font-bold tabular-nums outline-none focus:border-(--accent)"
            style={{ fontSize: "16px" }}
          />
        </label>
        {(["outside", "gym"] as const).map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setPlace(p)}
            className={`h-9 rounded-md border px-3 font-medium ${
              place === p
                ? "border-(--accent) bg-(--accent) text-(--accent-contrast)"
                : "border-(--border) bg-(--background) text-(--muted)"
            }`}
          >
            {p}
          </button>
        ))}
        <button
          type="button"
          onClick={save}
          disabled={pending}
          className="ml-auto h-9 rounded-md bg-(--accent-2) px-4 font-semibold text-(--accent-2-contrast) disabled:opacity-60"
        >
          {pending ? "saving…" : "log it"}
        </button>
      </div>
      {error && <p className="text-red-600">{error}</p>}
    </div>
  );
}

function LoggedCardioRow({ entry }: { entry: Logged }) {
  const [pending, startTransition] = useTransition();
  const t = CARDIO_TYPES[entry.kind];
  return (
    <li className="flex items-center gap-2 rounded-lg border border-(--border) bg-(--accent-soft)/60 px-3 py-2 text-sm">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-(--accent-2) text-xs font-bold text-(--accent-2-contrast)">
        ✓
      </span>
      <span className="font-semibold">{t.title}</span>
      <span className="text-xs text-(--muted)">
        {entry.minutes ? `${entry.minutes} min` : ""}
        {entry.place ? ` · ${entry.place}` : ""}
      </span>
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (!confirm(`remove ${t.title.toLowerCase()} from tonight?`)) return;
          startTransition(async () => {
            await deleteCardio(entry.id);
          });
        }}
        className="ml-auto text-(--muted) hover:text-red-600 disabled:opacity-60"
        aria-label="remove this cardio entry"
      >
        ×
      </button>
    </li>
  );
}
