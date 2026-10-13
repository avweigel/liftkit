"use client";

import { useState } from "react";
import type { DayKind } from "@/lib/program/day-profile";
import { CardioTimer } from "./cardio-timer";
import {
  PULSE_MACHINES,
  defaultWarmup,
  warmupChoices,
  warmupItem,
  type WarmupItem,
  type WarmupSlot,
} from "@/lib/program/warmups";

type Picks = { pulse: string; mobility: string; drills: string[] };

// swaps become the new default for that kind of day on this phone, and
// check marks survive a refresh mid-workout
const prefKey = (kind: DayKind) => `liftkit.warmup.pref.${kind}`;
const doneKey = (sessionId: string) => `liftkit.warmup.done.${sessionId}`;

function readJson<T>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

function defaultPicks(kind: DayKind): Picks {
  const d = defaultWarmup(kind);
  return { pulse: d.pulse.id, mobility: d.mobility.id, drills: d.drills.map((x) => x.id) };
}

function loadPicks(kind: DayKind): Picks {
  const base = defaultPicks(kind);
  const saved = readJson<Partial<Picks>>(prefKey(kind));
  if (!saved) return base;
  return {
    pulse: saved.pulse && warmupItem("pulse", saved.pulse) ? saved.pulse : base.pulse,
    mobility: saved.mobility && warmupItem("mobility", saved.mobility) ? saved.mobility : base.mobility,
    drills:
      Array.isArray(saved.drills) && saved.drills.every((id) => warmupItem("drill", id))
        ? saved.drills
        : base.drills,
  };
}

// "3 x 6/side" is three rounds of 6/side. a dose with no rounds is one go.
function splitDose(dose: string | undefined): { rounds: number | null; per: string } {
  const m = (dose ?? "").match(/^\s*(\d+)\s*x\s*(.+)$/i);
  return m ? { rounds: Number(m[1]), per: m[2] } : { rounds: null, per: dose ?? "" };
}

export default function WarmupCard({
  kind,
  sessionId,
  standalone = false,
}: {
  kind: DayKind;
  sessionId: string;
  standalone?: boolean;
}) {
  const [open, setOpen] = useState(true);
  const [picks, setPicks] = useState<Picks>(() => loadPicks(kind));
  const [done, setDone] = useState<Set<string>>(
    () => new Set(readJson<string[]>(doneKey(sessionId)) ?? []),
  );
  const [swapping, setSwapping] = useState<string | null>(null);

  const updatePicks = (next: Picks) => {
    setPicks(next);
    writeJson(prefKey(kind), next);
  };

  const updateDone = (next: Set<string>) => {
    setDone(next);
    writeJson(doneKey(sessionId), [...next]);
  };

  const toggle = (key: string) => {
    const next = new Set(done);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    updateDone(next);
  };

  const markDone = (key: string) => {
    setDone((prev) => {
      const next = new Set(prev).add(key);
      writeJson(doneKey(sessionId), [...next]);
      return next;
    });
  };

  const pulse = warmupItem("pulse", picks.pulse)!;
  const mobility = warmupItem("mobility", picks.mobility)!;
  const drills = picks.drills.map((id) => warmupItem("drill", id)!);
  // the drills run as a superset: every drill back to back, then repeat
  const rounds = Math.max(1, ...drills.map((d) => splitDose(d.dose).rounds ?? 1));
  const roundsDone = Array.from({ length: rounds }, (_, i) => done.has(`round:${i + 1}`)).filter(Boolean).length;
  const complete =
    done.has("pulse") && done.has("mobility") && (drills.length === 0 || roundsDone >= rounds);

  const isDefault = JSON.stringify(picks) === JSON.stringify(defaultPicks(kind));

  const swap = (slot: WarmupSlot, index: number, id: string) => {
    if (slot === "pulse") {
      updatePicks({ ...picks, pulse: id });
      dropDone("pulse");
    } else if (slot === "mobility") {
      updatePicks({ ...picks, mobility: id });
      dropDone("mobility");
    } else {
      const old = picks.drills[index];
      const drillsNext = [...picks.drills];
      drillsNext[index] = id;
      updatePicks({ ...picks, drills: drillsNext });
      dropDone(`drill:${old}`);
    }
    setSwapping(null);
  };

  const dropDone = (key: string) => {
    if (!done.has(key)) return;
    const next = new Set(done);
    next.delete(key);
    updateDone(next);
  };

  const row = (slot: WarmupSlot, index: number, item: WarmupItem, key: string, checkable = true) => {
    const swapId = `${slot}:${index}`;
    const exclude = slot === "drill" ? new Set(picks.drills) : new Set([item.id]);
    return (
      <WarmupRow
        key={swapId}
        item={item}
        done={done.has(key)}
        onToggle={() => toggle(key)}
        onFinishTimer={() => markDone(key)}
        swapOpen={swapping === swapId}
        onSwap={() => setSwapping(swapping === swapId ? null : swapId)}
        choices={warmupChoices(slot).filter((c) => !exclude.has(c.id))}
        onPick={(id) => swap(slot, index, id)}
        checkable={checkable}
      />
    );
  };

  return (
    <section className={standalone ? "" : "card overflow-hidden"}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`flex min-h-14 w-full items-center gap-3 px-4 text-left ${standalone ? "hidden" : ""}`}
        aria-expanded={open}
      >
        <span className="display text-[21px]">Warm-up</span>
        <span className="label">About 10 min</span>
        {complete && <span className="chip chip-ok">Done</span>}
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className={`ml-auto text-(--muted) transition-transform ${open ? "rotate-180" : ""}`} aria-hidden>
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {(open || standalone) && (
        <div className={`space-y-4 ${standalone ? "" : "px-4 pb-4"}`}>
          <ul className="space-y-1.5">
            {row("pulse", 0, pulse, "pulse")}
            {row("mobility", 0, mobility, "mobility")}
          </ul>
          {drills.length > 0 && (
            <div className="space-y-2 rounded-xl border border-(--accent-line) p-3">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-[15px] font-semibold">Superset</span>
                <span className="label">
                  {rounds > 1 ? `${rounds} rounds, back to back` : "Once through"}
                </span>
              </div>
              <ul className="space-y-1.5">
                {drills.map((d, i) =>
                  row("drill", i, { ...d, dose: splitDose(d.dose).per }, `drill:${d.id}`, false),
                )}
              </ul>
              <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${rounds}, minmax(0, 1fr))` }}>
                {Array.from({ length: rounds }, (_, i) => {
                  const key = `round:${i + 1}`;
                  const on = done.has(key);
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => toggle(key)}
                      aria-pressed={on}
                      className={`flex h-12 items-center justify-center gap-1.5 rounded-xl text-[14px] font-semibold transition-colors ${
                        on ? "bg-(--ok-soft) text-(--ok)" : "bg-(--surface-2) text-(--muted)"
                      }`}
                    >
                      {on && (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                          <path d="M5 12.5l4.5 4.5L19 7.5" />
                        </svg>
                      )}
                      Round {i + 1}
                    </button>
                  );
                })}
              </div>
              <p className="text-[13px] text-(--muted)">Rest 30 to 60 seconds after each round.</p>
            </div>
          )}
          {kind === "metcon" && (
            <p className="text-[14px] text-(--muted)">
              Low on energy? Do the easy version: a 20 minute EMOM with half the reps, and skip the runs.
            </p>
          )}
          {!isDefault && (
            <button
              type="button"
              onClick={() => {
                updatePicks(defaultPicks(kind));
                setSwapping(null);
              }}
              className="text-[13px] font-semibold text-(--muted) underline underline-offset-2"
            >
              Go back to the suggested warm-up
            </button>
          )}
        </div>
      )}
    </section>
  );
}

function WarmupRow({
  item,
  done,
  onToggle,
  onFinishTimer,
  swapOpen,
  onSwap,
  choices,
  onPick,
  checkable = true,
}: {
  checkable?: boolean;
  item: WarmupItem;
  done: boolean;
  onToggle: () => void;
  onFinishTimer: () => void;
  swapOpen: boolean;
  onSwap: () => void;
  choices: WarmupItem[];
  onPick: (id: string) => void;
}) {
  return (
    <li className={`rounded-xl transition-colors ${done && checkable ? "bg-(--ok-soft)" : "bg-(--surface-2)"}`}>
      <div className="flex items-start">
        <button
          type="button"
          onClick={checkable ? onToggle : undefined}
          aria-pressed={checkable ? done : undefined}
          className={`flex min-h-12 flex-1 items-start gap-3 p-3 text-left ${checkable ? "" : "cursor-default"}`}
        >
          <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${checkable ? "" : "hidden"} ${done ? "bg-(--ok) text-(--surface)" : "border-2 border-(--border)"}`}>
            {done && (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M5 12.5l4.5 4.5L19 7.5" />
              </svg>
            )}
          </span>
          <span className="min-w-0">
            <span className="block font-semibold">{item.name}</span>
            {item.dose && <span className="num block text-[15px] text-(--muted)">{item.dose}</span>}
            {item.detail && <span className="block text-[13px] text-(--muted)">{item.detail}</span>}
          </span>
        </button>
        <button
          type="button"
          onClick={onSwap}
          aria-expanded={swapOpen}
          className={`mr-1 mt-1.5 h-10 shrink-0 rounded-lg px-3 text-[13px] font-semibold ${swapOpen ? "text-(--accent)" : "text-(--muted)"}`}
        >
          {swapOpen ? "Close" : "Swap"}
        </button>
      </div>
      {item.seconds != null && !done && !swapOpen && (
        <div className="px-3 pb-3">
          {item.chooser ? (
            <MachineChooser onPick={onPick} />
          ) : (
            <CardioTimer
              key={item.id}
              totalSeconds={item.seconds}
              steps={item.setting ? [{ label: item.setting, sub: item.cue, seconds: item.seconds }] : []}
              onComplete={onFinishTimer}
            />
          )}
        </div>
      )}
      {swapOpen && <SwapPicker choices={choices} onPick={onPick} />}
    </li>
  );
}

function MachineChooser({ onPick }: { onPick: (id: string) => void }) {
  return (
    <div className="space-y-2">
      <p className="label">Which machine?</p>
      <div className="grid grid-cols-3 gap-1.5">
        {PULSE_MACHINES.map((id) => {
          const m = warmupItem("pulse", id);
          if (!m) return null;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onPick(id)}
              className="flex min-h-12 items-center justify-center rounded-xl bg-(--surface) px-2 text-center text-[14px] font-semibold leading-tight"
            >
              {m.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}

const SHORT_LIST = 5;

export function SwapPicker({
  choices,
  onPick,
}: {
  choices: WarmupItem[];
  onPick: (id: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [showAll, setShowAll] = useState(false);
  const matches = query.trim() ? choices.filter((c) => looseMatch(query, c)) : choices;
  const visible = query.trim() || showAll ? matches : matches.slice(0, SHORT_LIST);
  const hidden = matches.length - visible.length;

  return (
    <div className="space-y-1 px-3 pb-3">
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search, like hips or bike"
        aria-label="Search warm-ups"
        enterKeyHint="search"
        autoComplete="off"
        className="mb-1 h-11 w-full rounded-lg border border-(--border) bg-(--background) px-3 text-[16px] outline-none placeholder:text-(--faint) focus:border-(--accent-line)"
      />
      {visible.map((c) => (
        <button
          key={c.id}
          type="button"
          onClick={() => onPick(c.id)}
          className="flex min-h-11 w-full items-center justify-between gap-3 rounded-lg bg-(--surface) px-3 py-2 text-left"
        >
          <span className="text-[14px] font-semibold">{c.name}</span>
          {c.dose && <span className="num shrink-0 text-[14px] text-(--muted)">{c.dose}</span>}
        </button>
      ))}
      {visible.length === 0 && (
        <p className="py-2 text-[14px] text-(--muted)">Nothing matches. Try a shorter word.</p>
      )}
      {hidden > 0 && (
        <button
          type="button"
          onClick={() => setShowAll(true)}
          className="h-10 w-full text-[14px] font-semibold text-(--accent)"
        >
          Show {hidden} more
        </button>
      )}
    </div>
  );
}

const words = (text: string) =>
  text.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().split(" ").filter(Boolean);

// every typed word has to hit something: part of a word, or the word with
// one typo once it's long enough to tell ("swigns" still finds swings)
function looseMatch(query: string, item: WarmupItem): boolean {
  const hay = words(`${item.name} ${item.detail ?? ""} ${item.tags ?? ""}`);
  return words(query).every((q) =>
    hay.some((w) => w.includes(q) || (q.length >= 4 && withinOne(q, w.slice(0, q.length + 1)))),
  );
}

// edit distance where swapping two neighbouring letters counts as one typo
function withinOne(a: string, b: string): boolean {
  if (Math.abs(a.length - b.length) > 1) return false;
  const d = Array.from({ length: a.length + 1 }, (_, i) =>
    Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)),
  );
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
    }
  }
  return d[a.length][b.length] <= 1;
}
