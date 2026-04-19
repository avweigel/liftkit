import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatDayLabel } from "@/lib/display/format-day";
import { SessionLogger } from "./session-logger";
import { SessionStartedAt } from "./session-started-at";

type Props = { params: Promise<{ sessionId: string }> };

type SessionData = {
  id: string;
  user_id: string;
  plan_day_id: string | null;
  started_at: string;
  finished_at: string | null;
  notes: string | null;
  plan_day: {
    id: string;
    day_number: number;
    name: string | null;
    notes: string | null;
    plan_week: {
      week_number: number;
      plan: { id: string; name: string } | null;
    } | null;
    plan_day_exercises: Array<{
      id: string;
      order_index: number;
      prescribed_sets: number;
      prescribed_reps: string;
      prescribed_weight: number | null;
      rest_seconds: number | null;
      notes: string | null;
      exercise: { id: string; name: string; primary_muscle: string } | null;
    }>;
  } | null;
};

type SessionSet = {
  id: string;
  exercise_id: string;
  set_number: number;
  weight: number | null;
  reps: number;
  rpe: number | null;
  is_warmup: boolean;
  notes: string | null;
  logged_at: string;
};

type HistoryRow = {
  exercise_id: string;
  session_id: string;
  set_number: number;
  weight: number | null;
  reps: number;
  logged_at: string;
};

export default async function LogSessionPage({ params }: Props) {
  const { sessionId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: session } = await supabase
    .from("workout_sessions")
    .select(
      `
        id, user_id, plan_day_id, started_at, finished_at, notes,
        plan_day:plan_days (
          id, day_number, name, notes,
          plan_week:plan_weeks (
            week_number,
            plan:workout_plans ( id, name )
          ),
          plan_day_exercises (
            id, order_index, prescribed_sets, prescribed_reps,
            prescribed_weight, rest_seconds, notes,
            exercise:exercises ( id, name, primary_muscle )
          )
        )
      `,
    )
    .eq("id", sessionId)
    .maybeSingle()
    .returns<SessionData>();

  if (!session) notFound();
  if (session.user_id !== user!.id) redirect("/");

  const exerciseIds = (session.plan_day?.plan_day_exercises ?? [])
    .map((pde) => pde.exercise?.id)
    .filter((id): id is string => !!id);

  const ninetyDaysAgo = new Date(
    Date.now() - 90 * 24 * 60 * 60 * 1000,
  ).toISOString();

  const [{ data: sets }, { data: history }] = await Promise.all([
    supabase
      .from("session_sets")
      .select(
        "id,exercise_id,set_number,weight,reps,rpe,is_warmup,notes,logged_at",
      )
      .eq("session_id", sessionId)
      .order("logged_at", { ascending: true })
      .returns<SessionSet[]>(),
    exerciseIds.length > 0
      ? supabase
          .from("session_sets")
          .select(
            "exercise_id,session_id,set_number,weight,reps,logged_at",
          )
          .in("exercise_id", exerciseIds)
          .eq("is_warmup", false)
          .neq("session_id", sessionId)
          .gte("logged_at", ninetyDaysAgo)
          .order("logged_at", { ascending: false })
          .returns<HistoryRow[]>()
      : Promise.resolve({ data: [] as HistoryRow[] }),
  ]);

  const lastSessionByExercise = new Map<
    string,
    { session_id: string; logged_at: string; sets: HistoryRow[] }
  >();
  for (const row of history ?? []) {
    const current = lastSessionByExercise.get(row.exercise_id);
    if (!current) {
      lastSessionByExercise.set(row.exercise_id, {
        session_id: row.session_id,
        logged_at: row.logged_at,
        sets: [row],
      });
    } else if (current.session_id === row.session_id) {
      current.sets.push(row);
    }
  }

  const exercises = (session.plan_day?.plan_day_exercises ?? [])
    .slice()
    .sort((a, b) => a.order_index - b.order_index)
    .map((pde) => {
      const last = pde.exercise
        ? lastSessionByExercise.get(pde.exercise.id) ?? null
        : null;
      return {
        id: pde.id,
        order_index: pde.order_index,
        exercise_id: pde.exercise?.id ?? "",
        name: pde.exercise?.name ?? "(deleted)",
        prescribed_sets: pde.prescribed_sets,
        prescribed_reps: pde.prescribed_reps,
        prescribed_weight: pde.prescribed_weight,
        rest_seconds: pde.rest_seconds,
        notes: pde.notes,
        last_session: last
          ? {
              logged_at: last.logged_at,
              sets: last.sets
                .slice()
                .sort((a, b) => a.set_number - b.set_number)
                .map((s) => ({
                  set_number: s.set_number,
                  weight: s.weight,
                  reps: s.reps,
                })),
            }
          : null,
      };
    })
    .filter((e) => e.exercise_id.length > 0);

  const title = sessionTitle(session);

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 space-y-4 px-3 py-4 sm:px-6 sm:py-8">
      <header className="space-y-1">
        <Link
          href="/"
          className="inline-flex items-center text-sm text-(--muted) hover:text-(--foreground)"
        >
          ← home
        </Link>
        <div>
          {title.weekday && (
            <div className="text-[11px] font-semibold uppercase tracking-wider text-(--accent)">
              {title.weekday}
            </div>
          )}
          <h1 className="text-xl font-bold leading-tight tracking-tight sm:text-3xl">
            {title.main}
          </h1>
          {title.sub && (
            <p className="mt-0.5 text-sm text-(--muted)">{title.sub}</p>
          )}
          <SessionStartedAt
            sessionId={session.id}
            startedAt={session.started_at}
            finishedAt={session.finished_at}
          />
        </div>
      </header>

      <SessionLogger
        sessionId={session.id}
        finished={!!session.finished_at}
        initialNotes={session.notes ?? ""}
        exercises={exercises}
        initialSets={sets ?? []}
      />
    </main>
  );
}

function sessionTitle(s: SessionData): {
  weekday: string | null;
  main: string;
  sub: string | null;
} {
  const d = s.plan_day;
  if (!d) return { weekday: null, main: "Ad Hoc Session", sub: null };
  const label = formatDayLabel(d.day_number, d.name);
  const planName = d.plan_week?.plan?.name;
  return {
    weekday: label.weekday,
    main: label.name,
    sub: planName ?? null,
  };
}
