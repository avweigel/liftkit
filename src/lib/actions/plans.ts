"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { planDayExerciseInputSchema } from "@/lib/schemas/session";
import { slugify } from "@/lib/fuzzy";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("not signed in");
  return { supabase, user };
}

export async function updatePlanDayExercise(
  planDayExerciseId: string,
  planId: string,
  input: unknown,
) {
  const parsed = planDayExerciseInputSchema.parse(input);
  const { supabase } = await requireUser();
  const { error } = await supabase
    .from("plan_day_exercises")
    .update({
      prescribed_sets: parsed.prescribed_sets,
      prescribed_reps: parsed.prescribed_reps,
      prescribed_weight: parsed.prescribed_weight ?? null,
      rest_seconds: parsed.rest_seconds ?? null,
      notes: parsed.notes ?? null,
    })
    .eq("id", planDayExerciseId);
  if (error) throw new Error(error.message);
  revalidatePath(`/plans/${planId}`);
}

export async function renamePlanDay(
  dayId: string,
  planId: string,
  name: string,
) {
  const trimmed = name.trim().slice(0, 80);
  const { supabase } = await requireUser();
  const { error } = await supabase
    .from("plan_days")
    .update({ name: trimmed || null })
    .eq("id", dayId);
  if (error) throw new Error(error.message);
  revalidatePath(`/plans/${planId}`);
}

export async function reorderDayExercise(
  planDayExerciseId: string,
  dayId: string,
  planId: string,
  direction: "up" | "down",
) {
  const { supabase } = await requireUser();
  const { data: rows, error } = await supabase
    .from("plan_day_exercises")
    .select("id,order_index")
    .eq("day_id", dayId)
    .order("order_index", { ascending: true });
  if (error) throw new Error(error.message);
  if (!rows) return;
  const idx = rows.findIndex((r) => r.id === planDayExerciseId);
  if (idx === -1) return;
  const swapWith = direction === "up" ? idx - 1 : idx + 1;
  if (swapWith < 0 || swapWith >= rows.length) return;
  const a = rows[idx];
  const b = rows[swapWith];
  await supabase
    .from("plan_day_exercises")
    .update({ order_index: b.order_index })
    .eq("id", a.id);
  await supabase
    .from("plan_day_exercises")
    .update({ order_index: a.order_index })
    .eq("id", b.id);
  revalidatePath(`/plans/${planId}`);
}

export async function removePlanDayExercise(
  planDayExerciseId: string,
  planId: string,
) {
  const { supabase } = await requireUser();
  const { error } = await supabase
    .from("plan_day_exercises")
    .delete()
    .eq("id", planDayExerciseId);
  if (error) throw new Error(error.message);
  revalidatePath(`/plans/${planId}`);
}

export async function addPlanDayExercise(
  dayId: string,
  planId: string,
  exerciseId: string,
  input: unknown,
) {
  const parsed = planDayExerciseInputSchema.parse(input);
  const { supabase } = await requireUser();
  const { data: last, error: maxErr } = await supabase
    .from("plan_day_exercises")
    .select("order_index")
    .eq("day_id", dayId)
    .order("order_index", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (maxErr) throw new Error(maxErr.message);
  const nextOrder = (last?.order_index ?? -1) + 1;
  const { error } = await supabase.from("plan_day_exercises").insert({
    day_id: dayId,
    exercise_id: exerciseId,
    order_index: nextOrder,
    prescribed_sets: parsed.prescribed_sets,
    prescribed_reps: parsed.prescribed_reps,
    prescribed_weight: parsed.prescribed_weight ?? null,
    rest_seconds: parsed.rest_seconds ?? null,
    notes: parsed.notes ?? null,
  });
  if (error) throw new Error(error.message);
  revalidatePath(`/plans/${planId}`);
}

type PlanFull = {
  id: string;
  name: string;
  description: string | null;
  source_url: string | null;
  is_public: boolean;
  owner_id: string;
  plan_weeks: Array<{
    week_number: number;
    name: string | null;
    plan_days: Array<{
      day_number: number;
      name: string | null;
      notes: string | null;
      plan_day_exercises: Array<{
        order_index: number;
        prescribed_sets: number;
        prescribed_reps: string;
        prescribed_weight: number | null;
        rest_seconds: number | null;
        notes: string | null;
        exercise_id: string;
      }>;
    }>;
  }>;
};

type SrcExerciseFields = {
  primary_muscle: string | null;
  equipment: string | null;
};

export async function renamePlanExerciseVariant(
  planDayExerciseId: string,
  planId: string,
  newName: string,
) {
  const { supabase, user } = await requireUser();
  const trimmed = newName.trim();
  if (trimmed.length < 2) throw new Error("name too short");
  if (trimmed.length > 120) throw new Error("name too long");

  const { data: pde, error: pdeErr } = await supabase
    .from("plan_day_exercises")
    .select("id, exercise_id, exercise:exercises ( primary_muscle, equipment )")
    .eq("id", planDayExerciseId)
    .maybeSingle();
  if (pdeErr) throw new Error(pdeErr.message);
  if (!pde) throw new Error("plan exercise not found");
  const rawSrc = pde.exercise as unknown as
    | SrcExerciseFields
    | SrcExerciseFields[]
    | null;
  const src: SrcExerciseFields | null = Array.isArray(rawSrc)
    ? rawSrc[0] ?? null
    : rawSrc;

  const { data: existing } = await supabase
    .from("exercises")
    .select("id")
    .ilike("name", trimmed)
    .or(`owner_id.is.null,owner_id.eq.${user.id}`)
    .maybeSingle();

  let newExerciseId: string;
  if (existing) {
    newExerciseId = existing.id;
  } else {
    let slug = slugify(trimmed) || "exercise";
    const base = slug;
    for (let i = 2; i < 500; i++) {
      const { data: clash } = await supabase
        .from("exercises")
        .select("id")
        .eq("slug", slug)
        .maybeSingle();
      if (!clash) break;
      slug = `${base}-${i}`;
    }
    const muscle = (src?.primary_muscle as string | null) ?? "other";
    const equipment = (src?.equipment as string | null) ?? "other";
    const { data: created, error: createErr } = await supabase
      .from("exercises")
      .insert({
        owner_id: user.id,
        name: trimmed,
        slug,
        primary_muscle: muscle,
        equipment,
      })
      .select("id")
      .single();
    if (createErr) throw new Error(createErr.message);
    newExerciseId = created.id;
  }

  const { error: updErr } = await supabase
    .from("plan_day_exercises")
    .update({ exercise_id: newExerciseId })
    .eq("id", planDayExerciseId);
  if (updErr) throw new Error(updErr.message);

  revalidatePath(`/plans/${planId}`);
}

export async function setActivePlan(planId: string | null) {
  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from("profiles")
    .update({ active_plan_id: planId })
    .eq("id", user.id);
  if (error) throw new Error(error.message);
  revalidatePath("/");
  revalidatePath("/plans");
  if (planId) revalidatePath(`/plans/${planId}`);
}

export async function duplicatePlan(planId: string) {
  const { supabase, user } = await requireUser();
  const { data: src, error } = await supabase
    .from("workout_plans")
    .select(
      `id,name,description,source_url,is_public,owner_id,
       plan_weeks (
         week_number, name,
         plan_days (
           day_number, name, notes,
           plan_day_exercises (
             order_index, prescribed_sets, prescribed_reps,
             prescribed_weight, rest_seconds, notes, exercise_id
           )
         )
       )`,
    )
    .eq("id", planId)
    .maybeSingle()
    .returns<PlanFull>();
  if (error) throw new Error(error.message);
  if (!src) throw new Error("plan not found");

  const newName = src.owner_id === user.id ? `${src.name} (copy)` : src.name;

  const { data: newPlan, error: planErr } = await supabase
    .from("workout_plans")
    .insert({
      owner_id: user.id,
      name: newName,
      description: src.description,
      source_url: src.source_url,
      is_public: false,
    })
    .select("id")
    .single();
  if (planErr) throw new Error(planErr.message);
  const newPlanId = newPlan.id;

  for (const w of src.plan_weeks ?? []) {
    const { data: newWeek, error: wErr } = await supabase
      .from("plan_weeks")
      .insert({
        plan_id: newPlanId,
        week_number: w.week_number,
        name: w.name,
      })
      .select("id")
      .single();
    if (wErr) throw new Error(wErr.message);

    for (const d of w.plan_days ?? []) {
      const { data: newDay, error: dErr } = await supabase
        .from("plan_days")
        .insert({
          week_id: newWeek.id,
          day_number: d.day_number,
          name: d.name,
          notes: d.notes,
        })
        .select("id")
        .single();
      if (dErr) throw new Error(dErr.message);

      const pdeRows = (d.plan_day_exercises ?? []).map((e) => ({
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

  revalidatePath("/plans");
  redirect(`/plans/${newPlanId}`);
}
