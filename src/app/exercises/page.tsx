import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { convert } from "@/lib/display/units-core";
import { getUnitPrefs } from "@/lib/measurement";
import { PageHeader } from "@/components/page-header";
import { ExerciseBrowser, type LibraryItem, type RecentItem } from "./exercise-browser";
import { NormalizeButton } from "./normalize-button";
import { LiftProgress, RunningProgress, WristSnapshot, type LiftRow, type WeekRow } from "./progress-overview";
import { addDays, localToday, weekStart } from "@/lib/local-date";
import { buildSession, DEFAULT_RUN_PROFILE, sessionKm, WEEKLY, type SessionId } from "@/lib/program/running";
import { sessionOf, type CardioLog } from "@/lib/running-data";

const WEEKS = 12;
// the lifts whose top set is the strength story
const MAIN_LIFTS = ["Back Squat", "Deadlift", "Overhead Press", "Bench Press", "Chin-up", "Hip Thrust"];

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

  const { stored, shown } = await getUnitPrefs();
  const today = localToday();
  const firstWeek = addDays(weekStart(today), -7 * (WEEKS - 1));
  const [{ data: library }, { data: recentSets }, { data: cardio }] = await Promise.all([
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
    supabase
      .from("cardio_logs")
      .select("id, logged_on, kind, session, machine, minutes, km")
      .eq("user_id", user!.id)
      .gte("logged_on", firstWeek)
      .order("logged_on", { ascending: true })
      .returns<CardioLog[]>(),
  ]);

  // running, week by week. a run logged without a distance counts its
  // planned kilometres so the weekly total isn't full of holes
  const weeks: WeekRow[] = Array.from({ length: WEEKS }, (_, i) => {
    const week = addDays(firstWeek, 7 * i);
    const end = addDays(week, 6);
    const rows = (cardio ?? []).filter((c) => c.logged_on >= week && c.logged_on <= end);
    const runs = rows.filter((c) => (WEEKLY as string[]).includes(sessionOf(c)));
    const kmOf = (c: CardioLog) => {
      if (c.km != null) return Number(c.km);
      const id = sessionOf(c) as SessionId;
      const machine = (c.machine ?? "run") as Parameters<typeof buildSession>[1];
      try {
        return sessionKm(buildSession(id, machine, DEFAULT_RUN_PROFILE, { longMinutes: c.minutes ?? 45, measurement: "metric" }).steps);
      } catch {
        return 0;
      }
    };
    const long = runs.find((c) => sessionOf(c) === "long");
    return {
      week,
      label: new Date(`${week}T12:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" }),
      runs: runs.length,
      km: Math.round(runs.reduce((n, c) => n + kmOf(c), 0) * 10) / 10,
      minutes: runs.reduce((n, c) => n + (c.minutes ?? 0), 0),
      longMinutes: long?.minutes ?? null,
      longKm: long ? kmOf(long) : null,
    };
  });

  // the main lifts: top working set per session, in the shown unit
  const lifts: LiftRow[] = MAIN_LIFTS.flatMap((name) => {
    const ex = (library ?? []).find((r) => r.name === name);
    if (!ex) return [];
    const bySession = new Map<string, { date: string; weight: number | null; reps: number }>();
    for (const st of recentSets ?? []) {
      if (st.exercise_id !== ex.id) continue;
      const cur = bySession.get(st.session_id);
      const w = st.weight == null ? null : convert(Number(st.weight), stored, shown);
      const better = !cur || (w ?? 0) > (cur.weight ?? 0) || ((w ?? 0) === (cur.weight ?? 0) && st.reps > cur.reps);
      if (better) bySession.set(st.session_id, { date: st.logged_at, weight: w, reps: st.reps });
    }
    const points = [...bySession.values()].sort((a, b) => a.date.localeCompare(b.date)).slice(-12);
    return [{ id: ex.id, name, unit: shown, points }];
  });

  const items: LibraryItem[] = (library ?? []).map((r) => ({
    id: r.id,
    name: r.name,
    primary_muscle: r.primary_muscle,
    equipment: r.equipment,
    custom: r.owner_id === user!.id,
  }));

  const recent = buildRecent(items, recentSets ?? []).map((r) => ({
    ...r,
    topWeight: r.topWeight == null ? null : convert(Number(r.topWeight), stored, shown),
  }));
  const hasCustom = items.some((i) => i.custom);

  return (
    <main className="mx-auto w-full max-w-lg flex-1 space-y-8 px-4 pt-4 pb-tabbar">
      <PageHeader title="Progress" subtitle="Running, strength and the wrist. Every lift is further down." />

      <RunningProgress weeks={weeks} goalRuns={WEEKLY.length} />
      <LiftProgress lifts={lifts} />
      <WristSnapshot />

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
