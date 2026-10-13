"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { deleteCardio } from "@/lib/actions/cardio";
import {
  MACHINES_FOR,
  MACHINE_NAMES,
  SESSION_TITLES,
  SHORT_TITLES,
  WEEKLY,
  type Fit,
  type SessionId,
} from "@/lib/program/running";

export type LoggedCardio = {
  id: string;
  session: SessionId;
  minutes: number | null;
  machine: string | null;
};

export function TonightCardio({
  pick,
  options,
  doneThisWeek,
  logged,
  longMinutes,
}: {
  pick: SessionId;
  options: Array<{ id: SessionId; fit: Fit }>;
  doneThisWeek: SessionId[];
  logged: LoggedCardio[];
  longMinutes: number;
}) {
  const [chosenId, setChosenId] = useState<SessionId>(pick);
  const [showAll, setShowAll] = useState(false);
  const chosen = options.find((o) => o.id === chosenId) ?? options.find((o) => o.id === pick)!;
  const title = (id: SessionId) => (id === "long" ? `${SESSION_TITLES.long}, ${longMinutes} min` : SESSION_TITLES[id]);
  const others = MACHINES_FOR[chosen.id].filter((m) => m !== chosen.fit.machine);
  const allDone = WEEKLY.every((id) => doneThisWeek.includes(id));

  return (
    <section className="card space-y-3 p-4">
      {logged.length > 0 && (
        <ul className="space-y-1.5">
          {logged.map((l) => (
            <LoggedCardioRow key={l.id} entry={l} />
          ))}
        </ul>
      )}

      <div className="space-y-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="display text-[20px]">{title(chosen.id)}</h3>
            {chosen.id === pick && logged.length === 0 && <span className="chip chip-accent">Best today</span>}
            {!chosen.fit.ok && <span className="chip">Better another day</span>}
          </div>
          <p className="mt-0.5 text-[14px] text-(--muted)">
            {chosen.id === "walk" && allDone ? "All four sessions done this week. Walk or rest." : chosen.fit.note}
          </p>
        </div>
        <Link
          href={`/cardio?session=${chosen.id}&machine=${chosen.fit.machine}`}
          className={`btn btn-block ${logged.length > 0 ? "btn-secondary" : "btn-primary"}`}
        >
          Start on the {MACHINE_NAMES[chosen.fit.machine].toLowerCase()}
        </Link>
        {others.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[13px] text-(--muted)">Or:</span>
            {others.map((m) => (
              <Link key={m} href={`/cardio?session=${chosen.id}&machine=${m}`} className="chip h-9 px-3 text-[13px]">
                {MACHINE_NAMES[m]}
              </Link>
            ))}
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={() => setShowAll((v) => !v)}
        aria-expanded={showAll}
        className="flex w-full items-center justify-between border-t border-(--border) pt-3 text-[14px] font-semibold text-(--accent)"
      >
        Other sessions
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform ${showAll ? "rotate-180" : ""}`} aria-hidden>
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {showAll && (
        <ul className="space-y-1.5">
          {options
            .filter((o) => o.id !== chosen.id)
            .map((o) => (
              <li key={o.id}>
                <button
                  type="button"
                  onClick={() => {
                    setChosenId(o.id);
                    setShowAll(false);
                  }}
                  className="w-full rounded-xl bg-(--surface-2) px-3 py-2.5 text-left"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{title(o.id)}</span>
                    {!o.fit.ok && <span className="chip">Better another day</span>}
                  </div>
                  <p className="mt-0.5 text-[13px] text-(--muted)">{o.fit.note}</p>
                </button>
              </li>
            ))}
        </ul>
      )}

      <div>
        <div className="label pb-1.5">This week</div>
        <ul className="grid grid-cols-4 gap-1.5">
          {WEEKLY.map((id) => {
            const done = doneThisWeek.includes(id);
            return (
              <li
                key={id}
                className={`flex h-10 items-center justify-center gap-1 rounded-lg text-[13px] font-semibold ${
                  done ? "bg-(--ok-soft) text-(--ok)" : "bg-(--surface-2) text-(--muted)"
                }`}
              >
                {done && (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M5 12.5l4.5 4.5L19 7.5" />
                  </svg>
                )}
                {SHORT_TITLES[id]}
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

function LoggedCardioRow({ entry }: { entry: LoggedCardio }) {
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);
  return (
    <li className="flex min-h-12 items-center gap-3 rounded-xl bg-(--ok-soft) px-3">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-(--ok) text-(--surface)">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M5 12.5l4.5 4.5L19 7.5" />
        </svg>
      </span>
      <span className="min-w-0 truncate font-semibold">{SESSION_TITLES[entry.session]}</span>
      <span className="shrink-0 text-[13px] text-(--muted)">
        {entry.minutes ? <span className="num text-[15px] text-(--foreground)">{entry.minutes}</span> : null}
        {entry.minutes ? " min" : ""}
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
        className={`ml-auto h-9 shrink-0 rounded-lg px-2 text-[13px] font-semibold ${confirming ? "text-(--danger)" : "text-(--muted)"}`}
      >
        {confirming ? "Tap to remove" : "Remove"}
      </button>
    </li>
  );
}
