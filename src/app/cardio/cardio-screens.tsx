"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { logCardio } from "@/lib/actions/cardio";
import type { CardioKind } from "@/lib/program/cardio";
import type { CardioPlan } from "@/lib/program/cardio-plans";
import { CardioTimer } from "../log/[sessionId]/cardio-timer";

function useLog(kind: CardioKind) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const log = (minutes: number, place: "gym" | "outside", planId: string | null) => {
    setError(null);
    startTransition(async () => {
      try {
        await logCardio({ kind, minutes, place, plan_id: planId });
        router.push("/");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Couldn't save. Try again.");
      }
    });
  };
  return { log, pending, error };
}

export function CardioRun({ kind, plan }: { kind: CardioKind; plan: CardioPlan }) {
  const { log, pending, error } = useLog(kind);
  const elapsed = useRef(0);
  const [started, setStarted] = useState(false);
  const total = plan.steps.reduce((n, s) => n + s.seconds, 0);

  return (
    <div className="space-y-4">
      <CardioTimer
        totalSeconds={total}
        steps={plan.steps}
        nowLabel="Set to"
        onElapsed={(ms) => {
          elapsed.current = ms;
          if (!started && ms > 0) setStarted(true);
        }}
        onComplete={() => log(plan.minutes, "gym", plan.id)}
      />
      <p className="text-[13px] text-(--muted)">
        The numbers are a starting point. If the effort line and the number disagree, go by the effort. It logs itself when the timer ends.
      </p>
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          log(started ? Math.max(1, Math.round(elapsed.current / 60000)) : plan.minutes, "gym", plan.id)
        }
        className="btn btn-secondary btn-block"
      >
        {pending ? "Saving…" : started ? "Stop and log what I did" : `Log ${plan.minutes} min without the timer`}
      </button>
      {error && <p className="text-[13px] text-(--danger)">{error}</p>}
    </div>
  );
}

export function OutsideLog({ kind, defaultMinutes }: { kind: CardioKind; defaultMinutes: number }) {
  const { log, pending, error } = useLog(kind);
  const [minutes, setMinutes] = useState(defaultMinutes);
  return (
    <section className="card space-y-4 p-5">
      <div className="flex items-center justify-between">
        <span className="font-semibold">Minutes</span>
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => setMinutes((v) => Math.max(5, v - 5))} className="btn btn-secondary btn-sm w-11 px-0" aria-label="5 minutes less">
            −
          </button>
          <span className="num w-14 text-center text-[30px]">{minutes}</span>
          <button type="button" onClick={() => setMinutes((v) => Math.min(240, v + 5))} className="btn btn-secondary btn-sm w-11 px-0" aria-label="5 minutes more">
            +
          </button>
        </div>
      </div>
      <button type="button" disabled={pending} onClick={() => log(minutes, "outside", null)} className="btn btn-primary btn-block">
        {pending ? "Saving…" : "Log it"}
      </button>
      {error && <p className="text-[13px] text-(--danger)">{error}</p>}
    </section>
  );
}
