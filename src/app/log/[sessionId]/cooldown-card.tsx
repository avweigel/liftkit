"use client";

import { useState } from "react";
import type { DayKind } from "@/lib/program/day-profile";
import {
  cooldownChoices,
  cooldownItem,
  cooldownSeconds,
  preferredCooldown,
} from "@/lib/program/cooldowns";
import { CardioTimer } from "./cardio-timer";
import { SwapPicker } from "./warmup-card";

type Saved = { pick?: string; state?: "done" | "skipped" };

// your pick sticks for that kind of day on this phone, like the warm-up.
// done or skipped is remembered per session so a refresh keeps it.
const prefKey = (kind: DayKind) => `liftkit.cooldown.pref.${kind}`;
const stateKey = (sessionId: string) => `liftkit.cooldown.state.${sessionId}`;

function read(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string | null) {
  try {
    if (value == null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {}
}

export default function CooldownCard({
  kind,
  sessionId,
  standalone = false,
  onDone,
  onSkip,
}: {
  kind: DayKind;
  sessionId: string;
  standalone?: boolean;
  onDone?: () => void;
  onSkip?: () => void;
}) {
  const preferred = preferredCooldown(kind);
  const [pickId, setPickId] = useState(() => {
    const saved = read(prefKey(kind));
    return saved && cooldownItem(saved) ? saved : preferred.id;
  });
  const [state, setState] = useState<Saved["state"] | null>(() => {
    const v = read(stateKey(sessionId));
    return v === "done" || v === "skipped" ? v : null;
  });
  const [swapping, setSwapping] = useState(false);
  const [open, setOpen] = useState(true);

  const item = cooldownItem(pickId) ?? preferred;
  const total = cooldownSeconds(item);

  const pick = (id: string) => {
    setPickId(id);
    write(prefKey(kind), id === preferred.id ? null : id);
    setSwapping(false);
  };

  const mark = (next: Saved["state"] | null) => {
    setState(next);
    write(stateKey(sessionId), next ?? null);
    if (next === "done") onDone?.();
    if (next === "skipped") onSkip?.();
  };

  if (state === "skipped" && !standalone) {
    return (
      <section className="card flex min-h-14 items-center gap-3 px-4">
        <span className="display text-[21px]">Cooldown</span>
        <span className="label">Skipped today</span>
        <button type="button" onClick={() => mark(null)} className="btn btn-ghost btn-sm ml-auto">
          Undo
        </button>
      </section>
    );
  }

  return (
    <section className={standalone ? "" : "card overflow-hidden"}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`flex min-h-14 w-full items-center gap-3 px-4 text-left ${standalone ? "hidden" : ""}`}
        aria-expanded={open}
      >
        <span className="display text-[21px]">Cooldown</span>
        <span className="label">{item.dose}</span>
        {state === "done" && <span className="chip chip-ok">Done</span>}
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className={`ml-auto text-(--muted) transition-transform ${open ? "rotate-180" : ""}`} aria-hidden>
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {(open || standalone) && (
        <div className={`space-y-3 ${standalone ? "" : "px-4 pb-4"}`}>
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold">{item.name}</span>
                {item.id === preferred.id && <span className="chip chip-accent">Best today</span>}
              </div>
              {item.detail && <p className="mt-0.5 text-[13px] text-(--muted)">{item.detail}</p>}
            </div>
            <button
              type="button"
              onClick={() => setSwapping((v) => !v)}
              aria-expanded={swapping}
              className={`h-10 shrink-0 rounded-lg px-3 text-[13px] font-semibold ${swapping ? "text-(--accent)" : "text-(--muted)"}`}
            >
              {swapping ? "Close" : "Swap"}
            </button>
          </div>

          {swapping ? (
            <div className="-mx-3 rounded-xl bg-(--surface-2) pt-3">
              <SwapPicker
                choices={cooldownChoices().filter((c) => c.id !== item.id)}
                onPick={pick}
              />
            </div>
          ) : state === "done" ? (
            <button type="button" onClick={() => mark(null)} className="text-[13px] font-semibold text-(--muted) underline underline-offset-2">
              Not done yet
            </button>
          ) : (
            <CardioTimer
              key={item.id}
              persistKey={`liftkit.cooldown.timer.${item.id}.${new Date().toISOString().slice(0, 10)}`}
              totalSeconds={total}
              steps={item.steps}
              onComplete={() => mark("done")}
            />
          )}

          {!swapping && state !== "done" && (
            <div className="flex gap-2">
              <button type="button" onClick={() => mark("done")} className="btn btn-secondary btn-sm flex-1">
                Mark done
              </button>
              <button type="button" onClick={() => mark("skipped")} className="btn btn-ghost btn-sm flex-1">
                Skip today
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
