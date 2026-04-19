import type { SupabaseClient } from "@supabase/supabase-js";
import phases from "@/lib/seed/phases.json";
import { slugify } from "@/lib/fuzzy";
import { matchExercises, type ExerciseRef } from "@/lib/plan-import";

type SeedExercise = {
  raw_name: string;
  order_index: number;
  prescribed_sets: number;
  prescribed_reps: string;
  prescribed_weight: number | null;
  rest_seconds: number | null;
  notes: string | null;
  set_code: string;
};

type SeedDay = { name: string; exercises: SeedExercise[] };
type SeedPhase = { name: string; days: SeedDay[] };

const WORKBOOK_URL =
  "https://docs.google.com/spreadsheets/d/1EfLQux7OmhVoTg0Au-aCyqoCR_kxPmrxs3En4177LzY/edit";

export type EnsurePhasesResult = {
  created: string[];
  skipped: string[];
  created_exercises: number;
};

export async function ensurePhasesLoaded(
  supabase: SupabaseClient,
  userId: string,
): Promise<EnsurePhasesResult> {
  const typedPhases = phases as SeedPhase[];

  const { data: existing } = await supabase
    .from("workout_plans")
    .select("name")
    .eq("owner_id", userId);
  const alreadyHave = new Set((existing ?? []).map((p) => p.name));

  const { data: libraryData } = await supabase
    .from("exercises")
    .select("id,name,slug")
    .or(`owner_id.is.null,owner_id.eq.${userId}`);

  const library: ExerciseRef[] = libraryData ?? [];
  const libSlugs = new Set(library.map((e) => e.slug));
  const createdExerciseIds: string[] = [];
  const created: string[] = [];
  const skipped: string[] = [];

  for (const phase of typedPhases) {
    if (alreadyHave.has(phase.name)) {
      skipped.push(phase.name);
      continue;
    }

    const rawNames = phase.days.flatMap((d) =>
      d.exercises.map((e) => e.raw_name),
    );
    const matches = matchExercises(rawNames, library);
    const localMap = new Map<string, string>();
    const unmatched: string[] = [];
    for (const name of new Set(rawNames)) {
      const m = matches.get(name);
      if (m?.matched) localMap.set(name, m.matched.id);
      else unmatched.push(name);
    }

    if (unmatched.length > 0) {
      const newRows = unmatched.map((name) => ({
        owner_id: userId,
        name,
        slug: uniqueSlug(slugify(name) || "exercise", libSlugs),
        primary_muscle: "other" as const,
        equipment: "other" as const,
      }));
      const { data: inserted, error } = await supabase
        .from("exercises")
        .insert(newRows)
        .select("id,name,slug");
      if (error) throw new Error(`create exercises: ${error.message}`);
      if (!inserted) throw new Error("create exercises returned no rows");
      inserted.forEach((row, i) => {
        createdExerciseIds.push(row.id);
        localMap.set(unmatched[i], row.id);
        library.push({ id: row.id, name: row.name, slug: row.slug });
      });
    }

    const { data: planRow, error: planErr } = await supabase
      .from("workout_plans")
      .insert({
        owner_id: userId,
        name: phase.name,
        source_url: WORKBOOK_URL,
        is_public: false,
      })
      .select("id")
      .single();
    if (planErr) throw new Error(`plan insert: ${planErr.message}`);
    const planId = planRow.id;

    const { data: weekRow, error: weekErr } = await supabase
      .from("plan_weeks")
      .insert({ plan_id: planId, week_number: 1, name: null })
      .select("id")
      .single();
    if (weekErr) throw new Error(`week insert: ${weekErr.message}`);
    const weekId = weekRow.id;

    const dayInserts = phase.days.map((d, idx) => ({
      week_id: weekId,
      day_number: idx + 1,
      name: d.name,
      notes: null,
    }));
    const { data: insertedDays, error: dayErr } = await supabase
      .from("plan_days")
      .insert(dayInserts)
      .select("id,day_number");
    if (dayErr) throw new Error(`days insert: ${dayErr.message}`);

    const dayIdByNumber = new Map<number, string>();
    for (const d of insertedDays ?? []) dayIdByNumber.set(d.day_number, d.id);

    type PdeRow = {
      day_id: string;
      exercise_id: string;
      order_index: number;
      prescribed_sets: number;
      prescribed_reps: string;
      prescribed_weight: number | null;
      rest_seconds: number | null;
      notes: string | null;
    };
    const pdeRows: PdeRow[] = [];
    phase.days.forEach((d, idx) => {
      const dayId = dayIdByNumber.get(idx + 1);
      if (!dayId) return;
      for (const ex of d.exercises) {
        const exerciseId = localMap.get(ex.raw_name);
        if (!exerciseId) continue;
        pdeRows.push({
          day_id: dayId,
          exercise_id: exerciseId,
          order_index: ex.order_index,
          prescribed_sets: ex.prescribed_sets,
          prescribed_reps: ex.prescribed_reps,
          prescribed_weight: ex.prescribed_weight,
          rest_seconds: ex.rest_seconds,
          notes: combineNotes(ex.notes, ex.set_code),
        });
      }
    });
    const { error: pdeErr } = await supabase
      .from("plan_day_exercises")
      .insert(pdeRows);
    if (pdeErr) throw new Error(`exercises insert: ${pdeErr.message}`);

    created.push(phase.name);
  }

  return {
    created,
    skipped,
    created_exercises: createdExerciseIds.length,
  };
}

function uniqueSlug(base: string, taken: Set<string>): string {
  if (!taken.has(base)) {
    taken.add(base);
    return base;
  }
  for (let i = 2; i < 1000; i++) {
    const candidate = `${base}-${i}`;
    if (!taken.has(candidate)) {
      taken.add(candidate);
      return candidate;
    }
  }
  const fallback = `${base}-${Date.now()}`;
  taken.add(fallback);
  return fallback;
}

function combineNotes(notes: string | null, setCode: string): string | null {
  const parts: string[] = [];
  if (setCode) parts.push(`[${setCode}]`);
  if (notes) parts.push(notes);
  return parts.length ? parts.join(" ") : null;
}
