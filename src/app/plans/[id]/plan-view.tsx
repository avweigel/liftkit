"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import {
  addPlanDayExercise,
  duplicatePlan,
  removePlanDayExercise,
  renamePlanDay,
  reorderDayExercise,
  updatePlanDayExercise,
} from "@/lib/actions/plans";
import { startSession } from "@/lib/actions/sessions";
import type { Exercise, PlanDetail, PlanDay, PlanDayExerciseRow } from "./types";

type Props = {
  plan: PlanDetail;
  library: Exercise[];
  canEdit: boolean;
};

export function PlanView({ plan, library, canEdit }: Props) {
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();

  const onDuplicate = () => {
    startTransition(async () => {
      await duplicatePlan(plan.id);
    });
  };

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 space-y-6 px-4 py-8 sm:px-6 sm:py-10">
      <header className="space-y-3">
        <Link
          href="/plans"
          className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
        >
          ← plans
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="truncate text-2xl font-semibold tracking-tight">
                {plan.name}
              </h1>
              {plan.is_public && (
                <span className="rounded border border-zinc-200 px-1.5 text-xs text-zinc-500 dark:border-zinc-800">
                  public
                </span>
              )}
            </div>
            {plan.description && (
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                {plan.description}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {canEdit && (
              <button
                type="button"
                onClick={() => setEditing((v) => !v)}
                className="inline-flex h-9 items-center rounded-lg border border-zinc-300 bg-white px-3 text-sm font-medium hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-950 dark:hover:bg-zinc-900"
              >
                {editing ? "done editing" : "edit"}
              </button>
            )}
            <button
              type="button"
              onClick={onDuplicate}
              disabled={pending}
              className="inline-flex h-9 items-center rounded-lg border border-zinc-300 bg-white px-3 text-sm font-medium hover:bg-zinc-50 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-950 dark:hover:bg-zinc-900"
            >
              {pending ? "…" : "duplicate"}
            </button>
          </div>
        </div>
        {plan.source_url && (
          <p className="text-xs text-zinc-500">
            source:{" "}
            <a
              href={plan.source_url}
              target="_blank"
              rel="noreferrer"
              className="underline"
            >
              original sheet
            </a>
          </p>
        )}
      </header>

      <div className="space-y-6">
        {plan.plan_weeks.flatMap((w) =>
          w.plan_days.map((d) => (
            <DayCard
              key={d.id}
              planId={plan.id}
              day={d}
              library={library}
              editing={editing}
            />
          )),
        )}
      </div>
    </main>
  );
}

function DayCard({
  planId,
  day,
  library,
  editing,
}: {
  planId: string;
  day: PlanDay;
  library: Exercise[];
  editing: boolean;
}) {
  const [pending, startTransition] = useTransition();

  const onRename = (name: string) => {
    if ((name || "") === (day.name || "")) return;
    startTransition(async () => {
      await renamePlanDay(day.id, planId, name);
    });
  };

  const onStart = () => {
    startTransition(async () => {
      await startSession(day.id);
    });
  };

  return (
    <section className="space-y-3 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="text-xs uppercase tracking-wider text-zinc-500">
            day {day.day_number}
          </div>
          {editing ? (
            <input
              defaultValue={day.name ?? ""}
              onBlur={(e) => onRename(e.target.value)}
              placeholder="day name"
              className="mt-1 w-full rounded border border-zinc-300 bg-white px-2 py-1 text-base font-medium outline-none focus:border-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:focus:border-zinc-100"
            />
          ) : (
            <h2 className="mt-0.5 text-base font-semibold">
              {day.name?.trim() || `day ${day.day_number}`}
            </h2>
          )}
        </div>
        {!editing && (
          <button
            type="button"
            onClick={onStart}
            disabled={pending}
            className="inline-flex h-10 items-center rounded-lg bg-(--accent) px-4 text-sm font-semibold text-(--accent-contrast) shadow-sm active:scale-[0.99] disabled:opacity-60"
          >
            {pending ? "starting…" : "start workout →"}
          </button>
        )}
      </div>

      {day.notes && !editing && (
        <p className="text-xs text-zinc-500">{day.notes}</p>
      )}

      {day.plan_day_exercises.length === 0 ? (
        <p className="rounded border border-dashed border-zinc-300 p-4 text-center text-xs text-zinc-500 dark:border-zinc-700">
          no exercises
        </p>
      ) : (
        <ul className="divide-y divide-zinc-200 overflow-hidden rounded border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
          {day.plan_day_exercises.map((ex, i) => (
            <ExerciseRow
              key={ex.id}
              planId={planId}
              dayId={day.id}
              ex={ex}
              editing={editing}
              isFirst={i === 0}
              isLast={i === day.plan_day_exercises.length - 1}
            />
          ))}
        </ul>
      )}

      {editing && (
        <AddExerciseControl
          planId={planId}
          dayId={day.id}
          library={library}
          excludedIds={day.plan_day_exercises
            .map((e) => e.exercise?.id)
            .filter((id): id is string => !!id)}
        />
      )}
    </section>
  );
}

function ExerciseRow({
  planId,
  dayId,
  ex,
  editing,
  isFirst,
  isLast,
}: {
  planId: string;
  dayId: string;
  ex: PlanDayExerciseRow;
  editing: boolean;
  isFirst: boolean;
  isLast: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [sets, setSets] = useState(String(ex.prescribed_sets));
  const [reps, setReps] = useState(ex.prescribed_reps);
  const [weight, setWeight] = useState(
    ex.prescribed_weight === null ? "" : String(ex.prescribed_weight),
  );
  const [rest, setRest] = useState(
    ex.rest_seconds === null ? "" : String(ex.rest_seconds),
  );
  const [notes, setNotes] = useState(ex.notes ?? "");

  const save = () => {
    setError(null);
    const setsNum = Number(sets);
    const restNum = rest.trim() === "" ? null : Number(rest);
    const weightNum = weight.trim() === "" ? null : Number(weight);
    if (!Number.isInteger(setsNum) || setsNum < 1) {
      setError("sets must be a positive integer");
      return;
    }
    if (reps.trim() === "") {
      setError("reps required");
      return;
    }
    if (weightNum !== null && !Number.isFinite(weightNum)) {
      setError("invalid weight");
      return;
    }
    if (restNum !== null && (!Number.isInteger(restNum) || restNum < 0)) {
      setError("rest must be a non-negative integer");
      return;
    }
    startTransition(async () => {
      try {
        await updatePlanDayExercise(ex.id, planId, {
          prescribed_sets: setsNum,
          prescribed_reps: reps.trim(),
          prescribed_weight: weightNum,
          rest_seconds: restNum,
          notes: notes.trim() || null,
        });
      } catch (e) {
        setError(e instanceof Error ? e.message : "save failed");
      }
    });
  };

  const move = (direction: "up" | "down") => {
    startTransition(async () => {
      await reorderDayExercise(ex.id, dayId, planId, direction);
    });
  };

  const remove = () => {
    if (!confirm(`remove ${ex.exercise?.name ?? "this exercise"}?`)) return;
    startTransition(async () => {
      await removePlanDayExercise(ex.id, planId);
    });
  };

  if (!editing) {
    return (
      <li className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm">
        <div className="min-w-0">
          <div className="truncate font-medium">
            {ex.exercise?.name ?? "(deleted)"}
          </div>
          {ex.notes && <p className="text-xs text-zinc-500">{ex.notes}</p>}
        </div>
        <div className="shrink-0 text-xs text-zinc-500 tabular-nums">
          {ex.prescribed_sets}×{ex.prescribed_reps}
          {ex.prescribed_weight !== null ? ` @ ${ex.prescribed_weight}` : ""}
          {ex.rest_seconds !== null ? ` · ${ex.rest_seconds}s` : ""}
        </div>
      </li>
    );
  }

  return (
    <li className="space-y-2 px-3 py-3 text-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="truncate font-medium">
            {ex.exercise?.name ?? "(deleted)"}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => move("up")}
            disabled={isFirst || pending}
            className="h-7 w-7 rounded border border-zinc-300 text-xs disabled:opacity-30 dark:border-zinc-700"
            aria-label="move up"
          >
            ↑
          </button>
          <button
            type="button"
            onClick={() => move("down")}
            disabled={isLast || pending}
            className="h-7 w-7 rounded border border-zinc-300 text-xs disabled:opacity-30 dark:border-zinc-700"
            aria-label="move down"
          >
            ↓
          </button>
          <button
            type="button"
            onClick={remove}
            disabled={pending}
            className="h-7 rounded border border-red-300 px-2 text-xs text-red-700 disabled:opacity-30 dark:border-red-900 dark:text-red-400"
          >
            remove
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Field label="sets">
          <input
            type="text"
            inputMode="numeric"
            value={sets}
            onChange={(e) => setSets(e.target.value)}
            onBlur={save}
            className={inputCls}
          />
        </Field>
        <Field label="reps">
          <input
            type="text"
            value={reps}
            onChange={(e) => setReps(e.target.value)}
            onBlur={save}
            className={inputCls}
          />
        </Field>
        <Field label="weight">
          <input
            type="text"
            inputMode="decimal"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            onBlur={save}
            placeholder="—"
            className={inputCls}
          />
        </Field>
        <Field label="rest (s)">
          <input
            type="text"
            inputMode="numeric"
            value={rest}
            onChange={(e) => setRest(e.target.value)}
            onBlur={save}
            placeholder="—"
            className={inputCls}
          />
        </Field>
      </div>

      <Field label="notes">
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={save}
          rows={1}
          className={`${inputCls} resize-y`}
        />
      </Field>

      {error && <p className="text-xs text-red-600">{error}</p>}
    </li>
  );
}

function AddExerciseControl({
  planId,
  dayId,
  library,
  excludedIds,
}: {
  planId: string;
  dayId: string;
  library: Exercise[];
  excludedIds: string[];
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [pending, startTransition] = useTransition();

  const excluded = new Set(excludedIds);
  const filtered = library
    .filter((e) => !excluded.has(e.id))
    .filter((e) => e.name.toLowerCase().includes(query.toLowerCase()))
    .slice(0, 10);

  const add = (exerciseId: string) => {
    startTransition(async () => {
      await addPlanDayExercise(dayId, planId, exerciseId, {
        prescribed_sets: 3,
        prescribed_reps: "8-12",
        prescribed_weight: null,
        rest_seconds: 60,
        notes: null,
      });
      setOpen(false);
      setQuery("");
    });
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="h-9 w-full rounded-lg border border-dashed border-zinc-300 text-sm text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-900"
      >
        + add exercise
      </button>
    );
  }

  return (
    <div className="space-y-2 rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center gap-2">
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="search exercises…"
          className={inputCls}
        />
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setQuery("");
          }}
          className="text-xs text-zinc-500"
        >
          cancel
        </button>
      </div>
      <ul className="divide-y divide-zinc-200 rounded border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-950">
        {filtered.length === 0 ? (
          <li className="px-3 py-2 text-xs text-zinc-500">no match</li>
        ) : (
          filtered.map((e) => (
            <li key={e.id}>
              <button
                type="button"
                onClick={() => add(e.id)}
                disabled={pending}
                className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-zinc-50 disabled:opacity-60 dark:hover:bg-zinc-900"
              >
                <span className="truncate">{e.name}</span>
                <span className="shrink-0 text-xs text-zinc-500">
                  {e.primary_muscle}
                </span>
              </button>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1 text-xs">
      <span className="text-zinc-500">{label}</span>
      {children}
    </label>
  );
}

const inputCls =
  "block w-full rounded border border-zinc-300 bg-white px-2 py-1 text-sm outline-none focus:border-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:focus:border-zinc-100";
