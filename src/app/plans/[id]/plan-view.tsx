"use client";

import { useState, useTransition } from "react";
import { ChevronDown, ChevronUp, Plus, X } from "lucide-react";
import {
  addPlanDayExercise,
  duplicatePlan,
  removePlanDayExercise,
  renamePlanDay,
  renamePlanExerciseVariant,
  reorderDayExercise,
  setActivePlan,
  updatePlanDayExercise,
} from "@/lib/actions/plans";
import { startSession } from "@/lib/actions/sessions";
import { groupIntoSupersets, type WithSetCode } from "@/lib/set-code";
import { PageHeader } from "@/components/page-header";
import { DismissibleHint, HINT_KEYS } from "@/components/dismissible-hint";
import { dayHeading, isCorePlan } from "../plan-display";
import type { Exercise, PlanDetail, PlanDay, PlanDayExerciseRow } from "./types";

type Props = {
  plan: PlanDetail;
  library: Exercise[];
  canEdit: boolean;
  isActive: boolean;
};

export function PlanView({ plan, library, canEdit, isActive }: Props) {
  const [editing, setEditing] = useState(false);
  const [activating, startActivate] = useTransition();
  const [duplicating, startDuplicate] = useTransition();
  const core = isCorePlan(plan.name);

  const days = plan.plan_weeks.flatMap((w) => w.plan_days);

  const onDuplicate = () => {
    startDuplicate(async () => {
      await duplicatePlan(plan.id);
    });
  };

  const onSetActive = (next: boolean) => {
    startActivate(async () => {
      await setActivePlan(next ? plan.id : null);
    });
  };

  return (
    <main className="mx-auto w-full max-w-lg flex-1 space-y-6 px-4 pt-4 pb-tabbar">
      <div className="space-y-4">
        <PageHeader
          title={plan.name}
          subtitle={plan.description ?? undefined}
          back={{ href: "/plans", label: "Plans" }}
        />

        <div className="flex flex-wrap gap-1.5">
          {isActive && <span className="chip chip-accent">Active plan</span>}
          {core && <span className="chip">Daily A/B routine</span>}
          <span className="chip">
            <span className="num">{days.length}</span>
            {days.length === 1 ? "day" : "days"}
          </span>
          {plan.is_public && <span className="chip">Public</span>}
        </div>

        {!editing && !isActive && (
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => onSetActive(true)}
              disabled={activating}
              className="btn btn-primary btn-block"
            >
              {activating ? "Saving…" : "Set as active plan"}
            </button>
            <DismissibleHint storageKey={HINT_KEYS.planDetailStart}>
              <p className="pr-9 text-[13px] text-(--muted)">
                Today&rsquo;s workout on the home page will come from this
                plan, picked by day of the week. You can switch any time and
                your logged workouts stay.
              </p>
            </DismissibleHint>
          </div>
        )}

        <div className="flex gap-2">
          {canEdit && (
            <button
              type="button"
              onClick={() => setEditing((v) => !v)}
              className={`btn flex-1 ${editing ? "btn-primary" : "btn-secondary"}`}
            >
              {editing ? "Done editing" : "Edit plan"}
            </button>
          )}
          {!editing && (
            <button
              type="button"
              onClick={onDuplicate}
              disabled={duplicating}
              className="btn btn-secondary flex-1"
            >
              {duplicating ? "Duplicating…" : "Duplicate"}
            </button>
          )}
        </div>

        {plan.source_url && !editing && (
          <a
            href={plan.source_url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-11 items-center text-[15px] font-medium text-(--accent)"
          >
            Open source sheet
          </a>
        )}
      </div>

      <div className="space-y-4">
        {days.length === 0 ? (
          <p className="card p-6 text-center text-[15px] text-(--muted)">
            This plan has no days yet. Import a sheet with rows for each day to
            fill it in.
          </p>
        ) : (
          days.map((d) => (
            <DayCard
              key={d.id}
              planId={plan.id}
              day={d}
              core={core}
              library={library}
              editing={editing}
            />
          ))
        )}
      </div>

      {isActive && !editing && (
        <div className="flex justify-center pt-2">
          <button
            type="button"
            onClick={() => onSetActive(false)}
            disabled={activating}
            className="btn btn-ghost h-11 text-(--muted)"
          >
            {activating ? "Saving…" : "Stop using this plan"}
          </button>
        </div>
      )}
    </main>
  );
}

function DayCard({
  planId,
  day,
  core,
  library,
  editing,
}: {
  planId: string;
  day: PlanDay;
  core: boolean;
  library: Exercise[];
  editing: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [pastOpen, setPastOpen] = useState(false);
  const [pastValue, setPastValue] = useState(() =>
    toLocalInputValue(new Date()),
  );
  const heading = dayHeading(day.day_number, day.name, core);

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

  const onStartPast = () => {
    const iso = new Date(pastValue).toISOString();
    startTransition(async () => {
      await startSession(day.id, iso);
    });
  };

  return (
    <section className="card space-y-4 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {heading.weekday && (
            <div className="label text-(--accent)">{heading.weekday}</div>
          )}
          {editing ? (
            <input
              defaultValue={day.name ?? ""}
              onBlur={(e) => onRename(e.target.value)}
              placeholder="Day name"
              aria-label="Day name"
              className={`${inputCls} mt-1 font-semibold`}
            />
          ) : (
            <h2 className="display mt-0.5 text-[22px]">{heading.name}</h2>
          )}
        </div>
        {!editing && (
          <button
            type="button"
            onClick={onStart}
            disabled={pending}
            className="btn btn-primary shrink-0 px-5"
          >
            {pending && !pastOpen ? "Starting…" : "Start"}
          </button>
        )}
      </div>

      {day.notes && !editing && (
        <p className="text-[14px] text-(--muted)">{day.notes}</p>
      )}

      {day.plan_day_exercises.length === 0 ? (
        <p className="rounded-xl bg-(--surface-2) p-4 text-center text-[14px] text-(--muted)">
          {editing
            ? "No exercises yet. Add one below."
            : "No exercises yet. Tap Edit plan to add some."}
        </p>
      ) : editing ? (
        <ul className="space-y-2">
          {day.plan_day_exercises.map((ex, i) => (
            <ExerciseEditRow
              key={ex.id}
              planId={planId}
              dayId={day.id}
              ex={ex}
              isFirst={i === 0}
              isLast={i === day.plan_day_exercises.length - 1}
            />
          ))}
        </ul>
      ) : (
        <ExerciseGroups exercises={day.plan_day_exercises} />
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

      {!editing &&
        (pastOpen ? (
          <div className="space-y-3 rounded-xl bg-(--surface-2) p-3">
            <label className="block space-y-1.5">
              <span className="label">When did you train?</span>
              <input
                type="datetime-local"
                value={pastValue}
                onChange={(e) => setPastValue(e.target.value)}
                className={inputCls}
              />
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onStartPast}
                disabled={pending}
                className="btn btn-primary flex-1"
              >
                {pending ? "Starting…" : "Log this workout"}
              </button>
              <button
                type="button"
                onClick={() => setPastOpen(false)}
                className="btn btn-secondary"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setPastOpen(true)}
            className="btn btn-ghost -ml-2 h-11 text-[14px]"
          >
            Log a past workout
          </button>
        ))}
    </section>
  );
}

function ExerciseGroups({ exercises }: { exercises: PlanDayExerciseRow[] }) {
  const groups = groupIntoSupersets(exercises);
  const anyCodes = groups.some((g) => g.letter);

  return (
    <ol className="space-y-2">
      {groups.map((g) => {
        const superset = g.items.length > 1;
        return (
          <li key={g.id} className="flex gap-3">
            {anyCodes && (
              <div className="flex w-7 shrink-0 flex-col items-center pt-3">
                {g.letter && (
                  <span
                    className={`num flex h-7 w-7 items-center justify-center rounded-full text-[13px] ${
                      superset
                        ? "bg-(--accent-soft) text-(--accent)"
                        : "bg-(--surface-2) text-(--muted)"
                    }`}
                  >
                    {g.letter}
                  </span>
                )}
                {superset && (
                  <span
                    aria-hidden
                    className="mt-1 mb-3 w-0.5 flex-1 rounded-full bg-(--accent-line)"
                  />
                )}
              </div>
            )}
            <div className="min-w-0 flex-1 rounded-xl bg-(--surface-2)">
              {superset && (
                <div className="label px-3 pt-2.5">
                  Superset
                </div>
              )}
              <ul className="divide-y divide-(--border)">
                {g.items.map((ex) => (
                  <ExerciseLine key={ex.id} ex={ex} />
                ))}
              </ul>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function ExerciseLine({ ex }: { ex: WithSetCode<PlanDayExerciseRow> }) {
  const rest =
    ex.rest_seconds !== null && ex.rest_seconds > 0 ? ex.rest_seconds : null;
  return (
    <li className="flex items-start justify-between gap-3 px-3 py-2.5">
      <div className="min-w-0">
        <div className="text-[15px] font-medium">
          {ex.exercise?.name ?? "Deleted exercise"}
        </div>
        {ex.cleanNotes && (
          <p className="mt-0.5 text-[13px] text-(--muted)">{ex.cleanNotes}</p>
        )}
      </div>
      <div className="shrink-0 text-right">
        <div className="num text-[17px]">
          {ex.prescribed_sets} &times; {ex.prescribed_reps}
        </div>
        {(ex.prescribed_weight !== null || rest !== null) && (
          <div className="text-[12px] text-(--muted)">
            {ex.prescribed_weight !== null && (
              <span className="num">@ {ex.prescribed_weight}</span>
            )}
            {ex.prescribed_weight !== null && rest !== null && ", "}
            {rest !== null && (
              <span>
                rest <span className="num">{rest}</span> s
              </span>
            )}
          </div>
        )}
      </div>
    </li>
  );
}

function ExerciseEditRow({
  planId,
  dayId,
  ex,
  isFirst,
  isLast,
}: {
  planId: string;
  dayId: string;
  ex: PlanDayExerciseRow;
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
      setError("Sets must be a whole number of 1 or more.");
      return;
    }
    if (reps.trim() === "") {
      setError("Reps can't be empty.");
      return;
    }
    if (weightNum !== null && !Number.isFinite(weightNum)) {
      setError("Weight must be a number.");
      return;
    }
    if (restNum !== null && (!Number.isInteger(restNum) || restNum < 0)) {
      setError("Rest must be a whole number of seconds.");
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
        setError(e instanceof Error ? e.message : "Couldn't save. Try again.");
      }
    });
  };

  const move = (direction: "up" | "down") => {
    startTransition(async () => {
      await reorderDayExercise(ex.id, dayId, planId, direction);
    });
  };

  const remove = () => {
    if (!confirm(`Remove ${ex.exercise?.name ?? "this exercise"} from this day?`))
      return;
    startTransition(async () => {
      await removePlanDayExercise(ex.id, planId);
    });
  };

  const renameVariant = () => {
    const current = ex.exercise?.name ?? "";
    const next = window.prompt(
      'Rename this row to create or use a variant, for example add " (L)" for the left side. Only this plan row changes. The library keeps the original.',
      current,
    );
    if (next === null) return;
    const trimmed = next.trim();
    if (trimmed.length === 0 || trimmed === current) return;
    startTransition(async () => {
      try {
        await renamePlanExerciseVariant(ex.id, planId, trimmed);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Couldn't rename. Try again.");
      }
    });
  };

  return (
    <li className="space-y-3 rounded-xl bg-(--surface-2) p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <button
            type="button"
            onClick={renameVariant}
            className="flex min-h-11 w-full items-center text-left text-[15px] font-medium"
          >
            {ex.exercise?.name ?? "Deleted exercise"}
          </button>
          <p className="text-[12px] text-(--muted)">
            Tap the name to rename it as a variant
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => move("up")}
            disabled={isFirst || pending}
            className="flex h-11 w-11 items-center justify-center rounded-xl text-(--muted) disabled:opacity-30"
            aria-label="Move up"
          >
            <ChevronUp size={20} aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => move("down")}
            disabled={isLast || pending}
            className="flex h-11 w-11 items-center justify-center rounded-xl text-(--muted) disabled:opacity-30"
            aria-label="Move down"
          >
            <ChevronDown size={20} aria-hidden />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Field label="Sets">
          <input
            type="text"
            inputMode="numeric"
            value={sets}
            onChange={(e) => setSets(e.target.value)}
            onBlur={save}
            className={`${inputCls} num`}
          />
        </Field>
        <Field label="Reps">
          <input
            type="text"
            value={reps}
            onChange={(e) => setReps(e.target.value)}
            onBlur={save}
            className={`${inputCls} num`}
          />
        </Field>
        <Field label="Weight">
          <input
            type="text"
            inputMode="decimal"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            onBlur={save}
            placeholder="Optional"
            className={`${inputCls} num`}
          />
        </Field>
        <Field label="Rest (seconds)">
          <input
            type="text"
            inputMode="numeric"
            value={rest}
            onChange={(e) => setRest(e.target.value)}
            onBlur={save}
            placeholder="Optional"
            className={`${inputCls} num`}
          />
        </Field>
      </div>

      <Field label="Notes">
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={save}
          rows={2}
          className={`${inputCls} h-auto resize-y py-2`}
        />
        <span className="block text-[12px] text-(--muted)">
          Start with a code like [A1] or [A2] to group exercises into a
          superset.
        </span>
      </Field>

      {error && <p className="text-[13px] text-(--danger)">{error}</p>}

      <div className="flex justify-end">
        <button
          type="button"
          onClick={remove}
          disabled={pending}
          className="btn btn-danger btn-sm h-11"
        >
          Remove exercise
        </button>
      </div>
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
        className="btn btn-secondary btn-block"
      >
        <Plus size={18} aria-hidden />
        Add exercise
      </button>
    );
  }

  return (
    <div className="space-y-2 rounded-xl bg-(--surface-2) p-3">
      <div className="flex items-center gap-2">
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search exercises"
          aria-label="Search exercises"
          className={inputCls}
        />
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setQuery("");
          }}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-(--muted)"
          aria-label="Cancel"
        >
          <X size={20} aria-hidden />
        </button>
      </div>
      <ul className="divide-y divide-(--border) overflow-hidden rounded-xl bg-(--surface)">
        {filtered.length === 0 ? (
          <li className="px-3 py-3 text-[14px] text-(--muted)">
            No exercises match. Try a shorter search.
          </li>
        ) : (
          filtered.map((e) => (
            <li key={e.id}>
              <button
                type="button"
                onClick={() => add(e.id)}
                disabled={pending}
                className="flex min-h-11 w-full items-center justify-between gap-2 px-3 py-2 text-left text-[15px] disabled:opacity-60"
              >
                <span className="truncate">{e.name}</span>
                <span className="label shrink-0">
                  {muscleLabel(e.primary_muscle)}
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
    <label className="block space-y-1">
      <span className="label">{label}</span>
      {children}
    </label>
  );
}

function muscleLabel(m: string): string {
  const s = m.replace(/_/g, " ");
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const inputCls =
  "block h-11 w-full rounded-xl border border-(--border) bg-(--surface) px-3 text-[16px] outline-none focus:border-(--accent)";

function toLocalInputValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
