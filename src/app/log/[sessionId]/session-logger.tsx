"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  deleteSessionSet,
  finishSession,
  updateSession,
  upsertSessionSet,
} from "@/lib/actions/sessions";
import { groupIntoSupersets, parseSetCode } from "@/lib/set-code";
import { formatRxReps, repTargetForSet } from "@/lib/display/reps";

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
    <div className="space-y-3 pb-28">
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

      {!finished && sets.length === 0 && exercises.length > 0 && (
        <div className="rounded-lg border border-(--accent)/30 bg-(--accent-soft) p-3 text-xs text-(--foreground)/80">
          <div className="font-bold text-(--accent)">how to log</div>
          <ul className="mt-1 space-y-0.5">
            <li>
              tap the big{" "}
              <span className="font-bold text-(--accent)">✓</span> to log a
              set with the pre-filled weight × reps.
            </li>
            <li>tap the numbers to adjust first, then log.</li>
            <li>tap a logged row to edit or delete it.</li>
            <li>
              when you&rsquo;re done for the day, tap{" "}
              <span className="font-semibold">finish workout</span> at the
              bottom.
            </li>
          </ul>
        </div>
      )}

      <div className="space-y-4">
        {groups.map((g) => {
          const isSuperset = g.items.length > 1 && !!g.letter;
          if (!isSuperset) {
            const item = g.items[0];
            return (
              <SoloExerciseCard
                key={item._ex.id}
                exercise={item._ex}
                sets={sets
                  .filter((s) => s.exercise_id === item._ex.exercise_id)
                  .sort((a, b) => a.set_number - b.set_number)}
                onUpsert={(set) => upsert(item._ex.exercise_id, set)}
                onDelete={del}
                finished={false}
              />
            );
          }
          return (
            <SupersetBlock
              key={g.id}
              letter={g.letter!}
              exercises={g.items.map((it) => it._ex)}
              setsByExercise={Object.fromEntries(
                g.items.map((it) => [
                  it._ex.exercise_id,
                  sets
                    .filter((s) => s.exercise_id === it._ex.exercise_id)
                    .sort((a, b) => a.set_number - b.set_number),
                ]),
              )}
              onUpsert={upsert}
              onDelete={del}
              finished={false}
            />
          );
        })}
      </div>

      <div className="space-y-1 rounded-xl border border-(--border) bg-(--surface) p-3">
        <label className="block space-y-1 text-xs">
          <span className="text-(--muted)">session notes</span>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={() => {
              if (finished) updateSession(sessionId, { notes });
            }}
            rows={2}
            placeholder="how it felt, weight jumps, anything to remember"
            className="w-full resize-y rounded border border-(--border) bg-(--background) px-2 py-1 text-sm outline-none focus:border-(--accent)"
          />
        </label>
      </div>

      {!finished && (
        <div className="safe-bottom fixed bottom-0 left-0 right-0 z-20 border-t border-(--border) bg-(--background)/95 backdrop-blur">
          <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 pt-3 sm:px-6">
            <button
              type="button"
              onClick={finish}
              disabled={pending}
              className="h-12 flex-1 rounded-xl bg-(--accent-3) text-base font-semibold text-(--accent-3-contrast) shadow-sm active:scale-[0.99] disabled:opacity-60"
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
          className="fixed bottom-24 left-1/2 z-30 -translate-x-1/2 rounded-full bg-(--foreground) px-5 py-2 text-sm font-semibold text-(--background) shadow-lg tabular-nums"
          style={{ bottom: "calc(env(safe-area-inset-bottom) + 5rem)" }}
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
          className="progress-fill h-full transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ----- Solo exercise (not in a superset) -----

function SoloExerciseCard({
  exercise,
  sets,
  onUpsert,
  onDelete,
  finished,
}: {
  exercise: Exercise;
  sets: SessionSet[];
  onUpsert: (set: UpsertPayload) => Promise<string>;
  onDelete: (setId: string) => Promise<void>;
  finished: boolean;
}) {
  return (
    <section className="space-y-2.5 rounded-xl border border-(--border) bg-(--background) p-3">
      <ExerciseHeader exercise={exercise} />
      <SetList
        exercise={exercise}
        sets={sets}
        onUpsert={onUpsert}
        onDelete={onDelete}
        finished={finished}
      />
    </section>
  );
}

// ----- Superset block: N exercises side-by-side -----

function SupersetBlock({
  letter,
  exercises,
  setsByExercise,
  onUpsert,
  onDelete,
  finished,
}: {
  letter: string;
  exercises: Exercise[];
  setsByExercise: Record<string, SessionSet[]>;
  onUpsert: (exerciseId: string, set: UpsertPayload) => Promise<string>;
  onDelete: (setId: string) => Promise<void>;
  finished: boolean;
}) {
  const cols = Math.min(exercises.length, 2);
  return (
    <section className="space-y-2 rounded-xl border-2 border-(--accent)/30 bg-(--background) p-2">
      <div className="flex items-center gap-1.5 px-1 text-[11px] font-bold uppercase tracking-wider text-(--accent)">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-(--accent)" />
        superset {letter}
      </div>

      <div
        className="grid gap-1.5"
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
      >
        {exercises.map((ex) => (
          <div
            key={ex.id}
            className="space-y-2 rounded-lg bg-(--surface) p-1.5"
          >
            <ExerciseHeader exercise={ex} compact />
            <SetList
              exercise={ex}
              sets={setsByExercise[ex.exercise_id] ?? []}
              onUpsert={(set) => onUpsert(ex.exercise_id, set)}
              onDelete={onDelete}
              finished={finished}
              compact
            />
          </div>
        ))}
      </div>
    </section>
  );
}

function ExerciseHeader({
  exercise,
  compact = false,
}: {
  exercise: Exercise;
  compact?: boolean;
}) {
  const { cleanNotes } = parseSetCode(exercise.notes);
  const rx = buildRx(exercise);
  return (
    <header className="space-y-1">
      <Link
        href={`/exercises/${exercise.exercise_id}`}
        className={`block font-bold leading-tight line-clamp-2 hover:underline ${
          compact ? "text-[13px]" : "text-base sm:text-lg"
        }`}
      >
        {exercise.name}
      </Link>
      <div
        className={`inline-block max-w-full truncate rounded-md bg-(--accent-soft) px-1.5 py-0.5 font-semibold text-(--accent) tabular-nums ${
          compact ? "text-[11px]" : "text-sm"
        }`}
      >
        {rx}
      </div>
      {exercise.last_session && (
        <div className={compact ? "text-[10px]" : "text-xs"}>
          <div className="text-(--muted)">
            last {relativeDays(exercise.last_session.logged_at)}
          </div>
          <div className="flex flex-wrap gap-x-2 tabular-nums text-(--foreground)/70">
            {exercise.last_session.sets.map((s, i) => (
              <span key={i}>
                {s.weight ?? "bw"}×{s.reps}
              </span>
            ))}
          </div>
        </div>
      )}
      {cleanNotes && !compact && (
        <p className="text-xs text-(--muted)">{cleanNotes}</p>
      )}
    </header>
  );
}

function buildRx(ex: Exercise): string {
  const reps = formatRxReps(ex.prescribed_reps);
  const base = `${ex.prescribed_sets} × ${reps}`;
  if (ex.prescribed_weight != null) return `${base} @ ${ex.prescribed_weight}`;
  return base;
}

type UpsertPayload = {
  id: string | null;
  set_number: number;
  weight: number | null;
  reps: number;
  rpe: number | null;
  is_warmup: boolean;
  notes: string | null;
};

function SetList({
  exercise,
  sets,
  onUpsert,
  onDelete,
  finished,
  compact = false,
}: {
  exercise: Exercise;
  sets: SessionSet[];
  onUpsert: (set: UpsertPayload) => Promise<string>;
  onDelete: (setId: string) => Promise<void>;
  finished: boolean;
  compact?: boolean;
}) {
  const [expandedSetNumber, setExpandedSetNumber] = useState<number | null>(
    null,
  );

  const maxSet = Math.max(
    exercise.prescribed_sets,
    ...sets.map((s) => s.set_number),
    0,
  );

  const rows: Array<{ n: number; logged: SessionSet | null }> = [];
  for (let n = 1; n <= maxSet; n++) {
    rows.push({
      n,
      logged: sets.find((s) => s.set_number === n) ?? null,
    });
  }

  const lastForSet = (n: number): LastSessionSet | null =>
    exercise.last_session?.sets.find((s) => s.set_number === n) ?? null;

  const suggestedForSet = (
    n: number,
  ): { weight: number | null; reps: number | null } => {
    const target = repTargetForSet(exercise.prescribed_reps, n);
    const prevInSession = sets.find((s) => s.set_number === n - 1) ?? null;
    const sameSetLast = lastForSet(n);

    // weight priority: previous set in this session > same set last time > prescribed
    const weight =
      prevInSession?.weight ??
      sameSetLast?.weight ??
      exercise.prescribed_weight;

    // reps priority: same set last time > per-set target > previous set in this session
    // (target beats copying previous set when the scheme is per-set descending like 20,15,10)
    const reps =
      sameSetLast?.reps ??
      target.value ??
      prevInSession?.reps ??
      null;

    return { weight, reps };
  };

  return (
    <ul className="space-y-1">
      {rows.map((r) => {
        const isExpanded = expandedSetNumber === r.n;
        if (isExpanded) {
          const suggest = suggestedForSet(r.n);
          return (
            <li key={r.n}>
              <SetEditor
                setNumber={r.n}
                initialWeight={r.logged?.weight ?? suggest.weight}
                initialReps={r.logged?.reps ?? suggest.reps}
                initialIsWarmup={r.logged?.is_warmup ?? false}
                finished={finished}
                showDelete={!!r.logged}
                compact={compact}
                onSave={async (state) => {
                  await onUpsert({
                    id: r.logged?.id ?? null,
                    set_number: r.n,
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
            </li>
          );
        }
        if (r.logged) {
          return (
            <li key={r.n}>
              <LoggedRow
                set={r.logged}
                onEdit={() => !finished && setExpandedSetNumber(r.n)}
                compact={compact}
              />
            </li>
          );
        }
        const suggest = suggestedForSet(r.n);
        const target = repTargetForSet(exercise.prescribed_reps, r.n);
        return (
          <li key={r.n}>
            <QuickLogRow
              setNumber={r.n}
              weight={suggest.weight}
              reps={suggest.reps}
              targetText={target.text}
              showTarget={target.perSet}
              finished={finished}
              compact={compact}
              onExpand={() => setExpandedSetNumber(r.n)}
              onQuickLog={async () => {
                if (suggest.reps === null) {
                  setExpandedSetNumber(r.n);
                  return;
                }
                await onUpsert({
                  id: null,
                  set_number: r.n,
                  weight: suggest.weight,
                  reps: suggest.reps,
                  rpe: null,
                  is_warmup: false,
                  notes: null,
                });
              }}
            />
          </li>
        );
      })}
      {!finished && (
        <li>
          <button
            type="button"
            onClick={() => setExpandedSetNumber(maxSet + 1)}
            className="h-7 w-full rounded border border-dashed border-(--border) text-[11px] text-(--muted) hover:border-(--accent) hover:text-(--accent)"
          >
            + add set
          </button>
        </li>
      )}
    </ul>
  );
}

function LoggedRow({
  set,
  onEdit,
  compact,
}: {
  set: SessionSet;
  onEdit: () => void;
  compact: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onEdit}
      className={`flex min-h-10 w-full items-center gap-2 rounded-md border border-(--border) bg-(--accent-soft)/60 px-2 text-left ${
        compact ? "text-sm" : "text-base"
      }`}
    >
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-(--accent-2) text-xs font-bold text-(--accent-2-contrast)">
        ✓
      </span>
      <span className="text-xs text-(--muted) tabular-nums">
        {set.set_number}
        {set.is_warmup && (
          <span className="ml-1 rounded bg-(--border) px-1 text-[9px] uppercase tracking-wider">
            wu
          </span>
        )}
      </span>
      <span className="ml-auto font-bold tabular-nums">
        {set.weight ?? "bw"}
        <span className="mx-0.5 text-(--muted)">×</span>
        {set.reps}
      </span>
    </button>
  );
}

function QuickLogRow({
  setNumber,
  weight,
  reps,
  targetText,
  showTarget,
  finished,
  compact,
  onExpand,
  onQuickLog,
}: {
  setNumber: number;
  weight: number | null;
  reps: number | null;
  targetText: string;
  showTarget: boolean;
  finished: boolean;
  compact: boolean;
  onExpand: () => void;
  onQuickLog: () => Promise<void>;
}) {
  const [pending, setPending] = useState(false);
  const display =
    reps === null ? "tap to log" : `${weight ?? "bw"} × ${reps}`;
  const handleQuick = async () => {
    if (reps === null) return onExpand();
    setPending(true);
    try {
      await onQuickLog();
    } finally {
      setPending(false);
    }
  };
  return (
    <div className="flex min-h-11 items-center gap-2 rounded-md border border-(--border) px-1.5">
      <button
        type="button"
        onClick={onExpand}
        disabled={finished}
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-(--border) text-xs text-(--muted) hover:border-(--accent) hover:text-(--accent) disabled:opacity-60"
        aria-label={`edit set ${setNumber}`}
      >
        {setNumber}
      </button>
      <button
        type="button"
        onClick={onExpand}
        disabled={finished}
        className="min-w-0 flex-1 text-left disabled:opacity-60"
      >
        <div
          className={`truncate font-semibold tabular-nums text-(--foreground) ${
            compact ? "text-sm" : "text-base"
          }`}
        >
          {display}
        </div>
        {showTarget && targetText && (
          <div
            className={`text-(--muted) ${compact ? "text-[10px]" : "text-[11px]"}`}
          >
            target {targetText}
          </div>
        )}
      </button>
      <button
        type="button"
        onClick={handleQuick}
        disabled={pending || finished || reps === null}
        className={`flex shrink-0 items-center justify-center rounded-md bg-(--accent-2) font-bold text-(--accent-2-contrast) active:scale-95 disabled:opacity-60 ${
          compact ? "h-9 w-10 text-base" : "h-10 w-12 text-lg"
        }`}
        aria-label="log with these values"
      >
        {pending ? "…" : "✓"}
      </button>
    </div>
  );
}

function SetEditor({
  setNumber,
  initialWeight,
  initialReps,
  initialIsWarmup,
  finished,
  showDelete = false,
  compact = false,
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
  compact?: boolean;
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

      <div className={compact ? "space-y-1.5" : "grid grid-cols-2 gap-2"}>
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

      <div className="mt-2 flex gap-1.5">
        <button
          type="button"
          onClick={submit}
          disabled={saving || finished}
          className="h-9 flex-1 rounded-md bg-(--accent-2) text-sm font-semibold text-(--accent-2-contrast) active:scale-[0.99] disabled:opacity-60"
        >
          {saving ? "saving…" : "log set"}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="h-9 rounded-md border border-(--border) bg-(--background) px-2.5 text-xs text-(--muted)"
          >
            cancel
          </button>
        )}
        {showDelete && onDelete && (
          <button
            type="button"
            onClick={onDelete}
            className="h-9 rounded-md border border-(--border) bg-(--background) px-2.5 text-xs text-red-600 dark:text-red-400"
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
    <div className="flex items-center gap-2">
      <span className="w-11 shrink-0 text-[10px] font-semibold uppercase tracking-wider text-(--muted)">
        {label}
      </span>
      <div className="grid min-w-0 flex-1 grid-cols-[auto,1fr,auto] items-stretch rounded-md border border-(--border) bg-(--background)">
        <button
          type="button"
          onClick={() => bump(-1)}
          disabled={disabled}
          className="flex h-11 w-11 items-center justify-center rounded-l-md text-xl font-semibold text-(--muted) active:bg-(--accent-soft) disabled:opacity-40"
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
          className="h-11 w-full border-x border-(--border) bg-transparent text-center font-bold tabular-nums outline-none focus:bg-(--background) disabled:opacity-60"
          style={{ fontSize: "18px" }}
        />
        <button
          type="button"
          onClick={() => bump(+1)}
          disabled={disabled}
          className="flex h-11 w-11 items-center justify-center rounded-r-md text-xl font-semibold text-(--muted) active:bg-(--accent-soft) disabled:opacity-40"
          aria-label={`increase ${label}`}
        >
          +
        </button>
      </div>
    </div>
  );
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
