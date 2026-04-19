"use client";

import { useState, useTransition } from "react";
import {
  deleteSessionSet,
  finishSession,
  upsertSessionSet,
} from "@/lib/actions/sessions";

type Exercise = {
  plan_day_exercise_id: string;
  exercise_id: string;
  name: string;
  prescribed_sets: number;
  prescribed_reps: string;
  prescribed_weight: number | null;
  rest_seconds: number | null;
  notes: string | null;
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
  const [pending, startTransition] = useTransition();

  const setsByExercise = (exerciseId: string) =>
    sets
      .filter((s) => s.exercise_id === exerciseId)
      .sort((a, b) => a.set_number - b.set_number);

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
      const withoutOld = prev.filter(
        (s) =>
          !(set.id && s.id === set.id) &&
          !(s.exercise_id === exerciseId && s.set_number === set.set_number),
      );
      return [
        ...withoutOld,
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
    <div className="space-y-4">
      {exercises.length === 0 && (
        <p className="rounded-lg border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500 dark:border-zinc-700">
          no exercises on this day. this is an ad hoc session.
        </p>
      )}

      <div className="space-y-3">
        {exercises.map((ex) => (
          <ExerciseCard
            key={ex.plan_day_exercise_id}
            ex={ex}
            sets={setsByExercise(ex.exercise_id)}
            onUpsert={upsert}
            onDelete={del}
            finished={finished}
          />
        ))}
      </div>

      {!finished && (
        <div className="space-y-3 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
          <label className="block space-y-1 text-sm">
            <span className="text-zinc-500">session notes</span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="anything to remember about today"
              className="w-full resize-y rounded border border-zinc-300 bg-white px-2 py-1 text-sm outline-none focus:border-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:focus:border-zinc-100"
            />
          </label>
          <button
            type="button"
            onClick={finish}
            disabled={pending}
            className="inline-flex h-11 items-center rounded-lg bg-zinc-900 px-5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            {pending ? "finishing…" : "finish workout"}
          </button>
        </div>
      )}
    </div>
  );
}

function ExerciseCard({
  ex,
  sets,
  onUpsert,
  onDelete,
  finished,
}: {
  ex: Exercise;
  sets: SessionSet[];
  onUpsert: (
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
  ) => Promise<void>;
  onDelete: (setId: string) => Promise<void>;
  finished: boolean;
}) {
  const nextSetNumber =
    sets.length === 0
      ? 1
      : Math.max(...sets.map((s) => s.set_number)) + 1;

  return (
    <section className="space-y-3 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="min-w-0">
          <h2 className="truncate text-base font-semibold">{ex.name}</h2>
          <p className="mt-0.5 text-xs text-zinc-500">
            prescribed: {ex.prescribed_sets}×{ex.prescribed_reps}
            {ex.prescribed_weight !== null
              ? ` @ ${ex.prescribed_weight}`
              : ""}
            {ex.rest_seconds !== null ? ` · ${ex.rest_seconds}s rest` : ""}
          </p>
          {ex.notes && (
            <p className="mt-0.5 text-xs text-zinc-500">{ex.notes}</p>
          )}
        </div>
      </header>

      <div className="space-y-2">
        {sets.map((s) => (
          <SetRow
            key={s.id}
            exerciseId={ex.exercise_id}
            initial={s}
            onSave={(set) => onUpsert(ex.exercise_id, { ...set, id: s.id })}
            onDelete={() => onDelete(s.id)}
            finished={finished}
          />
        ))}
        {!finished && (
          <NewSetRow
            key={`new-${nextSetNumber}-${sets.length}`}
            exerciseId={ex.exercise_id}
            setNumber={nextSetNumber}
            suggestedWeight={
              sets.length > 0 ? sets[sets.length - 1].weight : ex.prescribed_weight
            }
            onAdd={(set) => onUpsert(ex.exercise_id, { ...set, id: null })}
          />
        )}
      </div>
    </section>
  );
}

type EditableSet = {
  set_number: number;
  weight: number | null;
  reps: number;
  rpe: number | null;
  is_warmup: boolean;
  notes: string | null;
};

function SetRow({
  initial,
  onSave,
  onDelete,
  finished,
}: {
  exerciseId: string;
  initial: SessionSet;
  onSave: (set: EditableSet) => Promise<void>;
  onDelete: () => Promise<void>;
  finished: boolean;
}) {
  const [weight, setWeight] = useState(
    initial.weight === null ? "" : String(initial.weight),
  );
  const [reps, setReps] = useState(String(initial.reps));
  const [rpe, setRpe] = useState(
    initial.rpe === null ? "" : String(initial.rpe),
  );
  const [isWarmup, setIsWarmup] = useState(initial.is_warmup);
  const [notes, setNotes] = useState(initial.notes ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setError(null);
    const weightNum = weight.trim() === "" ? null : Number(weight);
    const repsNum = Number(reps);
    const rpeNum = rpe.trim() === "" ? null : Number(rpe);
    if (!Number.isInteger(repsNum) || repsNum < 0) {
      setError("reps must be ≥ 0");
      return;
    }
    if (weightNum !== null && !Number.isFinite(weightNum)) {
      setError("invalid weight");
      return;
    }
    if (rpeNum !== null && (rpeNum < 1 || rpeNum > 10)) {
      setError("rpe must be 1-10");
      return;
    }
    setSaving(true);
    try {
      await onSave({
        set_number: initial.set_number,
        weight: weightNum,
        reps: repsNum,
        rpe: rpeNum,
        is_warmup: isWarmup,
        notes: notes.trim() || null,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded border border-zinc-200 bg-zinc-50 p-2 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="grid grid-cols-[auto,1fr,1fr,1fr,auto] items-center gap-2">
        <span className="w-6 text-center text-xs text-zinc-500 tabular-nums">
          {initial.set_number}
        </span>
        <CompactField label="wt">
          <input
            type="text"
            inputMode="decimal"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            onBlur={save}
            disabled={finished}
            className={setInputCls}
          />
        </CompactField>
        <CompactField label="reps">
          <input
            type="text"
            inputMode="numeric"
            value={reps}
            onChange={(e) => setReps(e.target.value)}
            onBlur={save}
            disabled={finished}
            className={setInputCls}
          />
        </CompactField>
        <CompactField label="rpe">
          <input
            type="text"
            inputMode="decimal"
            value={rpe}
            onChange={(e) => setRpe(e.target.value)}
            onBlur={save}
            disabled={finished}
            placeholder="—"
            className={setInputCls}
          />
        </CompactField>
        {!finished && (
          <button
            type="button"
            onClick={onDelete}
            className="h-8 rounded border border-red-300 px-2 text-xs text-red-700 dark:border-red-900 dark:text-red-400"
            aria-label="delete set"
          >
            ×
          </button>
        )}
      </div>
      {!finished && (
        <div className="mt-2 flex items-center gap-3 text-xs">
          <label className="flex items-center gap-1">
            <input
              type="checkbox"
              checked={isWarmup}
              onChange={(e) => {
                setIsWarmup(e.target.checked);
                setTimeout(save, 0);
              }}
            />
            <span className="text-zinc-500">warmup</span>
          </label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={save}
            placeholder="notes"
            className="flex-1 rounded border border-zinc-300 bg-white px-2 py-0.5 text-xs outline-none focus:border-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:focus:border-zinc-100"
          />
          {saving && <span className="text-xs text-zinc-500">saving…</span>}
        </div>
      )}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

function NewSetRow({
  setNumber,
  suggestedWeight,
  onAdd,
}: {
  exerciseId: string;
  setNumber: number;
  suggestedWeight: number | null;
  onAdd: (set: EditableSet) => Promise<void>;
}) {
  const [weight, setWeight] = useState(
    suggestedWeight === null ? "" : String(suggestedWeight),
  );
  const [reps, setReps] = useState("");
  const [isWarmup, setIsWarmup] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setError(null);
    if (reps.trim() === "") {
      setError("enter reps to log the set");
      return;
    }
    const weightNum = weight.trim() === "" ? null : Number(weight);
    const repsNum = Number(reps);
    if (!Number.isInteger(repsNum) || repsNum < 0) {
      setError("reps must be ≥ 0");
      return;
    }
    if (weightNum !== null && !Number.isFinite(weightNum)) {
      setError("invalid weight");
      return;
    }
    setSaving(true);
    try {
      await onAdd({
        set_number: setNumber,
        weight: weightNum,
        reps: repsNum,
        rpe: null,
        is_warmup: isWarmup,
        notes: null,
      });
      setReps("");
      setIsWarmup(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded border border-dashed border-zinc-300 p-2 dark:border-zinc-700">
      <div className="grid grid-cols-[auto,1fr,1fr,auto] items-center gap-2">
        <span className="w-6 text-center text-xs text-zinc-500 tabular-nums">
          {setNumber}
        </span>
        <CompactField label="wt">
          <input
            type="text"
            inputMode="decimal"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            placeholder={suggestedWeight !== null ? String(suggestedWeight) : "—"}
            className={setInputCls}
          />
        </CompactField>
        <CompactField label="reps">
          <input
            type="text"
            inputMode="numeric"
            value={reps}
            onChange={(e) => setReps(e.target.value)}
            placeholder="reps"
            className={setInputCls}
          />
        </CompactField>
        <button
          type="button"
          onClick={submit}
          disabled={saving}
          className="h-8 rounded bg-zinc-900 px-3 text-xs font-medium text-white disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900"
        >
          {saving ? "…" : "log"}
        </button>
      </div>
      <label className="mt-2 flex items-center gap-1 text-xs">
        <input
          type="checkbox"
          checked={isWarmup}
          onChange={(e) => setIsWarmup(e.target.checked)}
        />
        <span className="text-zinc-500">warmup</span>
      </label>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

function CompactField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-[10px] uppercase tracking-wider text-zinc-500">
        {label}
      </span>
      {children}
    </label>
  );
}

const setInputCls =
  "block h-8 w-full rounded border border-zinc-300 bg-white px-2 text-sm outline-none focus:border-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:focus:border-zinc-100 disabled:opacity-60";
