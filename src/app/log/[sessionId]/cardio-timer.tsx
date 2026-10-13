"use client";

import { useEffect, useRef, useState } from "react";
import { chime, keepAwake, unlockAudio } from "@/lib/display/chime";
import { useLocalizeDistance } from "@/lib/display/units";

// level is the treadmill incline. stretch steps have none and show by name.
export type CardioStep = { label: string; seconds: number; level?: number; sub?: string };

// "20 min" in the reps, and optionally "Incline 3, 5, 7 (2 min each)" in
// the notes, turn a cardio exercise into a timer that calls out each change
export function parseCardio(
  reps: string,
  notes: string | null,
): { totalSeconds: number; steps: CardioStep[] } | null {
  const m = reps.match(/(\d+)\s*min/i);
  if (!m) return null;
  const totalSeconds = Number(m[1]) * 60;
  const pattern = (notes ?? "").match(/incline\s+([\d.,\s]+?)\s*\(\s*(\d+(?:\.\d+)?)\s*min each\s*\)/i);
  if (!pattern) return { totalSeconds, steps: [] };
  const each = Math.round(Number(pattern[2]) * 60);
  const steps = pattern[1]
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean)
    .map((v) => ({ label: `${v}%`, seconds: each, level: Number(v) }));
  return { totalSeconds: steps.reduce((t, s) => t + s.seconds, 0), steps };
}

export function CardioTimer({
  totalSeconds,
  steps,
  onComplete,
  nowLabel = "Incline now",
  onElapsed,
}: {
  onElapsed?: (ms: number) => void;
  totalSeconds: number;
  steps: CardioStep[];
  onComplete?: () => void;
  nowLabel?: string;
}) {
  const localize = useLocalizeDistance();
  const incline = steps.length > 0 && steps.every((st) => st.level != null);
  const completeRef = useRef(onComplete);
  const elapsedRef = useRef(onElapsed);
  useEffect(() => {
    elapsedRef.current = onElapsed;
  }, [onElapsed]);
  useEffect(() => {
    completeRef.current = onComplete;
  }, [onComplete]);
  const totalMs = totalSeconds * 1000;
  const [endAt, setEndAt] = useState<number | null>(null);
  const [leftMs, setLeftMs] = useState(totalMs);
  const [now, setNow] = useState(() => Date.now());
  const [doneAll, setDoneAll] = useState(false);
  const audioRef = useRef<AudioContext | null>(null);
  const wakeRef = useRef<{ release: () => Promise<void> } | null>(null);
  const stepRef = useRef(0);
  const [flashUntil, setFlashUntil] = useState(0);

  const running = endAt != null;
  const remaining = running ? Math.max(0, endAt - now) : leftMs;
  const elapsed = totalMs - remaining;

  const stepIndex = (() => {
    let acc = 0;
    for (let i = 0; i < steps.length; i++) {
      acc += steps[i].seconds * 1000;
      if (elapsed < acc) return i;
    }
    return Math.max(0, steps.length - 1);
  })();
  const stepEndsIn = (() => {
    let acc = 0;
    for (let i = 0; i <= stepIndex; i++) acc += (steps[i]?.seconds ?? 0) * 1000;
    return Math.max(0, acc - elapsed);
  })();

  useEffect(() => {
    if (endAt == null) return;
    const id = setInterval(() => {
      const t = Date.now();
      setNow(t);
      elapsedRef.current?.(totalMs - Math.max(0, endAt - t));
      if (t >= endAt) {
        clearInterval(id);
        setEndAt(null);
        setLeftMs(0);
        setDoneAll(true);
        chime(audioRef.current, 3);
        completeRef.current?.();
        wakeRef.current?.release().catch(() => {});
        wakeRef.current = null;
      }
    }, 250);
    return () => clearInterval(id);
  }, [endAt, totalMs]);

  // one beep when it's time to change the incline
  useEffect(() => {
    if (!running) return;
    if (stepIndex !== stepRef.current) {
      stepRef.current = stepIndex;
      chime(audioRef.current, 1);
      // a few seconds of colour you can't miss from the corner of your eye
      const until = Date.now() + 5000;
      const id = setTimeout(() => setFlashUntil(until), 0);
      return () => clearTimeout(id);
    }
  }, [running, stepIndex]);

  useEffect(() => {
    return () => {
      wakeRef.current?.release().catch(() => {});
    };
  }, []);

  const start = () => {
    audioRef.current = unlockAudio(audioRef.current);
    keepAwake().then((lock) => {
      wakeRef.current = lock;
    });
    const t = Date.now();
    setNow(t);
    setDoneAll(false);
    const left = leftMs > 0 ? leftMs : totalMs;
    if (leftMs <= 0) stepRef.current = 0;
    setLeftMs(left);
    setEndAt(t + left);
  };

  const pause = () => {
    setLeftMs(remaining);
    setEndAt(null);
    wakeRef.current?.release().catch(() => {});
    wakeRef.current = null;
  };

  const restart = () => {
    const t = Date.now();
    stepRef.current = 0;
    setFlashUntil(0);
    setDoneAll(false);
    setLeftMs(totalMs);
    setNow(t);
    setEndAt(t + totalMs);
  };

  const reset = () => {
    setEndAt(null);
    setLeftMs(totalMs);
    setDoneAll(false);
    stepRef.current = 0;
  };

  const clock = (ms: number) => {
    const s = Math.ceil(ms / 1000);
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  };
  const started = running || leftMs < totalMs;
  const current = steps[stepIndex];
  const next = steps[stepIndex + 1];
  const flashing = running && now < flashUntil;
  const stepMs = (current?.seconds ?? totalSeconds) * 1000;
  const stepFraction = steps.length === 0 ? remaining / totalMs : started ? stepEndsIn / stepMs : 1;

  return (
    <div
      className={`space-y-3 rounded-xl p-3 transition-colors duration-200 ${
        flashing
          ? "timer-flash bg-(--accent) text-(--accent-contrast) [&_.label]:text-current [&_.label]:opacity-75"
          : "bg-(--surface-2)"
      }`}
    >
      {flashing && current && incline && (
        <p className="display text-center text-[22px]">Change to {localize(current.label)}</p>
      )}
      <div className="flex items-center gap-4">
        <Ring
          fraction={doneAll ? 1 : stepFraction}
          label={doneAll ? "" : steps.length === 0 ? clock(remaining) : clock(started ? stepEndsIn : stepMs)}
          final={running && stepEndsIn <= 3000 && stepEndsIn > 0}
          done={doneAll}
          inverted={flashing}
        />
        <div className="min-w-0 flex-1">
          {steps.length > 0 && (
            <>
              <p className="label">{doneAll ? "Finished" : started ? (incline ? nowLabel : "Now") : incline ? "Starts at" : "First"}</p>
              {incline ? (
                <p
                  className={`num leading-none ${(current?.label.length ?? 0) > 7 ? "text-[26px]" : "text-[40px]"} ${flashing ? "" : "text-(--accent)"}`}
                >
                  {current && localize(current.label)}
                </p>
              ) : (
                <p className={`display text-[22px] leading-tight ${flashing ? "" : "text-(--accent)"}`}>{doneAll ? "Nice work" : current && localize(current.label)}</p>
              )}
              {current?.sub && !doneAll && (
                <p className="mt-1 text-[14px] font-semibold">{localize(current.sub)}</p>
              )}
              {next && !doneAll && (
                <p className={`mt-1 text-[13px] ${flashing ? "" : "text-(--muted)"}`}>Then {localize(incline ? next.label : next.label.toLowerCase())}</p>
              )}
            </>
          )}
        </div>
      </div>

      {steps.length > 1 && (
        <div className="flex h-8 items-end gap-0.5" aria-hidden>
          {steps.map((st, i) => {
            const h = incline ? (st.level ?? 0) : 1;
            const max = incline ? Math.max(...steps.map((x) => x.level ?? 0), 1) : 1;
            const fill = doneAll || i < stepIndex ? 1 : i === stepIndex && started ? 1 - stepFraction : 0;
            return (
              <div
                key={i}
                className={`relative basis-0 overflow-hidden rounded-sm ${flashing ? "bg-current/25" : "bg-(--border)"}`}
                style={{ flexGrow: st.seconds, height: incline ? `${Math.max(18, ((h || 0) / max) * 100)}%` : "45%" }}
              >
                <div
                  className={`absolute inset-y-0 left-0 ${flashing ? "bg-current" : "bg-(--accent)"} transition-[width] duration-300 ease-linear`}
                  style={{ width: `${fill * 100}%` }}
                />
              </div>
            );
          })}
        </div>
      )}

      <div className="flex items-center gap-3">
        {steps.length > 1 && !doneAll && (
          <>
            <span className="num text-[20px] leading-none">{clock(remaining)}</span>
            <span className="label">total left</span>
          </>
        )}
        <div className="ml-auto flex gap-1.5">
          {running ? (
            <>
              {/* a short hold started by mistake: one tap back to the start */}
              {totalSeconds <= 180 && (
                <button type="button" onClick={restart} className="btn btn-ghost btn-sm">
                  Restart
                </button>
              )}
              <button type="button" onClick={pause} className="btn btn-secondary btn-sm">
                Pause
              </button>
            </>
          ) : (
            <>
              {started && (
                <button type="button" onClick={reset} className="btn btn-ghost btn-sm">
                  Reset
                </button>
              )}
              <button type="button" onClick={start} className="btn btn-primary btn-sm">
                {doneAll ? "Again" : started ? "Resume" : "Start timer"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// the current step's time drains out of the ring, smoothly between ticks.
// something to watch while a hold burns.
function Ring({
  fraction,
  label,
  final,
  done,
  inverted,
}: {
  fraction: number;
  label: string;
  final: boolean;
  done: boolean;
  inverted: boolean;
}) {
  const size = 112;
  const stroke = 9;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const f = Math.max(0, Math.min(1, fraction));
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className={inverted ? "stroke-current/25" : "stroke-(--border)"} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - f)}
          className={`${inverted ? "stroke-current" : done ? "stroke-(--ok)" : "stroke-(--accent)"} transition-[stroke-dashoffset] duration-300 ease-linear`}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        {done ? (
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" className="text-(--ok)" aria-hidden>
            <path d="M5 12.5l4.5 4.5L19 7.5" />
          </svg>
        ) : (
          <span className={`num text-[30px] leading-none ${final ? "timer-final" : ""}`}>{label}</span>
        )}
      </div>
    </div>
  );
}
