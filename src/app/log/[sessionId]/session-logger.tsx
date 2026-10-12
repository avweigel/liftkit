"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useContext, useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  deleteSessionSet,
  finishSession,
  updateSession,
  upsertSessionSet,
} from "@/lib/actions/sessions";
import {
  addSessionExtra,
  removeSessionExtra,
  saveExtrasAsNewPhase,
  saveExtrasToCurrentPhase,
} from "@/lib/actions/session-extras";
import { groupIntoSupersets, parseSetCode } from "@/lib/set-code";
import { formatRxReps, repTargetForSet, repsFitTarget } from "@/lib/display/reps";
import { weightConvention } from "@/lib/display/weight-convention";
import {
  snapWeight,
  stepWeight,
  weightKind,
  type WeightKind,
} from "@/lib/display/weight-steps";
import { pairSides } from "@/lib/side";
import type { DayKind } from "@/lib/program/day-profile";
import {
  BaseUnitContext,
  convert,
  formatWeight,
  useEntryUnit,
  type Unit,
} from "@/lib/display/units";

// reads this device's saved warm-up picks, so it renders only in the browser
import { CardioTimer, parseCardio, type CardioStep } from "./cardio-timer";
import { swapExercise, undoSwap } from "@/lib/actions/swaps";
import { createContext } from "react";

// any exercise header can ask to be swapped without threading props
// through every card
// the one set you're on right now, as "exerciseId-setNumber". only that row
// gets the highlight, so in a superset you can't log the wrong exercise.
const CurrentSetContext = createContext<string | null>(null);

const SwapContext = createContext<{
  open: (ex: Exercise) => void;
  undo: (ex: Exercise) => Promise<void>;
} | null>(null);
import { howTo } from "@/lib/program/how-to";

const WarmupCard = dynamic(() => import("./warmup-card"), { ssr: false });
const CooldownCard = dynamic(() => import("./cooldown-card"), { ssr: false });

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
  equipment: string | null;
  prescribed_sets: number;
  prescribed_reps: string;
  prescribed_weight: number | null;
  rest_seconds: number | null;
  notes: string | null;
  is_extra: boolean;
  extra_id: string | null;
  superset_code_override: string | null;
  plan_day_exercise_id: string | null;
  swapped_from: { id: string; name: string } | null;
  last_swap: {
    name: string;
    logged_at: string;
    sets: LastSessionSet[];
  } | null;
  last_session: {
    logged_at: string;
    sets: LastSessionSet[];
  } | null;
};

type LibraryItem = {
  id: string;
  name: string;
  primary_muscle: string;
  equipment: string;
  owner_id: string | null;
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
  logged_at?: string;
};

type Props = {
  sessionId: string;
  finished: boolean;
  initialNotes: string;
  exercises: Exercise[];
  initialSets: SessionSet[];
  library: LibraryItem[];
  activeSupersetCodes: string[];
  planName: string | null;
  hasPlanDay: boolean;
  warmup: { kind: DayKind } | null;
  baseUnit: Unit;
};

export function SessionLogger({
  sessionId,
  finished,
  initialNotes,
  exercises,
  initialSets,
  library,
  activeSupersetCodes,
  planName,
  hasPlanDay,
  warmup,
  baseUnit,
}: Props) {
  const [sets, setSets] = useState<SessionSet[]>(initialSets);
  const [swapTarget, setSwapTarget] = useState<Exercise | null>(null);
  const swapApi = useMemo(
    () => ({
      open: (ex: Exercise) => setSwapTarget(ex),
      undo: async (ex: Exercise) => {
        if (!ex.plan_day_exercise_id) return;
        await undoSwap({ sessionId, planDayExerciseId: ex.plan_day_exercise_id });
      },
    }),
    [sessionId],
  );
  const [notes, setNotes] = useState(initialNotes);
  const [restOn, setRestOn] = useState(true);
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

  // totalSets dedup by exercise_id: plan rows that collapsed to the same
  // exercise (e.g. an old import where "Tricep Kickback - L/R/bilateral"
  // all mapped to one library entry) share the same sets in the logger,
  // so counting 3 × prescribed is misleading. take the max prescribed
  // per exercise_id instead, since that's how many unique sets you can log.
  const totalSets = useMemo(() => {
    const maxByExerciseId = new Map<string, number>();
    for (const ex of exercises) {
      const cur = maxByExerciseId.get(ex.exercise_id) ?? 0;
      maxByExerciseId.set(
        ex.exercise_id,
        Math.max(cur, ex.prescribed_sets),
      );
    }
    let total = 0;
    for (const v of maxByExerciseId.values()) total += v;
    return total;
  }, [exercises]);
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
          // for session extras, synthesize a set-code prefix so the
          // groupIntoSupersets helper treats them as part of the letter
          // even though their real notes don't have the code.
          notes: e.superset_code_override
            ? `[${e.superset_code_override.toUpperCase()}99] ${e.notes ?? ""}`
            : e.notes,
          _ex: e,
        })),
      ),
    [exercises],
  );

  // where you are: the set after the one you logged last. inside a superset
  // that means the next exercise in the round, not more of the same one.
  const current = useMemo(
    () => findCurrentSet(groups.map((g) => g.items.map((it) => it._ex)), sets),
    [groups, sets],
  );

  const currentKey = current ? `${current.exerciseId}-${current.setNumber}` : null;
  // after you log a set, bring the next one to the middle of the screen,
  // even when it's the first exercise of the superset, above
  const followNext = useRef(false);
  useEffect(() => {
    if (!followNext.current || !currentKey) return;
    followNext.current = false;
    const id = window.setTimeout(() => {
      const el = document.getElementById(`set-${currentKey}`);
      if (!el) return;
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
    }, 150);
    return () => window.clearTimeout(id);
  }, [currentKey]);

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
    if (!set.id) followNext.current = true;
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
      const replaced = prev.find((s) => set.id != null && s.id === set.id);
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
          logged_at: replaced?.logged_at ?? new Date().toISOString(),
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

  // left/right pairs, keyed by exercise_id. rows that collapsed onto one
  // exercise_id can't be told apart, so those are skipped.
  const { leaderToFollower, followerToLeader } = useMemo(() => {
    const pairs = pairSides(
      exercises.map((e) => ({ id: e.id, name: e.name, order_index: e.order_index })),
    );
    const rowById = new Map(exercises.map((e) => [e.id, e]));
    const l2f = new Map<string, string>();
    const f2l = new Map<string, string>();
    for (const pair of new Set(pairs.values())) {
      const leader = rowById.get(pair.leaderId)?.exercise_id;
      const follower = rowById.get(pair.followerId)?.exercise_id;
      if (!leader || !follower || leader === follower) continue;
      l2f.set(leader, follower);
      f2l.set(follower, leader);
    }
    return { leaderToFollower: l2f, followerToLeader: f2l };
  }, [exercises]);

  const carryFor = (exerciseId: string): SessionSet[] | null => {
    const leader = followerToLeader.get(exerciseId);
    return leader ? sets.filter((s) => s.exercise_id === leader) : null;
  };

  // changing the first side's weight drags the second side along, as long
  // as the second side was logged at the old weight (i.e. it was carried).
  const upsertSynced = async (exerciseId: string, set: UpsertPayload) => {
    const before =
      sets.find(
        (s) => s.exercise_id === exerciseId && s.set_number === set.set_number,
      )?.weight ?? null;
    const id = await upsert(exerciseId, set);
    const followerId = leaderToFollower.get(exerciseId);
    if (followerId && before !== null && set.weight !== before) {
      const twin = sets.find(
        (s) => s.exercise_id === followerId && s.set_number === set.set_number,
      );
      if (twin && twin.weight === before) {
        await upsert(followerId, {
          id: twin.id,
          set_number: twin.set_number,
          weight: set.weight,
          reps: twin.reps,
          rpe: twin.rpe,
          is_warmup: twin.is_warmup,
          notes: twin.notes,
        });
      }
    }
    return id;
  };

  const del = async (setId: string) => {
    await deleteSessionSet(sessionId, setId);
    setSets((prev) => prev.filter((s) => s.id !== setId));
  };

  const hasExtras = useMemo(
    () => exercises.some((e) => e.is_extra),
    [exercises],
  );
  const [pickerOpen, setPickerOpen] = useState(false);
  const [finishPromptOpen, setFinishPromptOpen] = useState(false);

  const finishDirect = () => {
    startTransition(async () => {
      await finishSession(sessionId, notes);
    });
  };

  const onFinishTap = () => {
    if (workingSetsLogged === 0 && !confirm("You haven't logged any sets. Finish anyway?")) {
      return;
    }
    if (hasExtras && hasPlanDay) {
      setFinishPromptOpen(true);
    } else {
      finishDirect();
    }
  };

  return (
    <BaseUnitContext.Provider value={baseUnit}>
    <SwapContext.Provider value={finished ? null : swapApi}>
    <CurrentSetContext.Provider value={finished ? null : currentKey}>
    <div className="space-y-5">
      <ProgressHeader
        done={workingSetsLogged}
        total={totalSets}
        restOn={restOn}
        onToggleRest={() => setRestOn((v) => !v)}
        finished={finished}
      />

      {exercises.length === 0 && (
        <p className="card p-6 text-center text-[15px] text-(--muted)">
          Nothing planned for this day yet. Add an exercise to start logging.
        </p>
      )}

      {warmup && !finished && <WarmupCard kind={warmup.kind} sessionId={sessionId} />}

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
                onUpsert={(set) => upsertSynced(item._ex.exercise_id, set)}
                carrySets={carryFor(item._ex.exercise_id)}
                onDelete={del}
                onRemoveExtra={
                  item._ex.is_extra && item._ex.extra_id
                    ? () => removeSessionExtra(item._ex.extra_id!, sessionId)
                    : undefined
                }
                finished={finished}
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
              onUpsert={upsertSynced}
              carryFor={carryFor}
              onDelete={del}
              onRemoveExtra={async (extraId) => {
                await removeSessionExtra(extraId, sessionId);
              }}
              finished={finished}
            />
          );
        })}

        {!finished && (
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className="btn btn-secondary btn-block"
          >
            Add an exercise
          </button>
        )}
      </div>

      {warmup && !finished && <CooldownCard kind={warmup.kind} sessionId={sessionId} />}

      <label className="card block space-y-2 p-4">
        <span className="label">Notes</span>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={() => {
            if (finished) updateSession(sessionId, { notes });
          }}
          rows={2}
          placeholder="How it felt, weights to change next time"
          className="w-full resize-y rounded-xl bg-(--surface-2) px-3 py-2 text-[15px] outline-none placeholder:text-(--faint) focus:ring-2 focus:ring-(--accent-line)"
        />
      </label>

      {/* at the end of the page, not pinned under your thumb mid-workout.
          it only turns into the loud button once every set is logged */}
      {!finished && (
        <button
          type="button"
          onClick={onFinishTap}
          disabled={pending}
          className={`btn btn-block ${workingSetsLogged >= totalSets && totalSets > 0 ? "btn-primary" : "btn-secondary"}`}
        >
          {pending ? "Finishing…" : "Finish workout"}
        </button>
      )}

      {pickerOpen && (
        <AddExercisePicker
          library={library}
          existingExerciseIds={exercises.map((e) => e.exercise_id)}
          activeSupersetCodes={activeSupersetCodes}
          onAdd={async (input) => {
            await addSessionExtra(sessionId, input);
            setPickerOpen(false);
          }}
          onClose={() => setPickerOpen(false)}
        />
      )}

      {finishPromptOpen && (
        <FinishWorkoutPrompt
          sessionId={sessionId}
          planName={planName}
          notes={notes}
          onClose={() => setFinishPromptOpen(false)}
        />
      )}

      {!finished && current && (
        <JumpToCurrent
          targetId={`set-${current.exerciseId}-${current.setNumber}`}
          label={`Set ${current.setNumber}, ${current.name}`}
          raised={restOn && restSecondsLeft !== null}
        />
      )}

      {restOn && restSecondsLeft !== null && (
        <button
          type="button"
          onClick={() => setRestSecondsLeft(null)}
          aria-label="Skip rest"
          className="fixed left-1/2 z-30 flex -translate-x-1/2 items-center gap-2 rounded-full bg-(--foreground) py-2 pr-4 pl-3 text-(--background) shadow-lg"
          style={{ bottom: "calc(env(safe-area-inset-bottom) + 1.25rem)" }}
        >
          <span className="text-[13px] font-semibold opacity-70">Rest</span>
          <span className="num text-[22px] leading-none">{formatRest(restSecondsLeft)}</span>
          <span className="text-[12px] font-semibold opacity-70">Skip</span>
        </button>
      )}
      {swapTarget && swapTarget.plan_day_exercise_id && (
        <SwapSheet
          exercise={swapTarget}
          library={library}
          onClose={() => setSwapTarget(null)}
          onSwap={async (exerciseId, updatePlan) => {
            await swapExercise({
              sessionId,
              planDayExerciseId: swapTarget.plan_day_exercise_id,
              exerciseId,
              updatePlan,
            });
            setSwapTarget(null);
          }}
        />
      )}
    </div>
    </CurrentSetContext.Provider>
    </SwapContext.Provider>
    </BaseUnitContext.Provider>
  );
}

function findCurrentSet(
  order: Exercise[][],
  sets: SessionSet[],
): { exerciseId: string; setNumber: number; name: string } | null {
  const nextOpen = (ex: Exercise): number | null => {
    const mine = sets.filter((s) => s.exercise_id === ex.exercise_id);
    const goal = ex.prescribed_sets + mine.filter((s) => s.is_warmup).length;
    const taken = new Set(mine.map((s) => s.set_number));
    for (let n = 1; n <= goal; n++) if (!taken.has(n)) return n;
    return null;
  };
  const last = [...sets].sort((a, b) =>
    (b.logged_at ?? "").localeCompare(a.logged_at ?? ""),
  )[0];
  let gi = 0;
  let start = 0;
  if (last) {
    gi = order.findIndex((g) => g.some((e) => e.exercise_id === last.exercise_id));
    if (gi < 0) gi = 0;
    else start = order[gi].findIndex((e) => e.exercise_id === last.exercise_id) + 1;
  }
  for (let k = 0; k < order.length; k++) {
    const g = order[(gi + k) % order.length];
    for (let j = 0; j < g.length; j++) {
      const ex = g[(k === 0 ? start + j : j) % g.length];
      const n = nextOpen(ex);
      if (n != null) return { exerciseId: ex.exercise_id, setNumber: n, name: ex.name };
    }
  }
  return null;
}

// a way home after scrolling ahead to peek at what's next. it only shows
// while your current set is off screen.
function JumpToCurrent({
  targetId,
  label,
  raised,
}: {
  targetId: string;
  label: string;
  raised: boolean;
}) {
  const [away, setAway] = useState<"up" | "down" | null>(null);

  useEffect(() => {
    const el = document.getElementById(targetId);
    if (!el) return;
    // the sticky progress header and the finish bar cover part of the screen
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setAway(null);
        else setAway(entry.boundingClientRect.top < 0 ? "up" : "down");
      },
      { rootMargin: "-120px 0px -60px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [targetId]);

  if (!away) return null;
  return (
    <button
      type="button"
      onClick={() =>
        document.getElementById(targetId)?.scrollIntoView({ behavior: "smooth", block: "center" })
      }
      aria-label={`Back to your current set: ${label}`}
      className="fixed left-1/2 z-30 flex max-w-[calc(100%-2rem)] -translate-x-1/2 items-center gap-2 rounded-full border border-(--accent-line) bg-(--surface) py-2.5 pr-4 pl-3 shadow-lg transition-[bottom] duration-200"
      style={{ bottom: `calc(env(safe-area-inset-bottom) + ${raised ? "5rem" : "1.25rem"})` }}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-(--accent)" aria-hidden>
        {away === "up" ? <path d="M12 19V5M5 12l7-7 7 7" /> : <path d="M12 5v14M5 12l7 7 7-7" />}
      </svg>
      <span className="truncate text-[14px] font-semibold">{label}</span>
    </button>
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
    <div className="sticky top-0 z-10 -mx-4 bg-(--background)/94 px-4 pt-[max(env(safe-area-inset-top),0.5rem)] pb-3 backdrop-blur-md">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-baseline gap-1.5">
          <span className="num text-[26px] leading-none">{done}</span>
          <span className="text-[14px] text-(--muted)">
            of <span className="num text-[16px]">{total}</span> sets
          </span>
        </div>
        {!finished && (
          <button
            type="button"
            onClick={onToggleRest}
            aria-pressed={restOn}
            className={`chip h-8 px-3 text-[13px] ${restOn ? "chip-accent" : ""}`}
          >
            Rest timer {restOn ? "on" : "off"}
          </button>
        )}
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-(--surface-2)">
        <div
          className={`h-full rounded-full transition-[width] duration-300 ${pct >= 100 ? "bg-(--ok)" : "bg-(--accent)"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ----- Solo exercise (not in a superset) -----

// the card holding the set you're on gets an accent outline and a faint
// tint, readable at a glance from the bench
function useIsActive(exerciseIds: string[]): boolean {
  const current = useContext(CurrentSetContext);
  return !!current && exerciseIds.some((id) => current.startsWith(`${id}-`));
}

const ACTIVE_CARD =
  "ring-2 ring-(--accent-line) bg-[color-mix(in_oklab,var(--surface)_93%,var(--accent))]";

function SoloExerciseCard({
  exercise,
  sets,
  carrySets,
  onUpsert,
  onDelete,
  onRemoveExtra,
  finished,
}: {
  exercise: Exercise;
  sets: SessionSet[];
  carrySets: SessionSet[] | null;
  onUpsert: (set: UpsertPayload) => Promise<string>;
  onDelete: (setId: string) => Promise<void>;
  onRemoveExtra?: () => Promise<void>;
  finished: boolean;
}) {
  const letter = parseSetCode(exercise.notes).code?.letter ?? null;
  const active = useIsActive([exercise.exercise_id]);
  return (
    <section className={`card space-y-3 p-4 transition-shadow ${active ? ACTIVE_CARD : ""}`}>
      <ExerciseHeader
        exercise={exercise}
        badge={letter}
        onRemoveExtra={onRemoveExtra}
      />
      <SetList
        exercise={exercise}
        sets={sets}
        carrySets={carrySets}
        onUpsert={onUpsert}
        onDelete={onDelete}
        finished={finished}
      />
    </section>
  );
}

// ----- Superset block: exercises stacked, done back to back -----

function SupersetBlock({
  letter,
  exercises,
  setsByExercise,
  carryFor,
  onUpsert,
  onDelete,
  onRemoveExtra,
  finished,
}: {
  letter: string;
  exercises: Exercise[];
  setsByExercise: Record<string, SessionSet[]>;
  carryFor: (exerciseId: string) => SessionSet[] | null;
  onUpsert: (exerciseId: string, set: UpsertPayload) => Promise<string>;
  onDelete: (setId: string) => Promise<void>;
  onRemoveExtra?: (extraId: string) => Promise<void>;
  finished: boolean;
}) {
  const active = useIsActive(exercises.map((e) => e.exercise_id));
  return (
    <section className={`card overflow-hidden transition-shadow ${active ? ACTIVE_CARD : ""}`}>
      <div className="flex items-center gap-2 px-4 pt-4">
        <span
          className={`display flex h-7 w-7 items-center justify-center rounded-lg text-[16px] ${
            active ? "bg-(--accent) text-(--accent-contrast)" : "bg-(--accent-soft) text-(--accent)"
          }`}
        >
          {letter}
        </span>
        <span className="label">
          Superset, {exercises.length} exercises back to back
        </span>
      </div>
      <div className="divide-y divide-(--border)">
        {exercises.map((ex, i) => (
          <div key={ex.id} className="space-y-3 p-4">
            <ExerciseHeader
              exercise={ex}
              badge={`${letter}${i + 1}`}
              onRemoveExtra={
                ex.is_extra && ex.extra_id && onRemoveExtra
                  ? () => onRemoveExtra(ex.extra_id!)
                  : undefined
              }
            />
            <SetList
              exercise={ex}
              sets={setsByExercise[ex.exercise_id] ?? []}
              carrySets={carryFor(ex.exercise_id)}
              onUpsert={(set) => onUpsert(ex.exercise_id, set)}
              onDelete={onDelete}
              finished={finished}
            />
          </div>
        ))}
      </div>
    </section>
  );
}

function ExerciseHeader({
  exercise,
  badge,
  onRemoveExtra,
}: {
  exercise: Exercise;
  badge: string | null;
  onRemoveExtra?: () => Promise<void> | void;
}) {
  const { cleanNotes } = parseSetCode(exercise.notes);
  const conv = weightConvention(exercise.name, exercise.equipment, planContext(exercise));
  const reps = formatRxReps(exercise.prescribed_reps);
  const base = useContext(BaseUnitContext);
  const [unit] = useEntryUnit(exercise.exercise_id);
  const show = (w: number) => formatWeight(convert(w, base, unit));
  const swap = useContext(SwapContext);
  const [undoing, setUndoing] = useState(false);
  return (
    <header className="space-y-1.5">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <Link
            href={`/exercises/${exercise.exercise_id}`}
            className="display block text-[21px] hover:underline"
          >
            {exercise.name}
          </Link>
        </div>
        {exercise.is_extra && <span className="chip shrink-0">Added</span>}
        {swap && exercise.plan_day_exercise_id && !exercise.swapped_from && (
          <button
            type="button"
            onClick={() => swap.open(exercise)}
            className="flex h-9 shrink-0 items-center gap-1.5 rounded-lg px-2 text-[13px] font-semibold text-(--muted) hover:text-(--foreground)"
            aria-label={`Swap ${exercise.name} for another exercise`}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M7 4L3 8l4 4M3 8h13M17 20l4-4-4-4M21 16H8" />
            </svg>
            Swap
          </button>
        )}
        {onRemoveExtra && (
          <button
            type="button"
            onClick={() => {
              if (!confirm(`Remove ${exercise.name} from this workout?`)) return;
              void onRemoveExtra();
            }}
            className="btn btn-ghost btn-sm text-(--muted)"
          >
            Remove
          </button>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        {badge && badge.length > 1 && (
          <span className="chip chip-accent num text-[13px]">{badge}</span>
        )}
        {reps && (
        <span className="chip">
          <span className="num text-[14px] text-(--foreground)">
            {exercise.prescribed_sets} × {reps}
          </span>
          {exercise.prescribed_weight != null && (
            <span className="num text-[14px] text-(--foreground)">
              @ {show(exercise.prescribed_weight)}
            </span>
          )}
        </span>
        )}
        {exercise.rest_seconds != null && exercise.rest_seconds > 0 && (
          <span className="chip">
            rest <span className="num text-[14px]">{exercise.rest_seconds}</span> s
          </span>
        )}
        {conv && (
          <span className="text-[12px] text-(--muted)" title={conv.summary}>
            {conv.mode === "single" ? "Weight per dumbbell" : conv.equipment === "dumbbell" ? "Weight is both dumbbells" : "Weight of the kettlebell"}
          </span>
        )}
      </div>
      {exercise.swapped_from && (
        <div className="flex items-center gap-2 rounded-xl bg-(--accent-soft) px-3 py-2 text-[13px]">
          <span className="min-w-0 flex-1">
            Swapped in for <span className="font-semibold">{exercise.swapped_from.name}</span>, this workout only
          </span>
          {swap && (
            <button
              type="button"
              disabled={undoing}
              onClick={async () => {
                setUndoing(true);
                try {
                  await swap.undo(exercise);
                } finally {
                  setUndoing(false);
                }
              }}
              className="shrink-0 font-semibold text-(--accent)"
            >
              {undoing ? "Undoing…" : "Undo"}
            </button>
          )}
        </div>
      )}
      {exercise.last_swap && (
        <p className="text-[13px] text-(--muted)">
          Last time, {relativeDays(exercise.last_swap.logged_at)}, you did{" "}
          <span className="font-semibold text-(--foreground)">{exercise.last_swap.name}</span> instead
          {exercise.last_swap.sets.length > 0 && ": "}
          {exercise.last_swap.sets.map((s, i) => (
            <span key={i} className="num text-[15px] text-(--foreground)">
              {i > 0 ? ", " : ""}
              {s.weight != null ? formatWeight(s.weight) : "BW"}×{s.reps}
            </span>
          ))}
        </p>
      )}
      {cleanNotes && <p className="text-[14px] text-(--muted)">{sentence(cleanNotes)}</p>}
      <HowToToggle name={exercise.name} />
      {exercise.last_session && (
        <p className="text-[13px] text-(--muted)">
          {exercise.last_swap ? `Last time you did ${exercise.name}` : "Last time"}, {relativeDays(exercise.last_session.logged_at)}:{" "}
          {exercise.last_session.sets.map((s, i) => (
            <span key={i} className="num text-[15px] text-(--foreground)">
              {i > 0 ? ", " : ""}
              {s.weight != null ? show(s.weight) : "BW"}×{s.reps}
            </span>
          ))}
          {unit !== base && <span> {unit}</span>}
        </p>
      )}
    </header>
  );
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
  carrySets = null,
  onUpsert,
  onDelete,
  finished,
}: {
  exercise: Exercise;
  sets: SessionSet[];
  carrySets?: SessionSet[] | null;
  onUpsert: (set: UpsertPayload) => Promise<string>;
  onDelete: (setId: string) => Promise<void>;
  finished: boolean;
}) {
  const [expandedSetNumber, setExpandedSetNumber] = useState<number | null>(
    null,
  );
  const currentSet = useContext(CurrentSetContext);
  const weightConv = weightConvention(exercise.name, exercise.equipment, planContext(exercise));
  const kind = weightKind(exercise.name, exercise.equipment, planContext(exercise));
  const base = useContext(BaseUnitContext);
  const [unit, setUnit] = useEntryUnit(exercise.exercise_id);
  const toShown = (w: number | null) => (w == null ? null : convert(w, base, unit));
  const unitLabel = unit !== base ? unit : null;

  // warmups don't count toward the prescribed working-set goal, so
  // reserve an extra row for each warmup already logged.
  const warmupCount = sets.filter((s) => s.is_warmup).length;
  const maxSet = Math.max(
    exercise.prescribed_sets + warmupCount,
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
  ): { weight: number | null; reps: number | null; weightKnown: boolean } => {
    const target = repTargetForSet(exercise.prescribed_reps, n);
    const prevInSession =
      [...sets]
        .filter((s) => !s.is_warmup)
        .sort((a, b) => b.set_number - a.set_number)[0] ?? null;
    const sameSetLast = lastForSet(n);

    // the other side's weight for this set wins over everything: you use
    // the same dumbbell on both sides.
    const carried =
      carrySets?.find((s) => s.set_number === n && !s.is_warmup)?.weight ??
      null;

    // the plan's reps win over history: last time may have been a 20/15/10
    // pyramid, today says 3 x 12. history still sets the load, scaled to the
    // reps you're doing now.
    const fits = (r: number | null) => r != null && repsFitTarget(r, target.text);
    const reps =
      target.value == null
        ? sameSetLast?.reps ?? prevInSession?.reps ?? null
        : fits(sameSetLast?.reps ?? null)
          ? sameSetLast!.reps
          : fits(prevInSession?.reps ?? null)
            ? prevInSession!.reps
            : target.value;

    const scaleTo = (w: number, from: number, to: number) => {
      const oneRM = w * (1 + from / 30);
      const shown = convert(oneRM / (1 + to / 30), base, unit);
      return convert(snapWeight(kind, shown, unit), unit, base);
    };
    const lastWorking = (exercise.last_session?.sets ?? []).filter(
      (s) => s.weight != null && s.reps != null && s.reps > 0,
    );

    let weight: number | null;
    if (carried != null) {
      weight = carried;
    } else if (prevInSession?.weight != null && prevInSession.reps === reps) {
      // straight sets: keep today's weight
      weight = prevInSession.weight;
    } else if (sameSetLast?.weight != null && (reps == null || sameSetLast.reps === reps)) {
      // a pyramid you've done before: last time's weight for this step
      weight = sameSetLast.weight;
    } else if (prevInSession?.weight != null && prevInSession.reps != null && reps != null) {
      weight = scaleTo(prevInSession.weight, prevInSession.reps, reps);
    } else if (lastWorking.length > 0 && reps != null) {
      // a typical set from last time (the middle one by estimated max), so
      // one heavy top set doesn't set the load for all of today's sets
      const ranked = lastWorking
        .map((s) => ({ s, e: s.weight! * (1 + s.reps / 30) }))
        .sort((x, y) => x.e - y.e);
      const mid = ranked[Math.floor((ranked.length - 1) / 2)].s;
      weight = scaleTo(mid.weight!, mid.reps, reps);
    } else {
      weight = prevInSession?.weight ?? exercise.prescribed_weight;
    }

    // with no history, no other side and no earlier set, an empty weight
    // would quietly log bodyweight on a barbell. make the lifter pick one.
    // an old bodyweight entry only counts as an answer for moves that
    // aren't obviously loaded (a barbell or dumbbell name or equipment)
    const loaded =
      kind !== "other" ||
      ["barbell", "dumbbell", "kettlebell", "cable"].includes(exercise.equipment ?? "");
    const weightKnown =
      weight != null ||
      isBodyweight(exercise.name, exercise.equipment) ||
      (!loaded && (!!sameSetLast || !!prevInSession));

    return { weight, reps, weightKnown };
  };

  if (finished) {
    const logged = rows.filter((r) => r.logged);
    if (logged.length === 0) {
      return <p className="text-[14px] text-(--faint)">Not logged</p>;
    }
    return (
      <ul className="space-y-1.5">
        {logged.map((r) => (
          <li key={r.n}>
            <LoggedRow set={r.logged!} shownWeight={toShown(r.logged!.weight)} unitLabel={unitLabel} onEdit={() => {}} readOnly />
          </li>
        ))}
      </ul>
    );
  }

  // the first unlogged set is where this exercise is up to
  const nextUp = rows.find((r) => !r.logged)?.n ?? null;

  const cardio = parseCardio(exercise.prescribed_reps, parseSetCode(exercise.notes).cleanNotes);
  const hold = cardio ? null : parseHold(exercise.prescribed_reps);
  const steps = hold ? holdSteps(hold) : [];
  return (
    <div className="space-y-2">
    {cardio && <CardioTimer totalSeconds={cardio.totalSeconds} steps={cardio.steps} />}
    {hold && nextUp != null && (
      <div>
        <p className="label pb-1">
          Set <span className="num text-[14px] text-(--foreground)">{nextUp}</span> logs itself when the timer ends
        </p>
        <CardioTimer
          key={`hold-${nextUp}`}
          totalSeconds={steps.reduce((t, st) => t + st.seconds, 0)}
          steps={steps}
          onComplete={() => {
            const suggest = suggestedForSet(nextUp);
            void onUpsert({
              id: null,
              set_number: nextUp,
              weight: suggest.weight,
              reps: hold.seconds,
              rpe: null,
              is_warmup: false,
              notes: null,
            });
          }}
        />
      </div>
    )}
    <ul className="space-y-1.5">
      {rows.map((r) => {
        const isExpanded = expandedSetNumber === r.n;
        if (isExpanded) {
          const suggest = suggestedForSet(r.n);
          return (
            <li key={r.n} id={`set-${exercise.exercise_id}-${r.n}`} className="scroll-mt-32">
              <SetEditor
                setNumber={r.n}
                initialWeight={toShown(r.logged?.weight ?? suggest.weight)}
                unit={unit}
                onUnitChange={setUnit}
                initialReps={r.logged?.reps ?? suggest.reps}
                initialIsWarmup={r.logged?.is_warmup ?? false}
                finished={finished}
                showDelete={!!r.logged}
                weightConv={weightConv}
                weightKind={kind}
                onSave={async (state) => {
                  await onUpsert({
                    id: r.logged?.id ?? null,
                    set_number: r.n,
                    weight: state.weight == null ? null : convert(state.weight, state.unit, base),
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
            <li key={r.n} id={`set-${exercise.exercise_id}-${r.n}`} className="scroll-mt-32">
              <LoggedRow
                set={r.logged}
                shownWeight={toShown(r.logged.weight)}
                unitLabel={unitLabel}
                onEdit={() => setExpandedSetNumber(r.n)}
              />
            </li>
          );
        }
        const suggest = suggestedForSet(r.n);
        const target = repTargetForSet(exercise.prescribed_reps, r.n);
        return (
          <li key={r.n} id={`set-${exercise.exercise_id}-${r.n}`} className="scroll-mt-32">
            <QuickLogRow
              setNumber={r.n}
              weight={toShown(suggest.weight)}
              unitLabel={unitLabel}
              weightKnown={suggest.weightKnown}
              reps={suggest.reps}
              targetText={target.text}
              showTarget={target.perSet}
              current={currentSet === `${exercise.exercise_id}-${r.n}`}
              onExpand={() => setExpandedSetNumber(r.n)}
              onQuickLog={async () => {
                if (suggest.reps === null || !suggest.weightKnown) {
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
      <li>
        <button
          type="button"
          onClick={() => setExpandedSetNumber(maxSet + 1)}
          className="h-10 w-full rounded-xl text-[14px] font-semibold text-(--muted) hover:bg-(--surface-2) hover:text-(--foreground)"
        >
          Add a set
        </button>
      </li>
    </ul>
    </div>
  );
}

function HowToToggle({ name }: { name: string }) {
  const [open, setOpen] = useState(false);
  const h = howTo("", name);
  if (!h) return null;
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex h-8 items-center gap-1 text-[13px] font-semibold text-(--accent)"
      >
        How to
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform ${open ? "rotate-180" : ""}`} aria-hidden>
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {open && (
        <div className="space-y-2 rounded-xl bg-(--surface-2) p-3">
          <p className="text-[14px] leading-relaxed">{h.how}</p>
          <ul className="space-y-1">
            {h.cues.map((c) => (
              <li key={c} className="flex gap-2 text-[13px] text-(--muted)">
                <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-(--accent)" aria-hidden />
                {c}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// "30 s" or "30 s/side" in the plan: a hold you time, not reps you count
function parseHold(reps: string): { seconds: number; perSide: boolean } | null {
  const m = reps.match(/^\s*(\d+)\s*(s|sec|secs|seconds)\b(\s*\/\s*side)?/i);
  if (!m) return null;
  return { seconds: Number(m[1]), perSide: !!m[3] };
}

function holdSteps(h: { seconds: number; perSide: boolean }): CardioStep[] {
  const getSet = { label: "Get in position", seconds: 5 };
  if (!h.perSide) return [getSet, { label: "Hold", seconds: h.seconds }];
  return [
    getSet,
    { label: "Left side", seconds: h.seconds },
    { label: "Switch sides", seconds: 5 },
    { label: "Right side", seconds: h.seconds },
  ];
}

function planContext(exercise: Exercise): string {
  return `${exercise.notes ?? ""} ${exercise.prescribed_reps ?? ""}`;
}

function CheckGlyph({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  );
}

function LoggedRow({
  set,
  shownWeight,
  unitLabel,
  onEdit,
  readOnly = false,
}: {
  set: SessionSet;
  shownWeight: number | null;
  unitLabel: string | null;
  onEdit: () => void;
  readOnly?: boolean;
}) {
  const body = (
    <>
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-(--ok) text-(--surface)">
        <CheckGlyph />
      </span>
      <span className="num w-5 text-[15px] text-(--muted)">{set.set_number}</span>
      {set.is_warmup && <span className="chip">Warm-up</span>}
      <span className="ml-auto flex items-baseline gap-1">
        <span className="num text-[24px] leading-none">{shownWeight != null ? formatWeight(shownWeight) : "BW"}</span>
        {unitLabel && shownWeight != null && <span className="text-[13px] text-(--muted)">{unitLabel}</span>}
        <span className="text-[14px] text-(--muted)">×</span>
        <span className="num text-[24px] leading-none">{set.reps}</span>
      </span>
    </>
  );
  if (readOnly) {
    return (
      <div className="flex min-h-12 items-center gap-3 rounded-xl bg-(--ok-soft) px-3">
        {body}
      </div>
    );
  }
  return (
    <button
      type="button"
      onClick={onEdit}
      aria-label={`Set ${set.set_number} logged, ${shownWeight != null ? `${formatWeight(shownWeight)} ${unitLabel ?? ""}` : "bodyweight"} by ${set.reps}. Tap to edit.`}
      className="flex min-h-12 w-full items-center gap-3 rounded-xl bg-(--ok-soft) px-3 text-left"
    >
      {body}
    </button>
  );
}

function QuickLogRow({
  setNumber,
  weight,
  unitLabel,
  weightKnown,
  reps,
  targetText,
  showTarget,
  current,
  onExpand,
  onQuickLog,
}: {
  setNumber: number;
  weight: number | null;
  unitLabel: string | null;
  weightKnown: boolean;
  reps: number | null;
  targetText: string;
  showTarget: boolean;
  current: boolean;
  onExpand: () => void;
  onQuickLog: () => Promise<void>;
}) {
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);
  const handleQuick = async () => {
    if (reps === null || !weightKnown) return onExpand();
    setPending(true);
    setFailed(false);
    try {
      await onQuickLog();
    } catch {
      setFailed(true);
    } finally {
      setPending(false);
    }
  };
  return (
    <div
      className={`flex min-h-14 items-center gap-3 rounded-xl pl-3 pr-1.5 ${
        current ? "bg-(--surface-2) ring-1 ring-(--accent-line)" : "bg-(--surface-2)/60"
      }`}
    >
      <span
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 ${
          current ? "border-(--accent)" : "border-(--border)"
        }`}
      >
        <span className={`num text-[14px] ${current ? "text-(--accent)" : "text-(--muted)"}`}>{setNumber}</span>
      </span>
      <button
        type="button"
        onClick={onExpand}
        aria-label={`Edit set ${setNumber}`}
        className="min-w-0 flex-1 py-1.5 text-left"
      >
        {reps === null ? (
          <span className="text-[15px] font-semibold text-(--muted)">Tap to enter</span>
        ) : !weightKnown ? (
          <span className="flex items-baseline gap-1.5">
            <span className="text-[15px] font-semibold text-(--accent)">Set weight</span>
            <span className="text-[14px] text-(--muted)">×</span>
            <span className={`num text-[24px] leading-none ${current ? "" : "text-(--muted)"}`}>{reps}</span>
          </span>
        ) : (
          <span className={`flex items-baseline gap-1 ${current ? "" : "text-(--muted)"}`}>
            <span className="num text-[24px] leading-none">{weight != null ? formatWeight(weight) : "BW"}</span>
            {unitLabel && weight != null && <span className="text-[13px] text-(--muted)">{unitLabel}</span>}
            <span className="text-[14px] text-(--muted)">×</span>
            <span className="num text-[24px] leading-none">{reps}</span>
          </span>
        )}
        {failed ? (
          <span className="block text-[12px] font-semibold text-(--danger)">
            Didn&rsquo;t save. Check your connection and tap again.
          </span>
        ) : showTarget && targetText ? (
          <span className="block text-[12px] text-(--muted)">Target {targetText}</span>
        ) : null}
      </button>
      <button
        type="button"
        onClick={handleQuick}
        disabled={pending}
        aria-label={reps === null || !weightKnown ? `Enter set ${setNumber}` : `Log set ${setNumber} as shown`}
        className={`flex h-11 w-14 shrink-0 items-center justify-center rounded-[12px] transition active:scale-95 disabled:opacity-50 ${
          current ? "bg-(--accent) text-(--accent-contrast)" : "bg-(--surface) text-(--muted)"
        }`}
      >
        {pending ? <span className="text-[13px] font-semibold">…</span> : <CheckGlyph size={20} />}
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
  weightConv = null,
  weightKind: kind = "other",
  unit = "lb",
  onUnitChange,
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
  weightConv?: ReturnType<typeof weightConvention> | null;
  weightKind?: WeightKind;
  unit?: Unit;
  onUnitChange?: (u: Unit) => void;
  onSave: (state: {
    weight: number | null;
    unit: Unit;
    reps: number;
    is_warmup: boolean;
  }) => Promise<void>;
  onCancel?: () => void;
  onDelete?: () => Promise<void>;
}) {
  const [weight, setWeight] = useState<string>(
    initialWeight === null ? "" : formatWeight(initialWeight),
  );
  const switchUnit = (next: Unit) => {
    if (next === unit) return;
    const n = weight.trim() === "" ? null : Number(weight);
    if (n != null && Number.isFinite(n)) setWeight(formatWeight(convert(n, unit, next)));
    onUnitChange?.(next);
  };
  const [reps, setReps] = useState<string>(
    initialReps === null ? "" : String(initialReps),
  );
  const [isWarmup, setIsWarmup] = useState(initialIsWarmup);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    const weightNum = weight.trim() === "" ? null : Number(weight.replace(/,/g, "."));
    const repsNum = Number(reps);
    if (reps.trim() === "" || !Number.isInteger(repsNum) || repsNum < 0) {
      setError("Enter the reps you did.");
      return;
    }
    if (weightNum !== null && !Number.isFinite(weightNum)) {
      setError("Weight needs to be a number, or leave it empty for bodyweight.");
      return;
    }
    setSaving(true);
    try {
      await onSave({ weight: weightNum, unit, reps: repsNum, is_warmup: isWarmup });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save. Try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3 rounded-xl bg-(--accent-soft) p-3 ring-1 ring-(--accent-line)">
      <div className="flex items-center justify-between">
        <span className="text-[14px] font-semibold">
          Set <span className="num text-[16px]">{setNumber}</span>
        </span>
        <button
          type="button"
          onClick={() => setIsWarmup((v) => !v)}
          aria-pressed={isWarmup}
          className={`chip h-8 px-3 text-[13px] ${isWarmup ? "chip-accent" : ""}`}
        >
          Warm-up set
        </button>
      </div>

      <div className="space-y-2">
        <Stepper
          label="Weight"
          value={weight}
          onChange={setWeight}
          step={5}
          nextValue={(cur, dir) => stepWeight(kind, cur, dir, unit)}
          allowEmpty
          disabled={finished}
        />
        <div className="flex items-center gap-2 pl-16">
          <div className="grid grid-cols-2 gap-0.5 rounded-lg bg-(--surface) p-0.5" role="group" aria-label="Weight unit">
            {(["lb", "kg"] as const).map((u) => (
              <button
                key={u}
                type="button"
                onClick={() => switchUnit(u)}
                aria-pressed={unit === u}
                className={`h-8 w-12 rounded-md text-[14px] font-semibold transition-colors ${
                  unit === u ? "bg-(--accent) text-(--accent-contrast)" : "text-(--muted)"
                }`}
              >
                {u}
              </button>
            ))}
          </div>
        </div>
        <WeightSplitHint value={weight} conv={weightConv} />
        <Stepper
          label="Reps"
          value={reps}
          onChange={setReps}
          step={1}
          integer
          disabled={finished}
        />
      </div>

      {error && <p className="text-[13px] text-(--danger)">{error}</p>}

      <div className="flex gap-2">
        {onCancel && (
          <button type="button" onClick={onCancel} className="btn btn-secondary flex-1">
            Cancel
          </button>
        )}
        <button
          type="button"
          onClick={submit}
          disabled={saving || finished}
          className="btn btn-primary flex-[2]"
        >
          {saving ? "Saving…" : "Log set"}
        </button>
      </div>
      {showDelete && onDelete && (
        <button
          type="button"
          onClick={() => {
            if (!confirmDelete) {
              setConfirmDelete(true);
              setTimeout(() => setConfirmDelete(false), 3000);
              return;
            }
            onDelete().catch(() =>
              setError("Couldn't delete the set. Check your connection and try again."),
            );
          }}
          className={`h-9 w-full rounded-lg text-[13px] font-semibold ${confirmDelete ? "text-(--danger)" : "text-(--muted)"}`}
        >
          {confirmDelete ? "Tap again to delete this set" : "Delete set"}
        </button>
      )}
    </div>
  );
}

function Stepper({
  label,
  value,
  onChange,
  step,
  nextValue,
  integer = false,
  allowEmpty = false,
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  step: number;
  nextValue?: (current: number | null, dir: 1 | -1) => number | null;
  integer?: boolean;
  allowEmpty?: boolean;
  disabled?: boolean;
}) {
  const current = Number(value);
  const hasValue = value.trim() !== "" && Number.isFinite(current);

  const bump = (dir: 1 | -1) => {
    if (nextValue) {
      const next = nextValue(hasValue ? current : null, dir);
      if (next === null) {
        if (allowEmpty) onChange("");
        return;
      }
      onChange(String(next));
      return;
    }
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
      <span className="w-14 shrink-0 text-[14px] font-semibold text-(--muted)">
        {label}
      </span>
      <div className="grid min-w-0 flex-1 grid-cols-[3.25rem_1fr_3.25rem] items-stretch overflow-hidden rounded-xl bg-(--surface)">
        <button
          type="button"
          onClick={() => bump(-1)}
          disabled={disabled}
          className="flex h-13 items-center justify-center text-[24px] font-medium text-(--muted) active:bg-(--surface-2) disabled:opacity-40"
          aria-label={`Less ${label.toLowerCase()}`}
        >
          −
        </button>
        <input
          type="text"
          inputMode={integer ? "numeric" : "decimal"}
          value={value}
          // a Swedish keyboard types 32,5 for 32.5
          onChange={(e) => onChange(e.target.value.replace(/,/g, "."))}
          disabled={disabled}
          placeholder={allowEmpty ? "BW" : "0"}
          aria-label={label}
          className="num h-13 w-full bg-transparent text-center outline-none placeholder:text-(--faint) disabled:opacity-60"
          style={{ fontSize: "28px" }}
        />
        <button
          type="button"
          onClick={() => bump(+1)}
          disabled={disabled}
          className="flex h-13 items-center justify-center text-[24px] font-medium text-(--muted) active:bg-(--surface-2) disabled:opacity-40"
          aria-label={`More ${label.toLowerCase()}`}
        >
          +
        </button>
      </div>
    </div>
  );
}

function WeightSplitHint({
  value,
  conv,
}: {
  value: string;
  conv: ReturnType<typeof weightConvention> | null;
}) {
  if (!conv) return null;
  const trimmed = value.trim();
  const num = trimmed === "" ? null : Number(trimmed);
  const hasNum = num !== null && Number.isFinite(num) && num > 0;
  if (!hasNum) return null;

  if (conv.mode === "total" && conv.equipment === "dumbbell") {
    const per = conv.perSide(num!);
    const perLabel = Number.isInteger(per) ? per : per.toFixed(1);
    return (
      <p className="pl-16 text-[13px] text-(--muted)">
        Two dumbbells of <span className="num text-[15px] text-(--foreground)">{perLabel}</span>
      </p>
    );
  }
  return null;
}

// ----- Add exercise picker + finish prompt -----

function SwapSheet({
  exercise,
  library,
  onClose,
  onSwap,
}: {
  exercise: Exercise;
  library: LibraryItem[];
  onClose: () => void;
  onSwap: (exerciseId: string, updatePlan: boolean) => Promise<void>;
}) {
  const [query, setQuery] = useState("");
  const [pickedId, setPickedId] = useState<string | null>(null);
  const [updatePlan, setUpdatePlan] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const original = library.find((l) => l.id === exercise.exercise_id);
  const q = query.trim().toLowerCase();
  const results = useMemo(() => {
    const pool = library.filter((l) => l.id !== exercise.exercise_id);
    if (!q) {
      // nothing typed: same muscle first, the gym-friendly way to fill a gap
      return pool
        .filter((l) => original && l.primary_muscle === original.primary_muscle)
        .slice(0, 8);
    }
    const words = q.split(/\s+/).filter(Boolean);
    return pool
      .filter((l) => words.every((w) => l.name.toLowerCase().includes(w) || l.equipment.includes(w) || l.primary_muscle.includes(w)))
      .slice(0, 20);
  }, [library, exercise.exercise_id, original, q]);

  const submit = async () => {
    if (!pickedId) {
      setError("Pick an exercise first.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSwap(pickedId, updatePlan);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't swap. Try again.");
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/55 sm:items-center sm:p-4" onClick={onClose}>
      <div
        className="safe-bottom max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-[24px] bg-(--surface) p-5 shadow-2xl sm:rounded-[24px]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h2 className="display text-[26px]">Swap {exercise.name}</h2>
            <p className="text-[14px] text-(--muted)">Same sets, reps and rest. Machine taken, something hurts, whatever the reason.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-(--surface-2) text-xl leading-none text-(--muted)"
          >
            ×
          </button>
        </div>

        <div className="mt-4 space-y-3">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search, like leg press or cable"
            aria-label="Search exercises"
            enterKeyHint="search"
            autoComplete="off"
            className="h-12 w-full rounded-xl bg-(--surface-2) px-4 text-[16px] outline-none placeholder:text-(--faint) focus:ring-2 focus:ring-(--accent-line)"
          />
          {!q && results.length > 0 && <p className="label">Works the same muscles</p>}
          <div className="space-y-1">
            {results.length === 0 ? (
              <p className="py-3 text-center text-[14px] text-(--muted)">
                {q ? "Nothing matches. Try a shorter word." : "Search for something to swap in."}
              </p>
            ) : (
              results.map((l) => {
                const on = pickedId === l.id;
                return (
                  <button
                    key={l.id}
                    type="button"
                    onClick={() => setPickedId(l.id)}
                    aria-pressed={on}
                    className={`flex min-h-12 w-full items-center justify-between gap-3 rounded-xl px-3 text-left transition-colors ${
                      on ? "bg-(--accent-soft) ring-1 ring-(--accent-line)" : "bg-(--surface-2)"
                    }`}
                  >
                    <span className="text-[15px] font-semibold">{l.name}</span>
                    <span className="shrink-0 text-[12px] capitalize text-(--muted)">{l.equipment}</span>
                  </button>
                );
              })
            )}
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={updatePlan}
            onClick={() => setUpdatePlan((v) => !v)}
            className="flex w-full items-center gap-3 rounded-xl bg-(--surface-2) p-3 text-left"
          >
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] font-semibold">Change it in my plan too</span>
              <span className="block text-[13px] text-(--muted)">
                {updatePlan ? "Future workouts on this day will use it." : "Off: just this workout. Next time is back to normal."}
              </span>
            </span>
            <span className={`flex h-7 w-12 shrink-0 items-center rounded-full p-0.5 transition-colors ${updatePlan ? "bg-(--accent)" : "bg-(--border)"}`}>
              <span className={`h-6 w-6 rounded-full bg-(--surface) shadow transition-transform ${updatePlan ? "translate-x-5" : ""}`} />
            </span>
          </button>

          {error && <p className="text-[13px] text-(--danger)">{error}</p>}

          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="btn btn-secondary flex-1">
              Cancel
            </button>
            <button type="button" onClick={submit} disabled={saving || !pickedId} className="btn btn-primary flex-[2]">
              {saving ? "Swapping…" : "Swap"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function AddExercisePicker({
  library,
  existingExerciseIds,
  activeSupersetCodes,
  onAdd,
  onClose,
}: {
  library: LibraryItem[];
  existingExerciseIds: string[];
  activeSupersetCodes: string[];
  onAdd: (input: {
    exercise_id: string;
    superset_code: string | null;
    prescribed_sets: number;
    prescribed_reps: string;
  }) => Promise<void>;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [pickedId, setPickedId] = useState<string | null>(null);
  const [placement, setPlacement] = useState<string>("solo");
  const [prescribedSets, setPrescribedSets] = useState("3");
  const [prescribedReps, setPrescribedReps] = useState("8-12");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const results = useMemo(() => {
    const existing = new Set(existingExerciseIds);
    const q = query.trim().toLowerCase();
    return library
      .filter((l) => !existing.has(l.id))
      .filter((l) =>
        q === "" ? true : l.name.toLowerCase().includes(q),
      )
      .slice(0, 20);
  }, [library, query, existingExerciseIds]);

  const nextLetter = (() => {
    const used = new Set(activeSupersetCodes.map((c) => c.toUpperCase()));
    for (let i = 0; i < 26; i++) {
      const l = String.fromCharCode(65 + i);
      if (!used.has(l)) return l;
    }
    return "Z";
  })();

  const submit = async () => {
    if (!pickedId) {
      setError("Pick an exercise first.");
      return;
    }
    const setsNum = Number(prescribedSets);
    if (!Number.isInteger(setsNum) || setsNum < 1) {
      setError("Sets needs to be a whole number, 1 or more.");
      return;
    }
    const reps = prescribedReps.trim();
    if (!reps) {
      setError("Enter the reps, like 8-12.");
      return;
    }

    let supersetCode: string | null = null;
    if (placement === "new") supersetCode = nextLetter;
    else if (placement !== "solo") supersetCode = placement;

    setSaving(true);
    setError(null);
    try {
      await onAdd({
        exercise_id: pickedId,
        superset_code: supersetCode,
        prescribed_sets: setsNum,
        prescribed_reps: reps,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't add the exercise. Try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/55 p-0 sm:items-center sm:p-4">
      <div className="safe-bottom max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-[24px] bg-(--surface) p-5 shadow-2xl sm:rounded-[24px]">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 className="display text-[26px]">Add an exercise</h2>
            <p className="text-[14px] text-(--muted)">
              It&rsquo;s added to this workout only. When you finish, you can
              choose to keep it in your plan.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-(--surface-2) text-xl leading-none text-(--muted) hover:text-(--foreground)"
          >
            ×
          </button>
        </div>

        <div className="mt-3 space-y-3">
          <input
            autoFocus
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search exercises"
            className="h-12 w-full rounded-xl bg-(--surface-2) px-4 text-[16px] outline-none placeholder:text-(--faint) focus:ring-2 focus:ring-(--accent-line)"
          />

          <div className="max-h-56 divide-y divide-(--border) overflow-y-auto rounded-xl bg-(--surface-2)">
            {results.length === 0 ? (
              <p className="px-3 py-4 text-center text-[14px] text-(--muted)">
                No matches. Try a shorter search.
              </p>
            ) : (
              results.map((l) => (
                <button
                  key={l.id}
                  type="button"
                  onClick={() => setPickedId(l.id)}
                  className={`flex min-h-11 w-full items-center justify-between gap-2 px-3 py-2 text-left text-[15px] ${
                    pickedId === l.id
                      ? "bg-(--accent-soft) text-(--accent)"
                      : ""
                  }`}
                >
                  <span className="truncate">{l.name}</span>
                  {l.primary_muscle !== "other" && (
                    <span className="shrink-0 text-[12px] text-(--muted)">
                      {l.primary_muscle.replace("_", " ")}
                    </span>
                  )}
                </button>
              ))
            )}
          </div>

          <div className="space-y-1.5">
            <div className="label">Where it goes</div>
            <div className="flex flex-wrap gap-1.5">
              <PlacementOption
                active={placement === "solo"}
                onClick={() => setPlacement("solo")}
              >
                On its own
              </PlacementOption>
              <PlacementOption
                active={placement === "new"}
                onClick={() => setPlacement("new")}
              >
                New superset {nextLetter}
              </PlacementOption>
              {activeSupersetCodes.map((code) => (
                <PlacementOption
                  key={code}
                  active={placement === code}
                  onClick={() => setPlacement(code)}
                >
                  Add to superset {code}
                </PlacementOption>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <label className="label block space-y-1">
              Sets
              <input
                type="text"
                inputMode="numeric"
                value={prescribedSets}
                onChange={(e) => setPrescribedSets(e.target.value)}
                className="num mt-1 h-12 w-full rounded-xl bg-(--surface-2) px-3 text-[22px] text-(--foreground) outline-none focus:ring-2 focus:ring-(--accent-line)"
              />
            </label>
            <label className="label block space-y-1">
              Reps
              <input
                type="text"
                value={prescribedReps}
                onChange={(e) => setPrescribedReps(e.target.value)}
                placeholder="8-12 or 20, 15, 10"
                className="num mt-1 h-12 w-full rounded-xl bg-(--surface-2) px-3 text-[22px] text-(--foreground) outline-none placeholder:text-[15px] placeholder:text-(--faint) focus:ring-2 focus:ring-(--accent-line)"
              />
            </label>
          </div>

          {error && <p className="text-[13px] text-(--danger)">{error}</p>}

          <button
            type="button"
            onClick={submit}
            disabled={saving || !pickedId}
            className="btn btn-primary btn-block"
          >
            {saving ? "Adding…" : "Add to workout"}
          </button>
        </div>
      </div>
    </div>
  );
}

function PlacementOption({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`h-10 rounded-full px-4 text-[14px] font-semibold ${
        active
          ? "bg-(--accent) text-(--accent-contrast)"
          : "bg-(--surface-2) text-(--muted)"
      }`}
    >
      {children}
    </button>
  );
}

function FinishWorkoutPrompt({
  sessionId,
  planName,
  notes,
  onClose,
}: {
  sessionId: string;
  planName: string | null;
  notes: string;
  onClose: () => void;
}) {
  const [pending, setPending] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const run = async (mode: "keep" | "save" | "fork") => {
    setError(null);
    setPending(mode);
    try {
      if (mode === "save") await saveExtrasToCurrentPhase(sessionId);
      if (mode === "fork") await saveExtrasAsNewPhase(sessionId, newName);
      await finishSession(sessionId, notes);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't finish the workout. Try again.");
      setPending(null);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/55 p-0 sm:items-center sm:p-4">
      <div className="safe-bottom max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-[24px] bg-(--surface) p-5 shadow-2xl sm:rounded-[24px]">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 className="display text-[26px]">Finish workout</h2>
            <p className="text-[14px] text-(--muted)">
              You added exercises today. Keep them for next time?
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-(--surface-2) text-xl leading-none text-(--muted) hover:text-(--foreground)"
          >
            ×
          </button>
        </div>

        <div className="mt-3 space-y-2">
          <button
            type="button"
            onClick={() => run("keep")}
            disabled={!!pending}
            className="flex w-full flex-col items-start gap-0.5 rounded-xl bg-(--surface-2) p-4 text-left ring-(--accent-line) hover:ring-1 disabled:opacity-60"
          >
            <span className="text-[16px] font-semibold">
              Just this workout
            </span>
            <span className="text-[13px] text-(--muted)">
              Your sets stay logged. The plan doesn&rsquo;t change.
            </span>
          </button>

          <button
            type="button"
            onClick={() => run("save")}
            disabled={!!pending}
            className="flex w-full flex-col items-start gap-0.5 rounded-xl bg-(--surface-2) p-4 text-left ring-(--accent-line) hover:ring-1 disabled:opacity-60"
          >
            <span className="text-[16px] font-semibold">
              Add to {planName ?? "this plan"}
            </span>
            <span className="text-[13px] text-(--muted)">
              They&rsquo;ll be part of this day from now on.
            </span>
          </button>

          <div className="space-y-2 rounded-xl bg-(--surface-2) p-4">
            <div className="text-[16px] font-semibold">Save as a new plan</div>
            <p className="text-[13px] text-(--muted)">
              Makes a copy of {planName ?? "this plan"} with today&rsquo;s
              changes and switches you to it. The original stays as it was.
            </p>
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder={
                planName
                  ? `${planName} (modified)`
                  : "Name for the new plan"
              }
              className="h-12 w-full rounded-xl bg-(--surface) px-3 text-[16px] outline-none placeholder:text-(--faint) focus:ring-2 focus:ring-(--accent-line)"
            />
            <button
              type="button"
              onClick={() => run("fork")}
              disabled={!!pending}
              className="btn btn-primary btn-block"
            >
              {pending === "fork" ? "Saving…" : "Save as a new plan"}
            </button>
          </div>

          {error && <p className="text-[13px] text-(--danger)">{error}</p>}
        </div>
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

// ----- Warm-up picker -----

const BODYWEIGHT_NAME =
  /push-?ups?|pull-?ups?|chin-?ups?|\bdips?\b|plank|hold|bridge|frog|pulse|leg raise|crunch|dead ?bug|bear|wall slide|hip lift|copenhagen|v-?ups?|sit-?ups?|burpee|jump|walk|run\b|bike|row(ing)? machine|rower|double unders|mountain climber|air squat|side-lying/i;

function isBodyweight(name: string, equipment: string | null): boolean {
  if (equipment === "bodyweight") return true;
  // free weights and cables always need a number
  if (equipment === "barbell" || equipment === "dumbbell" || equipment === "kettlebell" || equipment === "cable") {
    return false;
  }
  // machines and unknown equipment: bikes, rowers and body-only moves don't
  return BODYWEIGHT_NAME.test(name);
}

// plan notes were written in lowercase ("tempo: controlled"); show them
// as sentences
function sentence(text: string): string {
  return text.replace(/(^|[.!?]\s+)([a-z])/g, (_, p, c: string) => p + c.toUpperCase());
}
