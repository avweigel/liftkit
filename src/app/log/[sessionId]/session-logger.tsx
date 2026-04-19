"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  deleteSessionSet,
  finishSession,
  upsertSessionSet,
} from "@/lib/actions/sessions";
import { groupIntoSupersets, parseSetCode } from "@/lib/set-code";

type LastSessionSet = {
  set_number: number;
  weight: number | null;
  reps: number;
};

type Exercise = {
  id: string;
  order_index: number;
  exercise_id: string;
  name: string;
  prescribed_sets: number;
  prescribed_reps: string;
  prescribed_weight: number | null;
  rest_seconds: number | null;
  notes: string | null;
  last_session: {
    logged_at: string;
    sets: LastSessionSet[];
  } | null;
};

type SessionSet = {
  id: string;
  exercise_id: string;
  set_number: number;
  weight: number | null;
  reps: number;
  rpe: number | null;
  is_warmup: boolean;
  notes: string | null;
};

type Props = {
  sessionId: string;
  finished: boolean;
  initialNotes: string;
  exercises: Exercise[];
  initialSets: SessionSet[];
};

export function SessionLogger({
  sessionId,
  finished,
  initialNotes,
  exercises,
  initialSets,
}: Props) {
  const [sets, setSets] = useState<SessionSet[]>(initialSets);
  const [notes, setNotes] = useState(initialNotes);
  const [restOn, setRestOn] = useState(false);
  const [restSecondsLeft, setRestSecondsLeft] = useState<number | null>(null);
  const [pending, startTransition] = useTransition();

  const restTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    if (restSecondsLeft === null) return;
    if (restTimerRef.current) clearInterval(restTimerRef.current);
    restTimerRef.current = setInterval(() => {
      setRestSecondsLeft((s) => {
        if (s === null) return null;
        if (s <= 1) {
          if (restTimerRef.current) clearInterval(restTimerRef.current);
          return null;
        }
        return s - 1;
      });
    }, 1000);
    return () => {
      if (restTimerRef.current) clearInterval(restTimerRef.current);
    };
  }, [restSecondsLeft !== null]);

  const totalSets = useMemo(
    () => exercises.reduce((n, ex) => n + ex.prescribed_sets, 0),
    [exercises],
  );
  const workingSetsLogged = useMemo(
    () => sets.filter((s) => !s.is_warmup).length,
    [sets],
  );

  const groups = useMemo(
    () =>
      groupIntoSupersets(
        exercises.map((e) => ({
          id: e.id,
          order_index: e.order_index,
          notes: e.notes,
          _ex: e,
        })),
      ),
    [exercises],
  );

  const upsert = async (
    exerciseId: string,
    set: {
      id: string | null;
      set_number: number;
      weight: number | null;
      reps: number;
      rpe: number | null;
      is_warmup: boolean;
      notes: string | null;
    },
  ) => {
    const { id } = await upsertSessionSet(sessionId, set.id, {
      exercise_id: exerciseId,
      set_number: set.set_number,
      weight: set.weight,
      reps: set.reps,
      rpe: set.rpe,
      is_warmup: set.is_warmup,
      notes: set.notes,
    });
    setSets((prev) => {
      const filtered = prev.filter(
        (s) =>
          !(set.id && s.id === set.id) &&
          !(s.exercise_id === exerciseId && s.set_number === set.set_number),
      );
      return [
        ...filtered,
        {
          id,
          exercise_id: exerciseId,
          set_number: set.set_number,
          weight: set.weight,
          reps: set.reps,
          rpe: set.rpe,
          is_warmup: set.is_warmup,
          notes: set.notes,
        },
      ];
    });
    if (restOn && !set.is_warmup) {
      const restFor =
        exercises.find((e) => e.exercise_id === exerciseId)?.rest_seconds ??
        60;
      setRestSecondsLeft(Math.max(15, restFor));
    }
    return id;
  };

  const del = async (setId: string) => {
    await deleteSessionSet(sessionId, setId);
    setSets((prev) => prev.filter((s) => s.id !== setId));
  };

  const finish = () => {
    startTransition(async () => {
      await finishSession(sessionId, notes);
    });
  };

  return (
    <div className="space-y-4 pb-24">
      <ProgressHeader
        done={workingSetsLogged}
        total={totalSets}
        restOn={restOn}
        onToggleRest={() => setRestOn((v) => !v)}
        finished={finished}
      />

      {exercises.length === 0 && (
        <p className="rounded-lg border border-dashed border-(--border) p-6 text-center text-sm text-(--muted)">
          no exercises on this day.
        </p>
      )}

      <div className="space-y-3">
        {groups.map((g) => {
          const isSuperset = g.items.length > 1 && g.letter;
          return (
            <div key={g.id} className="space-y-1.5">
              {isSuperset && (
                <div className="flex items-center gap-2 px-1 text-[11px] font-semibold uppercase tracking-wider text-(--accent)">
                  <span className="inline-block h-1 w-1 rounded-full bg-(--accent)" />
                  superset {g.letter}
                </div>
              )}
              <div
                className={
                  isSuperset
                    ? "space-y-2 rounded-xl border-2 border-(--accent)/25 p-1.5"
                    : "space-y-2"
                }
              >
                {g.items.map((item) => (
                  <ExerciseCard
                    key={item._ex.id}
                    exercise={item._ex}
                    sets={sets
                      .filter((s) => s.exercise_id === item._ex.exercise_id)
                      .sort((a, b) => a.set_number - b.set_number)}
                    onUpsert={(set) => upsert(item._ex.exercise_id, set)}
                    onDelete={del}
                    finished={finished}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {!finished && (
        <div className="space-y-1 rounded-xl border border-(--border) bg-(--surface) p-3">
          <label className="block space-y-1 text-xs">
            <span className="text-(--muted)">session notes</span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="how it felt, weight jumps, anything to remember"
              className="w-full resize-y rounded border border-(--border) bg-(--background) px-2 py-1 text-sm outline-none focus:border-(--accent)"
            />
          </label>
        </div>
      )}

      {!finished && (
        <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-(--border) bg-(--background)/95 backdrop-blur">
          <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3 sm:px-6">
            <button
              type="button"
              onClick={finish}
              disabled={pending}
              className="h-12 flex-1 rounded-xl bg-(--accent) text-base font-semibold text-(--accent-contrast) shadow-sm active:scale-[0.99] disabled:opacity-60"
            >
              {pending ? "finishing…" : "finish workout"}
            </button>
          </div>
        </div>
      )}

      {restOn && restSecondsLeft !== null && (
        <button
          type="button"
          onClick={() => setRestSecondsLeft(null)}
          className="fixed bottom-20 left-1/2 z-30 -translate-x-1/2 rounded-full bg-(--foreground) px-5 py-2 text-sm font-semibold text-(--background) shadow-lg tabular-nums"
        >
          rest · {formatRest(restSecondsLeft)}
        </button>
      )}
    </div>
  );
}

function ProgressHeader({
  done,
  total,
  restOn,
  onToggleRest,
  finished,
}: {
  done: number;
  total: number;
  restOn: boolean;
  onToggleRest: () => void;
  finished: boolean;
}) {
  const pct = total === 0 ? 0 : Math.min(100, (done / total) * 100);
  return (
    <div className="space-y-2 rounded-xl border border-(--border) bg-(--surface) p-3">
      <div className="flex items-end justify-between gap-2">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wider text-(--muted)">
            progress
          </div>
          <div className="text-xl font-semibold tabular-nums">
            {done}
            <span className="text-(--muted)"> / {total}</span>
          </div>
        </div>
        {!finished && (
          <label className="inline-flex cursor-pointer items-center gap-2 text-xs text-(--muted)">
            <span>rest timer</span>
            <span
              onClick={onToggleRest}
              className={`relative inline-block h-5 w-9 rounded-full transition ${restOn ? "bg-(--accent)" : "bg-(--border)"}`}
            >
              <span
                className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition ${restOn ? "left-[18px]" : "left-0.5"}`}
              />
            </span>
          </label>
        )}
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-(--border)">
        <div
          className="h-full bg-(--accent) transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function ExerciseCard({
  exercise,
  sets,
  onUpsert,
  onDelete,
  finished,
}: {
  exercise: Exercise;
  sets: SessionSet[];
  onUpsert: (set: {
    id: string | null;
    set_number: number;
    weight: number | null;
    reps: number;
    rpe: number | null;
    is_warmup: boolean;
    notes: string | null;
  }) => Promise<string>;
  onDelete: (setId: string) => Promise<void>;
  finished: boolean;
}) {
  const { cleanNotes } = parseSetCode(exercise.notes);
  const [expandedSetNumber, setExpandedSetNumber] = useState<number | null>(
    null,
  );

  const rows: Array<{ setNumber: number; logged: SessionSet | null }> = [];
  const maxPrescribed = Math.max(
    exercise.prescribed_sets,
    ...sets.map((s) => s.set_number),
    0,
  );
  for (let n = 1; n <= maxPrescribed; n++) {
    rows.push({
      setNumber: n,
      logged: sets.find((s) => s.set_number === n) ?? null,
    });
  }

  const lastForSet = (n: number): LastSessionSet | null => {
    if (!exercise.last_session) return null;
    return (
      exercise.last_session.sets.find((s) => s.set_number === n) ?? null
    );
  };

  const suggestedForSet = (n: number) => {
    const previousInSession =
      sets.find((s) => s.set_number === n - 1) ??
      sets[sets.length - 1] ??
      null;
    if (previousInSession) {
      return {
        weight: previousInSession.weight,
        reps: previousInSession.reps,
      };
    }
    const last = lastForSet(n);
    if (last) return { weight: last.weight, reps: last.reps };
    return {
      weight: exercise.prescribed_weight,
      reps: firstNumber(exercise.prescribed_reps),
    };
  };

  return (
    <section className="space-y-2 rounded-xl border border-(--border) bg-(--background) p-3">
      <header className="space-y-1">
        <div className="flex items-start justify-between gap-2">
          <Link
            href={`/exercises/${exercise.exercise_id}`}
            className="text-base font-bold leading-tight hover:underline"
          >
            {exercise.name}
          </Link>
          <span className="shrink-0 text-xs text-(--muted) tabular-nums">
            {exercise.prescribed_sets}×{exercise.prescribed_reps}
            {exercise.prescribed_weight !== null
              ? ` @ ${exercise.prescribed_weight}`
              : ""}
          </span>
        </div>
        {exercise.last_session && (
          <div className="text-xs text-(--muted)">
            <span className="font-semibold text-(--foreground)/70">last</span>
            <span className="ml-1">
              ({relativeDays(exercise.last_session.logged_at)}):{" "}
              {exercise.last_session.sets
                .map((s) => `${s.weight ?? "bw"}×${s.reps}`)
                .join("  ")}
            </span>
          </div>
        )}
        {cleanNotes && (
          <p className="text-xs text-(--muted)">{cleanNotes}</p>
        )}
      </header>

      <ul className="space-y-1">
        {rows.map((r) => {
          const expanded = expandedSetNumber === r.setNumber;
          const suggested = suggestedForSet(r.setNumber);
          const lastSameSet = lastForSet(r.setNumber);
          return (
            <li key={r.setNumber}>
              {r.logged && !expanded ? (
                <LoggedRow
                  set={r.logged}
                  onTap={() =>
                    !finished && setExpandedSetNumber(r.setNumber)
                  }
                />
              ) : expanded ? (
                <SetEditor
                  setNumber={r.setNumber}
                  initialWeight={
                    r.logged?.weight ?? suggested.weight ?? null
                  }
                  initialReps={
                    r.logged?.reps ?? suggested.reps ?? null
                  }
                  initialIsWarmup={r.logged?.is_warmup ?? false}
                  finished={finished}
                  showDelete={!!r.logged}
                  onSave={async (state) => {
                    await onUpsert({
                      id: r.logged?.id ?? null,
                      set_number: r.setNumber,
                      weight: state.weight,
                      reps: state.reps,
                      rpe: r.logged?.rpe ?? null,
                      is_warmup: state.is_warmup,
                      notes: r.logged?.notes ?? null,
                    });
                    setExpandedSetNumber(null);
                  }}
                  onCancel={() => setExpandedSetNumber(null)}
                  onDelete={
                    r.logged
                      ? async () => {
                          await onDelete(r.logged!.id);
                          setExpandedSetNumber(null);
                        }
                      : undefined
                  }
                />
              ) : (
                <EmptyRow
                  setNumber={r.setNumber}
                  lastSameSet={lastSameSet}
                  onTap={() =>
                    !finished && setExpandedSetNumber(r.setNumber)
                  }
                  disabled={finished}
                />
              )}
            </li>
          );
        })}
        {!finished && (
          <li>
            <button
              type="button"
              onClick={() =>
                setExpandedSetNumber(
                  Math.max(exercise.prescribed_sets, ...sets.map((s) => s.set_number), 0) + 1,
                )
              }
              className="h-8 w-full rounded border border-dashed border-(--border) text-xs text-(--muted) hover:text-(--accent) hover:border-(--accent)"
            >
              + add set
            </button>
          </li>
        )}
      </ul>
    </section>
  );
}

function LoggedRow({
  set,
  onTap,
}: {
  set: SessionSet;
  onTap: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onTap}
      className="grid w-full grid-cols-[24px,1fr,auto] items-center gap-2 rounded-md border border-(--border) bg-(--accent-soft) px-2.5 py-2 text-left"
    >
      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-(--accent) text-[11px] font-bold text-(--accent-contrast)">
        ✓
      </span>
      <span className="text-sm text-(--muted)">
        set {set.set_number}
        {set.is_warmup && (
          <span className="ml-1.5 rounded bg-(--border) px-1 text-[9px] uppercase tracking-wider text-(--muted)">
            warmup
          </span>
        )}
      </span>
      <span className="text-sm font-bold tabular-nums">
        {set.weight ?? "bw"} <span className="text-(--muted)">×</span>{" "}
        {set.reps}
      </span>
    </button>
  );
}

function EmptyRow({
  setNumber,
  lastSameSet,
  onTap,
  disabled,
}: {
  setNumber: number;
  lastSameSet: LastSessionSet | null;
  onTap: () => void;
  disabled: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onTap}
      disabled={disabled}
      className="grid w-full grid-cols-[24px,1fr,auto] items-center gap-2 rounded-md border border-(--border) px-2.5 py-2 text-left text-(--muted) hover:border-(--accent) active:bg-(--accent-soft) disabled:opacity-60"
    >
      <span className="flex h-5 w-5 items-center justify-center rounded-full border border-(--border) text-[11px]">
        {setNumber}
      </span>
      <span className="text-sm">set {setNumber}</span>
      <span className="text-xs tabular-nums">
        {lastSameSet
          ? `${lastSameSet.weight ?? "bw"} × ${lastSameSet.reps}`
          : "tap to log"}
      </span>
    </button>
  );
}

function SetEditor({
  setNumber,
  initialWeight,
  initialReps,
  initialIsWarmup,
  finished,
  showDelete = false,
  onSave,
  onCancel,
  onDelete,
}: {
  setNumber: number;
  initialWeight: number | null;
  initialReps: number | null;
  initialIsWarmup: boolean;
  finished: boolean;
  showDelete?: boolean;
  onSave: (state: {
    weight: number | null;
    reps: number;
    is_warmup: boolean;
  }) => Promise<void>;
  onCancel?: () => void;
  onDelete?: () => Promise<void>;
}) {
  const [weight, setWeight] = useState<string>(
    initialWeight === null ? "" : String(initialWeight),
  );
  const [reps, setReps] = useState<string>(
    initialReps === null ? "" : String(initialReps),
  );
  const [isWarmup, setIsWarmup] = useState(initialIsWarmup);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    const weightNum = weight.trim() === "" ? null : Number(weight);
    const repsNum = Number(reps);
    if (!Number.isInteger(repsNum) || repsNum < 0) {
      setError("enter reps");
      return;
    }
    if (weightNum !== null && !Number.isFinite(weightNum)) {
      setError("invalid weight");
      return;
    }
    setSaving(true);
    try {
      await onSave({ weight: weightNum, reps: repsNum, is_warmup: isWarmup });
    } catch (e) {
      setError(e instanceof Error ? e.message : "save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-lg border-2 border-(--accent) bg-(--accent-soft) p-2">
      <div className="mb-2 flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-(--muted)">
        <span>set {setNumber}</span>
        <label className="flex items-center gap-1.5 normal-case text-xs font-normal">
          <input
            type="checkbox"
            checked={isWarmup}
            onChange={(e) => setIsWarmup(e.target.checked)}
            className="h-4 w-4 accent-(--accent)"
          />
          warmup
        </label>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Stepper
          label="weight"
          value={weight}
          onChange={setWeight}
          step={5}
          allowEmpty
          disabled={finished}
        />
        <Stepper
          label="reps"
          value={reps}
          onChange={setReps}
          step={1}
          integer
          disabled={finished}
        />
      </div>

      <div className="mt-2 flex gap-2">
        <button
          type="button"
          onClick={submit}
          disabled={saving || finished}
          className="h-10 flex-1 rounded-md bg-(--accent) text-sm font-semibold text-(--accent-contrast) active:scale-[0.99] disabled:opacity-60"
        >
          {saving ? "saving…" : "log set"}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="h-10 rounded-md border border-(--border) bg-(--background) px-3 text-sm text-(--muted)"
          >
            cancel
          </button>
        )}
        {showDelete && onDelete && (
          <button
            type="button"
            onClick={onDelete}
            className="h-10 rounded-md border border-(--border) bg-(--background) px-3 text-sm text-red-600 dark:text-red-400"
            aria-label="delete set"
          >
            ✕
          </button>
        )}
      </div>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

function Stepper({
  label,
  value,
  onChange,
  step,
  integer = false,
  allowEmpty = false,
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  step: number;
  integer?: boolean;
  allowEmpty?: boolean;
  disabled?: boolean;
}) {
  const current = Number(value);
  const hasValue = value.trim() !== "" && Number.isFinite(current);

  const bump = (dir: 1 | -1) => {
    const base = hasValue ? current : 0;
    const next = base + dir * step;
    if (next < 0 && !allowEmpty) return;
    const formatted = integer
      ? String(Math.max(0, Math.trunc(next)))
      : String(next);
    onChange(formatted);
  };

  return (
    <div className="space-y-0.5">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-(--muted)">
        {label}
      </div>
      <div className="grid grid-cols-[auto,1fr,auto] items-stretch rounded-md border border-(--border) bg-(--background)">
        <button
          type="button"
          onClick={() => bump(-1)}
          disabled={disabled}
          className="flex h-10 w-10 items-center justify-center rounded-l-md text-lg font-semibold text-(--muted) active:bg-(--accent-soft) disabled:opacity-40"
          aria-label={`decrease ${label}`}
        >
          −
        </button>
        <input
          type="text"
          inputMode={integer ? "numeric" : "decimal"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          placeholder={allowEmpty ? "bw" : "0"}
          className="h-10 w-full border-x border-(--border) bg-transparent text-center text-xl font-bold tabular-nums outline-none focus:bg-(--background) disabled:opacity-60"
        />
        <button
          type="button"
          onClick={() => bump(+1)}
          disabled={disabled}
          className="flex h-10 w-10 items-center justify-center rounded-r-md text-lg font-semibold text-(--muted) active:bg-(--accent-soft) disabled:opacity-40"
          aria-label={`increase ${label}`}
        >
          +
        </button>
      </div>
    </div>
  );
}

function firstNumber(s: string): number | null {
  const m = s.match(/(\d+)/);
  return m ? Number(m[1]) : null;
}

function relativeDays(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const days = Math.floor(ms / 86400000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.round(days / 7)}w ago`;
  return `${Math.round(days / 30)}mo ago`;
}

function formatRest(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
