"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { logCardio } from "@/lib/actions/cardio";
import { isTreadmill, MACHINE_NAMES, type Machine, type Session, type SessionId } from "@/lib/program/running";
import { useContext } from "react";
import { MeasurementContext } from "@/lib/display/units";
import { CardioTimer, type CardioStep } from "../log/[sessionId]/cardio-timer";

// a treadmill step's speed, when it has one
const speedOf = (label: string) => {
  const m = label.match(/^([\d.]+)\s*km\/h/);
  return m ? Number(m[1]) : null;
};
// walks stay as walks. anything faster than a brisk walk is a run step
const isRunStep = (st: CardioStep) => (speedOf(st.label) ?? 0) > 5.5;

// the pace change applies to every run step, now and still to come, so
// the plan on screen is the plan you're actually running
function shifted(steps: CardioStep[], offsetKmh: number): CardioStep[] {
  if (!offsetKmh) return steps;
  return steps.map((st) => {
    const v = speedOf(st.label);
    if (v == null || !isRunStep(st)) return st;
    const next = Math.max(3, Math.round((v + offsetKmh) * 10) / 10);
    return { ...st, label: st.label.replace(/^[\d.]+\s*km\/h/, `${next} km/h`) };
  });
}

// distance covered after a given number of elapsed seconds
function kmAfter(steps: CardioStep[], elapsedS: number): number {
  let left = elapsedS;
  let km = 0;
  for (const st of steps) {
    if (left <= 0) break;
    const s = Math.min(st.seconds, left);
    const v = speedOf(st.label);
    if (v != null) km += (v * s) / 3600;
    left -= s;
  }
  return Math.round(km * 100) / 100;
}

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
  const log = (minutes: number, km?: number | null) => {
    setError(null);
    startTransition(async () => {
      try {
        await logCardio({ session, machine, minutes, km: km ?? null });
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
  const metric = useContext(MeasurementContext) !== "imperial";

  // your pace today, as a shift from the plan. remembered through a reload
  const offsetKey = `${dayKey(session.id, session.machine, day)}.offset`;
  const [offset, setOffset] = useState(0);
  useEffect(() => {
    try {
      const saved = Number(window.localStorage.getItem(offsetKey) ?? 0) || 0;
      // restoring from storage can only happen after mount
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (saved) setOffset(saved);
    } catch {}
  }, [offsetKey]);
  const nudge = (d: number) => {
    const next = Math.round((offset + d) * 10) / 10;
    setOffset(next);
    try {
      if (next) window.localStorage.setItem(offsetKey, String(next));
      else window.localStorage.removeItem(offsetKey);
    } catch {}
  };
  const steps = useMemo(() => shifted(session.steps, offset), [session.steps, offset]);
  const hasRunSteps = bySpeed && session.steps.some(isRunStep);
  const [elapsedS, setElapsedS] = useState(0);
  const kmSoFar = kmAfter(steps, elapsedS);
  const kmTotal = kmAfter(steps, total);
  // 0.2 km/h is about 0.1 mph, one tap on most treadmills
  const stepKmh = metric ? 0.2 : 0.16;
  const showKm = (km: number) => (metric ? `${km.toFixed(1)} km` : `${(km * 0.621371).toFixed(1)} mi`);
  const showOffset = metric ? `${offset > 0 ? "+" : ""}${offset.toFixed(1)} km/h` : `${offset > 0 ? "+" : ""}${(offset * 0.621371).toFixed(1)} mph`;

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
        steps={steps}
        nowLabel={bySpeed ? "Set to" : "Now"}
        persistKey={dayKey(session.id, session.machine, day)}
        onElapsed={(ms) => {
          elapsed.current = ms;
          if (!started && ms > 0) setStarted(true);
          const sec = Math.floor(ms / 1000);
          setElapsedS((prev) => (prev === sec ? prev : sec));
        }}
        onComplete={() => log(session.minutes, hasRunSteps ? kmTotal : null)}
      />
      {hasRunSteps && (
        <div className="space-y-2 rounded-xl bg-(--surface-2) p-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <div className="text-[14px] font-semibold">Pace today</div>
              <div className="text-[12px] text-(--muted)">
                {offset === 0 ? "On plan. Every run step moves together." : `${showOffset} on every run step. Walks unchanged.`}
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button type="button" onClick={() => nudge(-stepKmh)} className="btn btn-secondary btn-sm w-11 px-0" aria-label="Slower">
                −
              </button>
              <span className="num w-16 text-center text-[17px]">{offset === 0 ? "plan" : showOffset.replace(/ (km\/h|mph)$/, "")}</span>
              <button type="button" onClick={() => nudge(stepKmh)} className="btn btn-secondary btn-sm w-11 px-0" aria-label="Faster">
                +
              </button>
            </div>
          </div>
          <div className="flex items-baseline justify-between text-[13px] text-(--muted)">
            <span>
              So far <span className="num text-[15px] text-(--foreground)">{showKm(kmSoFar)}</span>
            </span>
            <span>
              Finishes at <span className="num text-[15px] text-(--foreground)">{showKm(kmTotal)}</span>
            </span>
          </div>
        </div>
      )}
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
        onClick={() =>
          log(
            started ? Math.max(1, Math.round(elapsed.current / 60000)) : session.minutes,
            hasRunSteps ? (started ? kmAfter(steps, Math.floor(elapsed.current / 1000)) : kmTotal) : null,
          )
        }
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
