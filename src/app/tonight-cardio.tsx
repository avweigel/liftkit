"use client";

import { useState, useTransition } from "react";
import { deleteCardio, logCardio } from "@/lib/actions/cardio";
import { CardioTimer } from "./log/[sessionId]/cardio-timer";
import { OUTSIDE_GUIDE, cardioPlan, plansFor } from "@/lib/program/cardio-plans";
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
  const rest = suggestions.filter((s) => s !== best);
  const [open, setOpen] = useState<CardioKind | null>(null);
  const [showAll, setShowAll] = useState(false);

  return (
    <section className="card space-y-3 p-4">
      {logged.length > 0 && (
        <ul className="space-y-1.5">
          {logged.map((l) => (
            <LoggedCardioRow key={l.id} entry={l} />
          ))}
        </ul>
      )}

      {logged.length === 0 && best && (
        <div className="space-y-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="display text-[20px]">{CARDIO_TYPES[best.kind].title}</h3>
              <span className="chip chip-accent">Best tonight</span>
            </div>
            <p className="mt-0.5 text-[14px] text-(--muted)">{best.reason}</p>
          </div>
          {open === best.kind ? (
            <CardioLogForm kind={best.kind} onDone={() => setOpen(null)} onCancel={() => setOpen(null)} />
          ) : (
            <button type="button" onClick={() => setOpen(best.kind)} className="btn btn-secondary btn-block">
              See the plan
            </button>
          )}
        </div>
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

      <button
        type="button"
        onClick={() => setShowAll((v) => !v)}
        aria-expanded={showAll}
        className="flex w-full items-center justify-between border-t border-(--border) pt-3 text-[14px] font-semibold text-(--accent)"
      >
        {logged.length > 0 ? "Log something else" : "Other options"}
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform ${showAll ? "rotate-180" : ""}`} aria-hidden>
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {showAll && (
        <ul className="space-y-1.5">
          {(logged.length > 0 ? suggestions : rest).map((s) => {
            const t = CARDIO_TYPES[s.kind];
            const isOpen = open === s.kind;
            return (
              <li key={s.kind} className={`rounded-xl bg-(--surface-2) px-3 py-2.5 ${s.blocked ? "opacity-60" : ""}`}>
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : s.kind)}
                  className="w-full text-left"
                  aria-expanded={isOpen}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{t.title}</span>
                    {s.blocked && <span className="chip">Not tonight</span>}
                  </div>
                  <p className="mt-0.5 text-[13px] text-(--muted)">{s.reason}</p>
                </button>
                {isOpen && (
                  <div className="mt-2">
                    <CardioLogForm kind={s.kind} onDone={() => { setOpen(null); setShowAll(false); }} onCancel={() => setOpen(null)} />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function CardioLogForm({
  kind,
  onDone,
  onCancel,
}: {
  kind: CardioKind;
  onDone: () => void;
  onCancel: () => void;
}) {
  const t = CARDIO_TYPES[kind];
  const plans = plansFor(kind);
  const [place, setPlace] = useState<"outside" | "gym">("gym");
  const [planId, setPlanId] = useState<string>(() => {
    try {
      const saved = window.localStorage.getItem(`liftkit.cardio.plan.${kind}`);
      if (saved && plans.some((p) => p.id === saved)) return saved;
    } catch {}
    return plans[0]?.id ?? "";
  });
  const plan = cardioPlan(planId);
  const [minutes, setMinutes] = useState(plan?.minutes ?? t.minutes);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const guide = OUTSIDE_GUIDE[kind];

  const pickPlan = (id: string) => {
    setPlanId(id);
    const p = cardioPlan(id);
    if (p) setMinutes(p.minutes);
    try {
      window.localStorage.setItem(`liftkit.cardio.plan.${kind}`, id);
    } catch {}
  };

  const save = () => {
    setError(null);
    startTransition(async () => {
      try {
        await logCardio({ kind, minutes, place, plan_id: place === "gym" ? planId : null });
        onDone();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Couldn't save. Try again.");
      }
    });
  };

  return (
    <div className="space-y-3 rounded-xl bg-(--background) p-3">
      <div className="grid grid-cols-2 gap-1 rounded-xl bg-(--surface-2) p-1">
        {(["gym", "outside"] as const).map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setPlace(p)}
            aria-pressed={place === p}
            className={`h-10 rounded-lg text-[14px] font-semibold transition-colors ${
              place === p ? "bg-(--surface) text-(--foreground) shadow-sm" : "text-(--muted)"
            }`}
          >
            {p === "outside" ? "Outside" : "Gym"}
          </button>
        ))}
      </div>

      {place === "outside" ? (
        <div className="space-y-2">
          <p className="font-semibold">{guide.title}</p>
          <ul className="space-y-1.5">
            {guide.points.map((pt) => (
              <li key={pt} className="flex gap-2 text-[14px]">
                <span className="mt-[8px] h-1.5 w-1.5 shrink-0 rounded-full bg-(--accent)" aria-hidden />
                {pt}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Machine">
            {plans.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => pickPlan(p.id)}
                aria-pressed={p.id === planId}
                className={`h-9 rounded-full px-3 text-[13px] font-semibold transition-colors ${
                  p.id === planId ? "bg-(--accent) text-(--accent-contrast)" : "bg-(--surface-2) text-(--muted)"
                }`}
              >
                {p.machine === "Treadmill run" && plans.filter((x) => x.machine === p.machine).length > 1
                  ? p.name
                  : p.machine}
              </button>
            ))}
          </div>
          {plan && (
            <>
              <div>
                <p className="font-semibold">
                  {plan.name} <span className="num text-[14px] font-normal text-(--muted)">{plan.minutes} min</span>
                </p>
                <p className="text-[13px] text-(--muted)">{plan.summary}</p>
              </div>
              <CardioTimer
                key={plan.id}
                totalSeconds={plan.steps.reduce((n, st) => n + st.seconds, 0)}
                steps={plan.steps}
                nowLabel="Set to"
              />
              <p className="text-[12px] text-(--muted)">
                The numbers are a starting point. If the effort line and the number disagree, go by the effort.
              </p>
            </>
          )}
        </div>
      )}

      <div className="flex items-center justify-between">
        <span className="label">Minutes</span>
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => setMinutes((v) => Math.max(5, v - 5))} className="btn btn-secondary btn-sm w-11 px-0" aria-label="5 minutes less">−</button>
          <span className="num w-12 text-center text-[26px]">{minutes}</span>
          <button type="button" onClick={() => setMinutes((v) => Math.min(180, v + 5))} className="btn btn-secondary btn-sm w-11 px-0" aria-label="5 minutes more">+</button>
        </div>
      </div>
      <div className="flex gap-2">
        <button type="button" onClick={onCancel} className="btn btn-secondary flex-1">
          Cancel
        </button>
        <button type="button" onClick={save} disabled={pending} className="btn btn-primary flex-[2]">
          {pending ? "Saving…" : "Log it"}
        </button>
      </div>
      {error && <p className="text-[13px] text-(--danger)">{error}</p>}
    </div>
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
