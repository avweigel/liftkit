"use client";

import { useEffect, useRef, useState } from "react";
import { chime } from "@/lib/display/chime";
import type { DayKind } from "@/lib/program/day-profile";
import {
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

export default function WarmupCard({
  kind,
  sessionId,
}: {
  kind: DayKind;
  sessionId: string;
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
  const drillsDone = drills.filter((d) => done.has(`drill:${d.id}`)).length;
  const complete =
    done.has("pulse") && done.has("mobility") && (drills.length === 0 || drillsDone >= 2);

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

  const row = (slot: WarmupSlot, index: number, item: WarmupItem, key: string) => {
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
      />
    );
  };

  return (
    <section className="card overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex min-h-14 w-full items-center gap-3 px-4 text-left"
        aria-expanded={open}
      >
        <span className="display text-[21px]">Warm-up</span>
        <span className="label">About 10 min</span>
        {complete && <span className="chip chip-ok">Done</span>}
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className={`ml-auto text-(--muted) transition-transform ${open ? "rotate-180" : ""}`} aria-hidden>
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {open && (
        <div className="space-y-4 px-4 pb-4">
          <ul className="space-y-1.5">
            {row("pulse", 0, pulse, "pulse")}
            {row("mobility", 0, mobility, "mobility")}
          </ul>
          {drills.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-baseline justify-between">
                <span className="text-[15px] font-semibold">Then 2 or 3 of these</span>
                <span className="label">
                  <span className="num text-[14px] text-(--foreground)">{drillsDone}</span> of {drills.length} done
                </span>
              </div>
              <ul className="space-y-1.5">
                {drills.map((d, i) => row("drill", i, d, `drill:${d.id}`))}
              </ul>
              <p className="text-[13px] text-(--muted)">Rest 30 to 60 seconds between sets.</p>
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
}: {
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
    <li className={`rounded-xl transition-colors ${done ? "bg-(--ok-soft)" : "bg-(--surface-2)"}`}>
      <div className="flex items-start">
        <button
          type="button"
          onClick={onToggle}
          aria-pressed={done}
          className="flex min-h-12 flex-1 items-start gap-3 p-3 text-left"
        >
          <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${done ? "bg-(--ok) text-(--surface)" : "border-2 border-(--border)"}`}>
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
        <WarmupTimer seconds={item.seconds} onFinish={onFinishTimer} />
      )}
      {swapOpen && <SwapPicker choices={choices} onPick={onPick} />}
    </li>
  );
}

const SHORT_LIST = 5;

function SwapPicker({
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

// counts down from an end timestamp rather than ticking a counter, so a
// locked phone or a backgrounded tab still finishes on time
function WarmupTimer({
  seconds,
  onFinish,
}: {
  seconds: number;
  onFinish: () => void;
}) {
  const [endAt, setEndAt] = useState<number | null>(null);
  const [leftMs, setLeftMs] = useState(seconds * 1000);
  const [now, setNow] = useState(() => Date.now());
  const finishRef = useRef(onFinish);
  useEffect(() => {
    finishRef.current = onFinish;
  }, [onFinish]);
  const audioRef = useRef<AudioContext | null>(null);
  const wakeRef = useRef<{ release: () => Promise<void> } | null>(null);

  const running = endAt != null;
  const remaining = running ? Math.max(0, endAt - now) : leftMs;
  const started = running || leftMs < seconds * 1000;

  useEffect(() => {
    if (endAt == null) return;
    const id = setInterval(() => {
      const t = Date.now();
      setNow(t);
      if (t >= endAt) {
        clearInterval(id);
        setEndAt(null);
        setLeftMs(seconds * 1000);
        chime(audioRef.current);
        finishRef.current();
      }
    }, 250);
    return () => clearInterval(id);
  }, [endAt, seconds]);

  useEffect(() => {
    return () => {
      wakeRef.current?.release().catch(() => {});
    };
  }, []);

  const start = () => {
    // the audio context has to be created inside a tap for iOS to allow sound later
    try {
      const Ctx =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (Ctx && !audioRef.current) audioRef.current = new Ctx();
      audioRef.current?.resume().catch(() => {});
    } catch {}
    const nav = navigator as Navigator & {
      wakeLock?: { request: (type: "screen") => Promise<{ release: () => Promise<void> }> };
    };
    nav.wakeLock
      ?.request("screen")
      .then((lock) => {
        wakeRef.current = lock;
      })
      .catch(() => {});
    const t = Date.now();
    setNow(t);
    setEndAt(t + leftMs);
  };

  const pause = () => {
    setLeftMs(remaining);
    setEndAt(null);
    wakeRef.current?.release().catch(() => {});
    wakeRef.current = null;
  };

  const reset = () => {
    setEndAt(null);
    setLeftMs(seconds * 1000);
  };

  const total = Math.ceil(remaining / 1000);
  const label = `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
  const progress = 1 - remaining / (seconds * 1000);

  return (
    <div className="px-3 pb-3 pl-12">
      {!started ? (
        <button type="button" onClick={start} className="btn btn-secondary btn-sm">
          Start {label} timer
        </button>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <span className="num text-[34px] leading-none" aria-live="off">
              {label}
            </span>
            <div className="ml-auto flex gap-1.5">
              {running ? (
                <button type="button" onClick={pause} className="btn btn-secondary btn-sm">
                  Pause
                </button>
              ) : (
                <>
                  <button type="button" onClick={reset} className="btn btn-ghost btn-sm">
                    Reset
                  </button>
                  <button type="button" onClick={start} className="btn btn-secondary btn-sm">
                    Resume
                  </button>
                </>
              )}
            </div>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-(--border)">
            <div
              className="h-full rounded-full bg-(--accent)"
              style={{ width: `${Math.min(100, progress * 100)}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
