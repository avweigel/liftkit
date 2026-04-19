import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { findCanonical, normalizeName } from "@/lib/exercise-normalize";
import { slugify } from "@/lib/fuzzy";

type MyExercise = {
  id: string;
  name: string;
  slug: string;
  primary_muscle: string;
  equipment: string;
  notes: string | null;
};

type GlobalExercise = {
  id: string;
  name: string;
  slug: string;
};

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "not signed in" }, { status: 401 });
  }

  const [{ data: mineData }, { data: globalsData }] = await Promise.all([
    supabase
      .from("exercises")
      .select("id,name,slug,primary_muscle,equipment,notes")
      .eq("owner_id", user.id)
      .returns<MyExercise[]>(),
    supabase
      .from("exercises")
      .select("id,name,slug")
      .is("owner_id", null)
      .returns<GlobalExercise[]>(),
  ]);

  const mine = mineData ?? [];
  const globals = globalsData ?? [];

  const globalByKey = new Map<string, GlobalExercise>();
  for (const g of globals) {
    globalByKey.set(g.name.toLowerCase(), g);
    globalByKey.set(g.slug.toLowerCase(), g);
  }

  const merged: Array<{ from: string; into: string }> = [];
  const renamed: Array<{ from: string; to: string }> = [];
  const unknowns: Array<{ id: string; name: string }> = [];

  for (const ex of mine) {
    const canonical = findCanonical(ex.name);
    if (canonical) {
      const globalHit =
        globalByKey.get(canonical.name.toLowerCase()) ??
        globalByKey.get(slugify(canonical.name).toLowerCase());
      if (globalHit && globalHit.id !== ex.id) {
        const mergeErr = await mergeInto(supabase, ex.id, globalHit.id);
        if (mergeErr) {
          return NextResponse.json(
            {
              error: `merge failed for "${ex.name}" → "${globalHit.name}": ${mergeErr}`,
              merged,
              renamed,
              unknowns,
            },
            { status: 500 },
          );
        }
        merged.push({ from: ex.name, into: globalHit.name });
        continue;
      }
      const renameErr = await applyCanonical(supabase, ex, canonical, mine);
      if (renameErr) {
        return NextResponse.json(
          {
            error: `update failed for "${ex.name}": ${renameErr}`,
            merged,
            renamed,
            unknowns,
          },
          { status: 500 },
        );
      }
      if (ex.name !== canonical.name) {
        renamed.push({ from: ex.name, to: canonical.name });
      }
      continue;
    }

    const normalized = normalizeName(ex.name);
    if (normalized !== ex.name) {
      const taken = new Set(mine.map((m) => m.slug));
      const { error } = await supabase
        .from("exercises")
        .update({
          name: normalized,
          slug: uniqueSlug(slugify(normalized) || slugify(ex.name), taken),
        })
        .eq("id", ex.id);
      if (!error) {
        renamed.push({ from: ex.name, to: normalized });
        continue;
      }
    }
    unknowns.push({ id: ex.id, name: ex.name });
  }

  return NextResponse.json({
    merged,
    renamed,
    unknowns,
    total: mine.length,
  });
}

async function applyCanonical(
  supabase: Awaited<ReturnType<typeof createClient>>,
  ex: MyExercise,
  canonical: ReturnType<typeof findCanonical> & object,
  allMine: MyExercise[],
): Promise<string | null> {
  const taken = new Set(allMine.filter((m) => m.id !== ex.id).map((m) => m.slug));
  const targetSlug = uniqueSlug(slugify(canonical.name), taken);
  const { error } = await supabase
    .from("exercises")
    .update({
      name: canonical.name,
      slug: targetSlug,
      primary_muscle: canonical.primary_muscle,
      equipment: canonical.equipment,
      notes: canonical.description,
    })
    .eq("id", ex.id);
  return error?.message ?? null;
}

async function mergeInto(
  supabase: Awaited<ReturnType<typeof createClient>>,
  fromId: string,
  intoId: string,
): Promise<string | null> {
  {
    const { error } = await supabase
      .from("plan_day_exercises")
      .update({ exercise_id: intoId })
      .eq("exercise_id", fromId);
    if (error) return error.message;
  }
  {
    const { error } = await supabase
      .from("session_sets")
      .update({ exercise_id: intoId })
      .eq("exercise_id", fromId);
    if (error) return error.message;
  }
  {
    const { error } = await supabase.from("exercises").delete().eq("id", fromId);
    if (error) return error.message;
  }
  return null;
}

function uniqueSlug(base: string, taken: Set<string>): string {
  if (!taken.has(base) && base.length > 0) {
    taken.add(base);
    return base;
  }
  const root = base.length > 0 ? base : "exercise";
  for (let i = 2; i < 1000; i++) {
    const candidate = `${root}-${i}`;
    if (!taken.has(candidate)) {
      taken.add(candidate);
      return candidate;
    }
  }
  const fallback = `${root}-${Date.now()}`;
  taken.add(fallback);
  return fallback;
}
