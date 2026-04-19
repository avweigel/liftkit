import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { fetchSheetCsv } from "@/lib/sheets";
import { planImportRequestSchema } from "@/lib/schemas/plan-import";
import {
  buildPreview,
  matchExercises,
  parseCsv,
  type ExerciseRef,
} from "@/lib/plan-import";
import { slugify } from "@/lib/fuzzy";

type ImportContext = {
  userId: string;
  planName: string;
  sourceUrl: string | null;
};

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "not signed in" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid json body" }, { status: 400 });
  }

  const parsedBody = planImportRequestSchema.safeParse(body);
  if (!parsedBody.success) {
    return NextResponse.json(
      {
        error: "invalid request",
        issues: parsedBody.error.issues.map((i) => ({
          path: i.path.join("."),
          message: i.message,
        })),
      },
      { status: 400 },
    );
  }

  const { name, sourceUrl, csvText, mode, exerciseResolutions } =
    parsedBody.data;

  let csv: string;
  try {
    csv = csvText && csvText.length > 0
      ? csvText
      : await fetchSheetCsv(sourceUrl!);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "failed to fetch sheet" },
      { status: 400 },
    );
  }

  let rows, errors;
  try {
    ({ rows, errors } = parseCsv(csv));
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "failed to parse csv" },
      { status: 400 },
    );
  }

  if (rows.length === 0) {
    return NextResponse.json(
      { error: "no valid rows in csv", row_errors: errors },
      { status: 400 },
    );
  }

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
  const matches = matchExercises(
    rows.map((r) => r.exercise),
    library,
  );
  const preview = buildPreview(rows, matches, exerciseResolutions);

  if (mode === "preview") {
    return NextResponse.json({
      mode: "preview",
      name,
      source_url: sourceUrl ?? null,
      row_errors: errors,
      weeks: preview.weeks,
      unmatched_names: preview.unmatchedNames,
      match_summary: {
        total_rows: rows.length,
        matched: rows.length - preview.unmatchedNames.length,
        unmatched: preview.unmatchedNames.length,
      },
    });
  }

  return commitPlan(
    supabase,
    { userId: user.id, planName: name, sourceUrl: sourceUrl ?? null },
    preview,
    library,
    exerciseResolutions ?? {},
  );
}

async function commitPlan(
  supabase: Awaited<ReturnType<typeof createClient>>,
  ctx: ImportContext,
  preview: ReturnType<typeof buildPreview>,
  library: ExerciseRef[],
  resolutions: Record<string, string | null>,
) {
  const createdExerciseIds: string[] = [];
  let planId: string | null = null;

  try {
    const nameToId = new Map<string, string>();
    for (const w of preview.weeks) {
      for (const d of w.days) {
        for (const e of d.exercises) {
          if (nameToId.has(e.raw_name)) continue;
          if (e.matched_exercise_id) {
            nameToId.set(e.raw_name, e.matched_exercise_id);
            continue;
          }
          const resolved = resolutions[e.raw_name];
          if (typeof resolved === "string" && resolved.length > 0) {
            nameToId.set(e.raw_name, resolved);
          }
        }
      }
    }

    const toCreate: string[] = [];
    for (const name of preview.unmatchedNames) {
      if (!nameToId.has(name)) toCreate.push(name);
    }

    if (toCreate.length > 0) {
      const existingSlugs = new Set(library.map((e) => e.slug));
      const newRows = toCreate.map((name) => ({
        owner_id: ctx.userId,
        name,
        slug: ensureUniqueSlug(slugify(name), existingSlugs),
        primary_muscle: "other" as const,
        equipment: "other" as const,
      }));
      const { data: created, error } = await supabase
        .from("exercises")
        .insert(newRows)
        .select("id,name");
      if (error) throw new Error(`couldn't create exercises: ${error.message}`);
      if (!created)
        throw new Error("couldn't create exercises: no rows returned");
      created.forEach((row, i) => {
        createdExerciseIds.push(row.id);
        nameToId.set(toCreate[i], row.id);
      });
    }

    const { data: planRow, error: planErr } = await supabase
      .from("workout_plans")
      .insert({
        owner_id: ctx.userId,
        name: ctx.planName,
        source_url: ctx.sourceUrl,
        is_public: false,
      })
      .select("id")
      .single();
    if (planErr) throw new Error(`couldn't insert plan: ${planErr.message}`);
    planId = planRow.id;

    const weekRows = preview.weeks.map((w) => ({
      plan_id: planId,
      week_number: w.week_number,
      name: w.name,
    }));
    const { data: insertedWeeks, error: weekErr } = await supabase
      .from("plan_weeks")
      .insert(weekRows)
      .select("id,week_number");
    if (weekErr) throw new Error(`couldn't insert weeks: ${weekErr.message}`);

    const weekIdByNumber = new Map<number, string>();
    for (const w of insertedWeeks ?? []) weekIdByNumber.set(w.week_number, w.id);

    type DayInsert = {
      week_id: string;
      day_number: number;
      name: string | null;
      notes: string | null;
    };
    const dayRows: DayInsert[] = [];
    for (const w of preview.weeks) {
      const weekId = weekIdByNumber.get(w.week_number);
      if (!weekId) continue;
      for (const d of w.days) {
        dayRows.push({
          week_id: weekId,
          day_number: d.day_number,
          name: d.name,
          notes: d.notes,
        });
      }
    }
    const { data: insertedDays, error: dayErr } = await supabase
      .from("plan_days")
      .insert(dayRows)
      .select("id,week_id,day_number");
    if (dayErr) throw new Error(`couldn't insert days: ${dayErr.message}`);

    const dayIdByKey = new Map<string, string>();
    for (const d of insertedDays ?? [])
      dayIdByKey.set(`${d.week_id}/${d.day_number}`, d.id);

    const exerciseRows: Array<{
      day_id: string;
      exercise_id: string;
      order_index: number;
      prescribed_sets: number;
      prescribed_reps: string;
      prescribed_weight: number | null;
      rest_seconds: number | null;
      notes: string | null;
    }> = [];
    for (const w of preview.weeks) {
      const weekId = weekIdByNumber.get(w.week_number);
      if (!weekId) continue;
      for (const d of w.days) {
        const dayId = dayIdByKey.get(`${weekId}/${d.day_number}`);
        if (!dayId) continue;
        for (const ex of d.exercises) {
          const exerciseId = nameToId.get(ex.raw_name);
          if (!exerciseId) {
            throw new Error(
              `no exercise id for "${ex.raw_name}" at commit time`,
            );
          }
          exerciseRows.push({
            day_id: dayId,
            exercise_id: exerciseId,
            order_index: ex.order_index,
            prescribed_sets: ex.prescribed_sets,
            prescribed_reps: ex.prescribed_reps,
            prescribed_weight: ex.prescribed_weight,
            rest_seconds: ex.rest_seconds,
            notes: ex.notes,
          });
        }
      }
    }

    const { error: pdeErr } = await supabase
      .from("plan_day_exercises")
      .insert(exerciseRows);
    if (pdeErr)
      throw new Error(`couldn't insert plan exercises: ${pdeErr.message}`);

    return NextResponse.json({
      mode: "commit",
      plan_id: planId,
      name: ctx.planName,
      created_exercises: createdExerciseIds.length,
    });
  } catch (e) {
    if (planId) {
      await supabase.from("plan_day_exercises").delete().in(
        "day_id",
        (
          await supabase
            .from("plan_days")
            .select("id,week_id")
            .in(
              "week_id",
              (
                await supabase
                  .from("plan_weeks")
                  .select("id")
                  .eq("plan_id", planId)
              ).data?.map((w) => w.id) ?? [],
            )
        ).data?.map((d) => d.id) ?? [],
      );
      await supabase.from("plan_days").delete().in(
        "week_id",
        (
          await supabase.from("plan_weeks").select("id").eq("plan_id", planId)
        ).data?.map((w) => w.id) ?? [],
      );
      await supabase.from("plan_weeks").delete().eq("plan_id", planId);
      await supabase.from("workout_plans").delete().eq("id", planId);
    }
    if (createdExerciseIds.length > 0) {
      await supabase.from("exercises").delete().in("id", createdExerciseIds);
    }
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "import failed" },
      { status: 500 },
    );
  }
}

function ensureUniqueSlug(base: string, existing: Set<string>): string {
  if (!existing.has(base) && base.length > 0) {
    existing.add(base);
    return base;
  }
  const root = base.length > 0 ? base : "exercise";
  for (let i = 2; i < 1000; i++) {
    const candidate = `${root}-${i}`;
    if (!existing.has(candidate)) {
      existing.add(candidate);
      return candidate;
    }
  }
  const fallback = `${root}-${Date.now()}`;
  existing.add(fallback);
  return fallback;
}
