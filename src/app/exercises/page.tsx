import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { ExerciseBrowser, type LibraryItem, type RecentItem } from "./exercise-browser";
import { NormalizeButton } from "./normalize-button";

export const metadata: Metadata = {
  title: "Progress | LiftKit",
};

type Row = {
  id: string;
  name: string;
  primary_muscle: string;
  equipment: string;
  owner_id: string | null;
};

type RecentSet = {
  exercise_id: string;
  session_id: string;
  weight: number | null;
  reps: number;
  logged_at: string;
};

const RECENT_DAYS = 60;

// module level so the render stays pure; the page is dynamic anyway
function daysAgoIso(days: number) {
  return new Date(Date.now() - days * 86_400_000).toISOString();
}

export default async function ExercisesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: library }, { data: recentSets }] = await Promise.all([
    supabase
      .from("exercises")
      .select("id,name,primary_muscle,equipment,owner_id")
      .or(`owner_id.is.null,owner_id.eq.${user!.id}`)
      .order("name")
      .returns<Row[]>(),
    supabase
      .from("session_sets")
      .select("exercise_id,session_id,weight,reps,logged_at")
      .eq("is_warmup", false)
      .gte("logged_at", daysAgoIso(RECENT_DAYS))
      .order("logged_at", { ascending: false })
      .limit(2000)
      .returns<RecentSet[]>(),
  ]);

  const items: LibraryItem[] = (library ?? []).map((r) => ({
    id: r.id,
    name: r.name,
    primary_muscle: r.primary_muscle,
    equipment: r.equipment,
    custom: r.owner_id === user!.id,
  }));

  const recent = buildRecent(items, recentSets ?? []);
  const hasCustom = items.some((i) => i.custom);

  return (
    <main className="mx-auto w-full max-w-lg flex-1 space-y-8 px-4 pt-4 pb-tabbar">
      <PageHeader
        title="Progress"
        subtitle="Your lifts over time. Tap an exercise to see its trend."
      />

      <ExerciseBrowser items={items} recent={recent} recentDays={RECENT_DAYS} />

      {hasCustom && (
        <section className="space-y-3 border-t border-(--border) pt-6">
          <div className="px-1">
            <h2 className="text-[15px] font-semibold">Maintenance</h2>
            <p className="label mt-0.5">
              Tidy up exercises you added yourself.
            </p>
          </div>
          <NormalizeButton />
        </section>
      )}
    </main>
  );
}

// newest session first; the top set is the heaviest working set from the
// most recent session (most reps breaks ties, and covers bodyweight work)
function buildRecent(items: LibraryItem[], sets: RecentSet[]): RecentItem[] {
  const byId = new Map(items.map((i) => [i.id, i]));
  const latest = new Map<string, { session: string; at: string; sets: RecentSet[] }>();

  for (const s of sets) {
    const cur = latest.get(s.exercise_id);
    if (!cur) {
      latest.set(s.exercise_id, { session: s.session_id, at: s.logged_at, sets: [s] });
    } else if (cur.session === s.session_id) {
      cur.sets.push(s);
    }
  }

  const out: RecentItem[] = [];
  for (const [exerciseId, entry] of latest) {
    const item = byId.get(exerciseId);
    if (!item) continue;
    const top = entry.sets.reduce((best, s) => {
      const bw = best.weight ?? 0;
      const sw = s.weight ?? 0;
      if (sw > bw) return s;
      if (sw === bw && s.reps > best.reps) return s;
      return best;
    });
    out.push({
      ...item,
      lastAt: entry.at,
      topWeight: top.weight && top.weight > 0 ? top.weight : null,
      topReps: top.reps,
    });
  }

  return out.sort((a, b) => b.lastAt.localeCompare(a.lastAt));
}
