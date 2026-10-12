"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { deleteCardio } from "@/lib/actions/cardio";
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
  tomorrowLabel,
  hardThisWeek,
  maxHard,
}: {
  suggestions: CardioSuggestion[];
  logged: Logged[];
  tomorrowLabel: string;
  hardThisWeek: number;
  maxHard: number;
}) {
  const best = suggestions.find((s) => s.recommended) ?? suggestions[0];
  const [kind, setKind] = useState<CardioKind | undefined>(best?.kind);
  const [showAll, setShowAll] = useState(false);
  const chosen = suggestions.find((s) => s.kind === kind) ?? best;

  return (
    <section className="card space-y-3 p-4">
      {logged.length > 0 && (
        <ul className="space-y-1.5">
          {logged.map((l) => (
            <LoggedCardioRow key={l.id} entry={l} />
          ))}
        </ul>
      )}

      {chosen && (
        <div className="space-y-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="display text-[20px]">{CARDIO_TYPES[chosen.kind].title}</h3>
              {chosen.recommended && <span className="chip chip-accent">Best tonight</span>}
              {logged.length > 0 && <span className="chip">Another session</span>}
            </div>
            <p className="mt-0.5 text-[14px] text-(--muted)">{chosen.reason}</p>
          </div>
          {/* where first: it's what you know when you walk out the door */}
          <div className="grid grid-cols-2 gap-2">
            <Link
              href={`/cardio?kind=${chosen.kind}&place=gym`}
              className={`btn ${logged.length > 0 ? "btn-secondary" : "btn-primary"}`}
            >
              Gym
            </Link>
            <Link href={`/cardio?kind=${chosen.kind}&place=outside`} className="btn btn-secondary">
              Outside
            </Link>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setShowAll((v) => !v)}
        aria-expanded={showAll}
        className="flex w-full items-center justify-between border-t border-(--border) pt-3 text-[14px] font-semibold text-(--accent)"
      >
        Other options
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform ${showAll ? "rotate-180" : ""}`} aria-hidden>
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {showAll && (
        <ul className="space-y-1.5">
          {suggestions
            .filter((s) => s.kind !== chosen?.kind)
            .map((s) => (
              <li key={s.kind}>
                <button
                  type="button"
                  onClick={() => {
                    setKind(s.kind);
                    setShowAll(false);
                  }}
                  className={`w-full rounded-xl bg-(--surface-2) px-3 py-2.5 text-left ${s.blocked ? "opacity-60" : ""}`}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{CARDIO_TYPES[s.kind].title}</span>
                    {s.blocked && <span className="chip">Not tonight</span>}
                  </div>
                  <p className="mt-0.5 text-[13px] text-(--muted)">{s.reason}</p>
                </button>
              </li>
            ))}
        </ul>
      )}

      <dl className="grid grid-cols-2 gap-2">
        <div className="rounded-xl bg-(--surface-2) px-3 py-2">
          <dt className="text-[12px] text-(--muted)">Hard this week</dt>
          <dd className="num text-[20px]">
            {hardThisWeek}
            <span className="text-[14px] text-(--muted)"> of {maxHard}</span>
          </dd>
        </div>
        <div className="rounded-xl bg-(--surface-2) px-3 py-2">
          <dt className="text-[12px] text-(--muted)">Tomorrow</dt>
          <dd className="truncate text-[15px] font-semibold leading-[1.6]">{tomorrowLabel}</dd>
        </div>
      </dl>
    </section>
  );
}

function LoggedCardioRow({ entry }: { entry: Logged }) {
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const t = CARDIO_TYPES[entry.kind];
  return (
    <li className="flex min-h-12 items-center gap-3 rounded-xl bg-(--ok-soft) px-3">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-(--ok) text-(--surface)">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M5 12.5l4.5 4.5L19 7.5" />
        </svg>
      </span>
      <span className="font-semibold">{t.title}</span>
      <span className="text-[13px] text-(--muted)">
        {entry.minutes ? <span className="num text-[15px] text-(--foreground)">{entry.minutes}</span> : null}
        {entry.minutes ? " min" : ""}
        {entry.place ? (entry.place === "gym" ? ", gym" : ", outside") : ""}
      </span>
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (!confirming) {
            setConfirming(true);
            setTimeout(() => setConfirming(false), 3000);
            return;
          }
          startTransition(async () => {
            await deleteCardio(entry.id);
          });
        }}
        className={`ml-auto h-9 rounded-lg px-2 text-[13px] font-semibold ${confirming ? "text-(--danger)" : "text-(--muted)"}`}
      >
        {confirming ? "Tap to remove" : "Remove"}
      </button>
    </li>
  );
}
