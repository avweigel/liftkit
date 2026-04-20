"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  sessionExtraInputSchema,
  sessionExtraPatchSchema,
} from "@/lib/schemas/session-extras";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("not signed in");
  return { supabase, user };
}

export async function addSessionExtra(sessionId: string, input: unknown) {
  const parsed = sessionExtraInputSchema.parse(input);
  const { supabase } = await requireUser();

  const { data: last } = await supabase
    .from("session_extra_exercises")
    .select("order_index")
    .eq("session_id", sessionId)
    .order("order_index", { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextOrder = (last?.order_index ?? -1) + 1;

  const { error } = await supabase.from("session_extra_exercises").insert({
    session_id: sessionId,
    exercise_id: parsed.exercise_id,
    superset_code: parsed.superset_code,
    order_index: nextOrder,
    prescribed_sets: parsed.prescribed_sets,
    prescribed_reps: parsed.prescribed_reps,
    prescribed_weight: parsed.prescribed_weight ?? null,
    rest_seconds: parsed.rest_seconds ?? null,
    notes: parsed.notes ?? null,
  });
  if (error) throw new Error(error.message);
  revalidatePath(`/log/${sessionId}`);
}

export async function updateSessionExtra(
  extraId: string,
  sessionId: string,
  patch: unknown,
) {
  const parsed = sessionExtraPatchSchema.parse(patch);
  const { supabase } = await requireUser();
  const update: Record<string, unknown> = {};
  if (parsed.superset_code !== undefined)
    update.superset_code = parsed.superset_code;
  if (parsed.prescribed_sets !== undefined)
    update.prescribed_sets = parsed.prescribed_sets;
  if (parsed.prescribed_reps !== undefined)
    update.prescribed_reps = parsed.prescribed_reps;
  if (parsed.prescribed_weight !== undefined)
    update.prescribed_weight = parsed.prescribed_weight;
  if (parsed.rest_seconds !== undefined)
    update.rest_seconds = parsed.rest_seconds;
  if (parsed.notes !== undefined) update.notes = parsed.notes;
  if (Object.keys(update).length === 0) return;
  const { error } = await supabase
    .from("session_extra_exercises")
    .update(update)
    .eq("id", extraId);
  if (error) throw new Error(error.message);
  revalidatePath(`/log/${sessionId}`);
}

export async function removeSessionExtra(
  extraId: string,
  sessionId: string,
) {
  const { supabase } = await requireUser();
  const { error } = await supabase
    .from("session_extra_exercises")
    .delete()
    .eq("id", extraId);
  if (error) throw new Error(error.message);
  revalidatePath(`/log/${sessionId}`);
}

type SessionRow = {
  id: string;
  plan_day_id: string | null;
  user_id: string;
};

type PlanDayRow = {
  id: string;
  day_number: number;
  name: string | null;
  notes: string | null;
  week_id: string;
};

type ExtraRow = {
  id: string;
  exercise_id: string;
  superset_code: string | null;
  prescribed_sets: number;
  prescribed_reps: string;
  prescribed_weight: number | null;
  rest_seconds: number | null;
  notes: string | null;
};

type PdeRow = {
  notes: string | null;
};

function nextCodesForExtras(
  extras: ExtraRow[],
  existingNotes: Array<string | null>,
): Array<{ extra: ExtraRow; codePrefix: string | null }> {
  const perLetterMax: Record<string, number> = {};
  const re = /^\[([A-Za-z]+)(\d+)\]/;
  for (const n of existingNotes) {
    const m = n?.match(re);
    if (!m) continue;
    const letter = m[1].toUpperCase();
    const num = parseInt(m[2], 10);
    perLetterMax[letter] = Math.max(perLetterMax[letter] ?? 0, num);
  }
  return extras.map((e) => {
    const letter = e.superset_code?.toUpperCase();
    if (!letter) return { extra: e, codePrefix: null };
    const next = (perLetterMax[letter] ?? 0) + 1;
    perLetterMax[letter] = next;
    return { extra: e, codePrefix: `[${letter}${next}]` };
  });
}

function combineNotes(
  codePrefix: string | null,
  existing: string | null,
): string | null {
  const parts = [codePrefix, existing?.trim()].filter(Boolean) as string[];
  return parts.length > 0 ? parts.join(" ") : null;
}

export async function saveExtrasToCurrentPhase(sessionId: string) {
  const { supabase } = await requireUser();

  const { data: session, error: sessErr } = await supabase
    .from("workout_sessions")
    .select("id, plan_day_id, user_id")
    .eq("id", sessionId)
    .maybeSingle()
    .returns<SessionRow>();
  if (sessErr) throw new Error(sessErr.message);
  if (!session || !session.plan_day_id) {
    throw new Error("this session has no plan day to save to");
  }

  const { data: extras, error: exErr } = await supabase
    .from("session_extra_exercises")
    .select(
      "id, exercise_id, superset_code, prescribed_sets, prescribed_reps, prescribed_weight, rest_seconds, notes",
    )
    .eq("session_id", sessionId)
    .order("order_index", { ascending: true })
    .returns<ExtraRow[]>();
  if (exErr) throw new Error(exErr.message);
  if (!extras || extras.length === 0) return { added: 0 };

  const { data: lastPde, error: lastErr } = await supabase
    .from("plan_day_exercises")
    .select("order_index")
    .eq("day_id", session.plan_day_id)
    .order("order_index", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (lastErr) throw new Error(lastErr.message);
  let nextOrder = (lastPde?.order_index ?? -1) + 1;

  const { data: existing, error: existErr } = await supabase
    .from("plan_day_exercises")
    .select("notes")
    .eq("day_id", session.plan_day_id)
    .returns<PdeRow[]>();
  if (existErr) throw new Error(existErr.message);
  const withCodes = nextCodesForExtras(
    extras,
    (existing ?? []).map((r) => r.notes),
  );

  const rows = withCodes.map(({ extra, codePrefix }) => ({
    day_id: session.plan_day_id!,
    exercise_id: extra.exercise_id,
    order_index: nextOrder++,
    prescribed_sets: extra.prescribed_sets,
    prescribed_reps: extra.prescribed_reps,
    prescribed_weight: extra.prescribed_weight,
    rest_seconds: extra.rest_seconds,
    notes: combineNotes(codePrefix, extra.notes),
  }));

  const { error: insErr } = await supabase
    .from("plan_day_exercises")
    .insert(rows);
  if (insErr) throw new Error(insErr.message);

  const { error: delErr } = await supabase
    .from("session_extra_exercises")
    .delete()
    .eq("session_id", sessionId);
  if (delErr) throw new Error(delErr.message);

  revalidatePath(`/log/${sessionId}`);
  revalidatePath("/plans");
  return { added: rows.length };
}

export async function saveExtrasAsNewPhase(
  sessionId: string,
  newName?: string,
) {
  const { supabase, user } = await requireUser();

  const { data: session, error: sessErr } = await supabase
    .from("workout_sessions")
    .select("id, plan_day_id, user_id")
    .eq("id", sessionId)
    .maybeSingle()
    .returns<SessionRow>();
  if (sessErr) throw new Error(sessErr.message);
  if (!session || !session.plan_day_id) {
    throw new Error("this session has no plan day to fork");
  }

  const { data: day, error: dayErr } = await supabase
    .from("plan_days")
    .select("id, day_number, name, notes, week_id")
    .eq("id", session.plan_day_id)
    .maybeSingle()
    .returns<PlanDayRow>();
  if (dayErr) throw new Error(dayErr.message);
  if (!day) throw new Error("plan day not found");

  const { data: week, error: weekErr } = await supabase
    .from("plan_weeks")
    .select("id, plan_id")
    .eq("id", day.week_id)
    .maybeSingle();
  if (weekErr) throw new Error(weekErr.message);
  if (!week) throw new Error("plan week not found");

  const { data: sourcePlan, error: spErr } = await supabase
    .from("workout_plans")
    .select(
      `id, name, description, source_url, is_public, owner_id,
       plan_weeks ( week_number, name,
         plan_days ( day_number, name, notes,
           plan_day_exercises ( order_index, prescribed_sets, prescribed_reps,
             prescribed_weight, rest_seconds, notes, exercise_id )
         )
       )`,
    )
    .eq("id", week.plan_id)
    .maybeSingle();
  if (spErr) throw new Error(spErr.message);
  if (!sourcePlan) throw new Error("plan not found");

  const resolvedName =
    (newName ?? "").trim().length > 0
      ? newName!.trim()
      : `${sourcePlan.name} · modified ${formatShortDate(new Date())}`;

  const { data: newPlan, error: npErr } = await supabase
    .from("workout_plans")
    .insert({
      owner_id: user.id,
      name: resolvedName,
      description: sourcePlan.description,
      source_url: sourcePlan.source_url,
      is_public: false,
    })
    .select("id")
    .single();
  if (npErr) throw new Error(npErr.message);
  const newPlanId = newPlan.id;

  let newTargetDayId: string | null = null;

  for (const srcWeek of (sourcePlan.plan_weeks ?? []) as Array<{
    week_number: number;
    name: string | null;
    plan_days?: Array<{
      day_number: number;
      name: string | null;
      notes: string | null;
      plan_day_exercises?: Array<{
        order_index: number;
        prescribed_sets: number;
        prescribed_reps: string;
        prescribed_weight: number | null;
        rest_seconds: number | null;
        notes: string | null;
        exercise_id: string;
      }>;
    }>;
  }>) {
    const { data: newWeek, error: wErr } = await supabase
      .from("plan_weeks")
      .insert({
        plan_id: newPlanId,
        week_number: srcWeek.week_number,
        name: srcWeek.name,
      })
      .select("id")
      .single();
    if (wErr) throw new Error(wErr.message);

    for (const srcDay of srcWeek.plan_days ?? []) {
      const { data: newDay, error: dErr } = await supabase
        .from("plan_days")
        .insert({
          week_id: newWeek.id,
          day_number: srcDay.day_number,
          name: srcDay.name,
          notes: srcDay.notes,
        })
        .select("id")
        .single();
      if (dErr) throw new Error(dErr.message);

      if (srcDay.day_number === day.day_number) {
        newTargetDayId = newDay.id;
      }

      const pdeRows = (srcDay.plan_day_exercises ?? []).map((e) => ({
        day_id: newDay.id,
        exercise_id: e.exercise_id,
        order_index: e.order_index,
        prescribed_sets: e.prescribed_sets,
        prescribed_reps: e.prescribed_reps,
        prescribed_weight: e.prescribed_weight,
        rest_seconds: e.rest_seconds,
        notes: e.notes,
      }));
      if (pdeRows.length > 0) {
        const { error: pdeErr } = await supabase
          .from("plan_day_exercises")
          .insert(pdeRows);
        if (pdeErr) throw new Error(pdeErr.message);
      }
    }
  }

  if (!newTargetDayId) throw new Error("could not find matching day in copy");

  // append extras to the new target day
  const { data: extras, error: exErr } = await supabase
    .from("session_extra_exercises")
    .select(
      "id, exercise_id, superset_code, prescribed_sets, prescribed_reps, prescribed_weight, rest_seconds, notes",
    )
    .eq("session_id", sessionId)
    .order("order_index", { ascending: true })
    .returns<ExtraRow[]>();
  if (exErr) throw new Error(exErr.message);

  if (extras && extras.length > 0) {
    const { data: existing } = await supabase
      .from("plan_day_exercises")
      .select("notes, order_index")
      .eq("day_id", newTargetDayId);
    const maxOrder = (existing ?? []).reduce(
      (m: number, r: { order_index: number }) => Math.max(m, r.order_index),
      -1,
    );
    const withCodes = nextCodesForExtras(
      extras,
      (existing ?? []).map((r: { notes: string | null }) => r.notes),
    );
    let order = maxOrder + 1;
    const rows = withCodes.map(({ extra, codePrefix }) => ({
      day_id: newTargetDayId!,
      exercise_id: extra.exercise_id,
      order_index: order++,
      prescribed_sets: extra.prescribed_sets,
      prescribed_reps: extra.prescribed_reps,
      prescribed_weight: extra.prescribed_weight,
      rest_seconds: extra.rest_seconds,
      notes: combineNotes(codePrefix, extra.notes),
    }));
    const { error: insErr } = await supabase
      .from("plan_day_exercises")
      .insert(rows);
    if (insErr) throw new Error(insErr.message);
  }

  // re-point session to new day
  const { error: repoErr } = await supabase
    .from("workout_sessions")
    .update({ plan_day_id: newTargetDayId })
    .eq("id", sessionId);
  if (repoErr) throw new Error(repoErr.message);

  // switch active phase to the copy
  await supabase
    .from("profiles")
    .update({ active_plan_id: newPlanId })
    .eq("id", user.id);

  // clear extras
  await supabase
    .from("session_extra_exercises")
    .delete()
    .eq("session_id", sessionId);

  revalidatePath(`/log/${sessionId}`);
  revalidatePath("/plans");
  revalidatePath(`/plans/${newPlanId}`);
  revalidatePath("/");

  return { newPlanId, name: resolvedName };
}

function formatShortDate(d: Date): string {
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}
