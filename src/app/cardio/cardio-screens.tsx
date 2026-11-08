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

// a pace change at a moment in the run. before the first change the
// plan applies, after it the new offset holds until the next change.
type PaceChange = { at: number; kmh: number };
const offsetAt = (changes: PaceChange[], t: number) => {
  let o = 0;
  for (const c of changes) if (c.at <= t) o = c.kmh;
  return o;
};

// distance covered after a given number of elapsed seconds, with the
// offset that was in force at each moment. a change made at minute 20
// speeds up minutes 20 onward, not the 20 already run.
function kmAfter(steps: CardioStep[], elapsedS: number, changes: PaceChange[]): number {
  const cuts = new Set<number>([0, elapsedS, ...changes.map((c) => c.at)]);
  let acc = 0;
  for (const st of steps) {
    acc += st.seconds;
    cuts.add(acc);
  }
  const points = [...cuts].filter((t) => t >= 0 && t <= elapsedS).sort((a, b) => a - b);
  let km = 0;
  for (let i = 0; i + 1 < points.length; i++) {
    const a = points[i];
    const b = points[i + 1];
    if (b <= a) continue;
    let start = 0;
    const st = steps.find((x) => {
      const end = start + x.seconds;
      const hit = a >= start && a < end;
      start = end;
      return hit;
    });
    const v = st ? speedOf(st.label) : null;
    if (v == null) continue;
    const speed = st && isRunStep(st) ? Math.max(3, v + offsetAt(changes, a)) : v;
    km += (speed * (b - a)) / 3600;
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

  // pace changes, each stamped with when in the run it happened, so the
  // distance is right and the plan on screen matches the belt
  const offsetKey = `${dayKey(session.id, session.machine, day)}.pace`;
  const [changes, setChanges] = useState<PaceChange[]>([]);
  useEffect(() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem(offsetKey) ?? "[]");
      // restoring from storage can only happen after mount
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (Array.isArray(saved) && saved.length) setChanges(saved);
    } catch {}
  }, [offsetKey]);
  const [elapsedS, setElapsedS] = useState(0);
  const offset = offsetAt(changes, elapsedS);
  const nudge = (d: number) => {
    const next = Math.round((offset + d) * 10) / 10;
    const at = Math.floor(elapsed.current / 1000);
    const kept = changes.filter((c) => c.at !== at);
    const list = [...kept, { at, kmh: next }].sort((a, b) => a.at - b.at);
    setChanges(list);
    try {
      window.localStorage.setItem(offsetKey, JSON.stringify(list));
    } catch {}
  };
  const steps = useMemo(() => shifted(session.steps, offset), [session.steps, offset]);
  const hasRunSteps = bySpeed && session.steps.some(isRunStep);
  const kmSoFar = kmAfter(session.steps, elapsedS, changes);
  // the rest of the run at the offset that holds now
  const kmTotal = kmAfter(session.steps, total, changes);
  // 0.2 km/h is about 0.1 mph, one tap on most treadmills
  const stepKmh = metric ? 0.2 : 0.16;
  const showKm = (km: number) => (metric ? `${km.toFixed(1)} km` : `${(km * 0.621371).toFixed(1)} mi`);
  const showSpeed = (kmh: number) => (metric ? `${kmh.toFixed(1)} km/h` : `${(kmh * 0.621371).toFixed(1)} mph`);
  const showOffset = `${offset > 0 ? "+" : "−"}${showSpeed(Math.abs(offset))}`;
  // the step you're in and the speed the belt should read right now
  const current = (() => {
    let start = 0;
    for (const st of steps) {
      if (elapsedS < start + st.seconds) return st;
      start += st.seconds;
    }
    return steps[steps.length - 1];
  })();
  const beltNow = current ? speedOf(current.label) : null;
  const inRun = !!current && isRunStep(current);

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
        <div className="space-y-3 rounded-2xl bg-(--surface-2) p-4">
          <div className="flex items-baseline justify-between">
            <span className="text-[15px] font-semibold">Your pace</span>
            <span className="text-[13px] text-(--muted)">{offset === 0 ? "On plan" : `${showOffset} from plan`}</span>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => nudge(-stepKmh)} className="btn btn-secondary h-14 w-16 shrink-0 px-0 text-[26px]" aria-label="Slower">
              −
            </button>
            <div className="min-w-0 flex-1 text-center">
              <div className="num text-[30px] leading-none">{beltNow != null && inRun ? showSpeed(beltNow) : beltNow != null ? showSpeed(beltNow) : "—"}</div>
              <div className="mt-1 text-[12px] text-(--muted)">{inRun ? "run steps, from now on" : "walking. Change applies to the runs"}</div>
            </div>
            <button type="button" onClick={() => nudge(stepKmh)} className="btn btn-secondary h-14 w-16 shrink-0 px-0 text-[26px]" aria-label="Faster">
              +
            </button>
          </div>
          <div className="flex items-baseline justify-between text-[13px] text-(--muted)">
            <span>
              So far <span className="num text-[16px] text-(--foreground)">{showKm(kmSoFar)}</span>
            </span>
            <span>
              Finishes at <span className="num text-[16px] text-(--foreground)">{showKm(kmTotal)}</span>
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
            hasRunSteps ? (started ? kmAfter(session.steps, Math.floor(elapsed.current / 1000), changes) : kmTotal) : null,
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
