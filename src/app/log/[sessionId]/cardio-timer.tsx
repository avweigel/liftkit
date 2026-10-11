"use client";

import { useEffect, useRef, useState } from "react";
import { chime, keepAwake, unlockAudio } from "@/lib/display/chime";

export type CardioStep = { label: string; seconds: number };

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
    .map((v) => ({ label: `${v}%`, seconds: each }));
  return { totalSeconds: steps.reduce((t, s) => t + s.seconds, 0), steps };
}

export function CardioTimer({
  totalSeconds,
  steps,
}: {
  totalSeconds: number;
  steps: CardioStep[];
}) {
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
      if (t >= endAt) {
        clearInterval(id);
        setEndAt(null);
        setLeftMs(0);
        setDoneAll(true);
        chime(audioRef.current, 3);
        wakeRef.current?.release().catch(() => {});
        wakeRef.current = null;
      }
    }, 250);
    return () => clearInterval(id);
  }, [endAt]);

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

  return (
    <div
      className={`space-y-3 rounded-xl p-3 transition-colors duration-200 ${
        flashing ? "timer-flash bg-(--accent) text-(--accent-contrast)" : "bg-(--surface-2)"
      }`}
    >
      {flashing && current && (
        <p className="display text-center text-[22px]">Change to {current.label}</p>
      )}
      {steps.length > 0 && (
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="label">{started && !doneAll ? "Incline now" : "Starts at"}</p>
            <p className={`num text-[40px] leading-none ${flashing ? "" : "text-(--accent)"}`}>{current?.label}</p>
          </div>
          {next && !doneAll && (
            <div className="text-right">
              <p className="label">Next {next.label}</p>
              <p className="num text-[22px] leading-none">{started ? clock(stepEndsIn) : clock((current?.seconds ?? 0) * 1000)}</p>
            </div>
          )}
        </div>
      )}

      {steps.length > 0 && (
        <div className="flex h-10 items-end gap-0.5" aria-hidden>
          {steps.map((s, i) => {
            const h = Number.parseFloat(s.label);
            const max = Math.max(...steps.map((x) => Number.parseFloat(x.label) || 0), 1);
            return (
              <div
                key={i}
                className={`flex-1 rounded-sm ${i < stepIndex || doneAll ? "bg-(--accent-line)" : i === stepIndex && started ? "bg-(--accent)" : "bg-(--border)"}`}
                style={{ height: `${Math.max(15, ((h || 0) / max) * 100)}%` }}
              />
            );
          })}
        </div>
      )}

      <div className="flex items-center gap-3">
        <span className="num text-[28px] leading-none">{doneAll ? "Done" : clock(remaining)}</span>
        <span className="label">{doneAll ? "" : "left"}</span>
        <div className="ml-auto flex gap-1.5">
          {running ? (
            <button type="button" onClick={pause} className="btn btn-secondary btn-sm">
              Pause
            </button>
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
