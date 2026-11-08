"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { logCardio } from "@/lib/actions/cardio";
import { isTreadmill, MACHINE_NAMES, type Machine, type Session, type SessionId } from "@/lib/program/running";
import { CardioTimer } from "../log/[sessionId]/cardio-timer";

const dayKey = (session: SessionId, machine: Machine, day: string) => `liftkit.cardio.${session}.${machine}.${day}`;

// the new way picks up at the same elapsed time, still running, and the
// old timer is cleared so it can't come back
function carryTimer(fromKey: string, toKey: string, doneMs: number, totalSeconds: number, started: boolean) {
  try {
    const left = totalSeconds * 1000 - doneMs;
    if (started && left > 0) {
      window.localStorage.setItem(toKey, JSON.stringify({ endAt: Date.now() + left, leftMs: left }));
    }
    window.localStorage.removeItem(fromKey);
  } catch {}
}

function useLog(session: SessionId, machine: Machine) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const log = (minutes: number) => {
    setError(null);
    startTransition(async () => {
      try {
        await logCardio({ session, machine, minutes });
        router.push("/");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Couldn't save. Try again.");
      }
    });
  };
  return { log, pending, error };
}

export function CardioRun({
  session,
  others = [],
}: {
  session: Session;
  // the same session done other ways, so you can switch mid-run and keep
  // the minutes you've already done
  others?: Array<{ machine: Machine; totalSeconds: number }>;
}) {
  const router = useRouter();
  const { log, pending, error } = useLog(session.id, session.machine);
  const [day] = useState(() => new Date().toISOString().slice(0, 10));
  const elapsed = useRef(0);
  const [started, setStarted] = useState(false);
  const total = session.steps.reduce((n, s) => n + s.seconds, 0);
  const bySpeed = isTreadmill(session.machine);

  // carry the clock over: the new way picks up at the same elapsed time,
  // still running, and the old timer is cleared so it can't come back
  const switchTo = (o: { machine: Machine; totalSeconds: number }) => {
    carryTimer(dayKey(session.id, session.machine, day), dayKey(session.id, o.machine, day), elapsed.current, o.totalSeconds, started);
    router.push(`/cardio?session=${session.id}&machine=${o.machine}`);
  };

  return (
    <div className="space-y-4">
      <CardioTimer
        totalSeconds={total}
        steps={session.steps}
        nowLabel={bySpeed ? "Set to" : "Now"}
        persistKey={dayKey(session.id, session.machine, day)}
        onElapsed={(ms) => {
          elapsed.current = ms;
          if (!started && ms > 0) setStarted(true);
        }}
        onComplete={() => log(session.minutes)}
      />
      <p className="text-[13px] text-(--muted)">
        {bySpeed
          ? "Heart rate wins. If the speed puts you above the range, slow down. It logs itself when the timer ends."
          : "Go by heart rate and feel, no machine numbers needed. It logs itself when the timer ends."}
      </p>
      {others.length > 0 && (
        <div className="space-y-1.5">
          <div className="label">{started ? "Switch, keeping the time done" : "Do it as"}</div>
          <div className="flex flex-wrap gap-1.5">
            {others.map((o) => (
              <button key={o.machine} type="button" onClick={() => switchTo(o)} className="chip h-10 px-4 text-[14px]">
                {MACHINE_NAMES[o.machine]}
              </button>
            ))}
          </div>
          <p className="text-[12px] text-(--muted)">Same session either way. It counts as {session.title.toLowerCase().split(",")[0]} whichever way you do it.</p>
        </div>
      )}
      <button
        type="button"
        disabled={pending}
        onClick={() => log(started ? Math.max(1, Math.round(elapsed.current / 60000)) : session.minutes)}
        className="btn btn-secondary btn-block"
      >
        {pending ? "Saving…" : started ? "Stop and log what I did" : `Log ${session.minutes} min without the timer`}
      </button>
      {error && <p className="text-[13px] text-(--danger)">{error}</p>}
    </div>
  );
}

export function OutsideLog({ session }: { session: Session }) {
  const { log, pending, error } = useLog(session.id, "outside");
  const [minutes, setMinutes] = useState(session.minutes);
  return (
    <section className="card space-y-4 p-5">
      <p className="text-[14px] text-(--muted)">Track it on your watch, then log the time here.</p>
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
      <button type="button" disabled={pending} onClick={() => log(minutes)} className="btn btn-primary btn-block">
        {pending ? "Saving…" : "Log it"}
      </button>
      {error && <p className="text-[13px] text-(--danger)">{error}</p>}
    </section>
  );
}
