import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
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

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "not signed in" }, { status: 401 });
  }

  const typedPhases = phases as SeedPhase[];

  const { data: existing, error: existingErr } = await supabase
    .from("workout_plans")
    .select("name")
    .eq("owner_id", user.id);
  if (existingErr) {
    return NextResponse.json({ error: existingErr.message }, { status: 500 });
  }
  const alreadyHave = new Set((existing ?? []).map((p) => p.name));

  const { data: libraryData, error: libErr } = await supabase
    .from("exercises")
    .select("id,name,slug")
    .or(`owner_id.is.null,owner_id.eq.${user.id}`);
  if (libErr) {
    return NextResponse.json(
      { error: `couldn't load exercise library: ${libErr.message}` },
      { status: 500 },
    );
  }
  const library: ExerciseRef[] = libraryData ?? [];
  const libSlugs = new Set(library.map((e) => e.slug));
  const nameToId = new Map<string, string>();
  for (const ex of library) nameToId.set(ex.name.toLowerCase(), ex.id);

  const created: string[] = [];
  const skipped: string[] = [];
  const createdExerciseIds: string[] = [];

  for (const phase of typedPhases) {
    if (alreadyHave.has(phase.name)) {
      skipped.push(phase.name);
      continue;
    }

    try {
      const rawNames = phase.days.flatMap((d) =>
        d.exercises.map((e) => e.raw_name),
      );
      const matches = matchExercises(rawNames, library);
      const localMap = new Map<string, string>();

      const unmatched: string[] = [];
      for (const name of new Set(rawNames)) {
        const m = matches.get(name);
        if (m?.matched) {
          localMap.set(name, m.matched.id);
        } else {
          unmatched.push(name);
        }
      }

      if (unmatched.length > 0) {
        const newRows = unmatched.map((name) => ({
          owner_id: user.id,
          name,
          slug: uniqueSlug(slugify(name) || "exercise", libSlugs),
          primary_muscle: "other" as const,
          equipment: "other" as const,
        }));
        const { data: inserted, error } = await supabase
          .from("exercises")
          .insert(newRows)
          .select("id,name,slug");
        if (error)
          throw new Error(`create exercises failed: ${error.message}`);
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
          owner_id: user.id,
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
    } catch (e) {
      return NextResponse.json(
        {
          error: e instanceof Error ? e.message : "seed failed",
          created,
          skipped,
          failed_at: phase.name,
        },
        { status: 500 },
      );
    }
  }

  return NextResponse.json({
    created,
    skipped,
    created_exercises: createdExerciseIds.length,
  });
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
