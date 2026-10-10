import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatDayLabel } from "@/lib/display/format-day";
import { SessionActions } from "./session-actions";
import { SessionLogger } from "./session-logger";
import { SessionStartedAt } from "./session-started-at";
import { classifyDay, warmupOptions } from "@/lib/program/day-profile";

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
      exercise: {
        id: string;
        name: string;
        primary_muscle: string;
        equipment: string;
      } | null;
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

type ExtraRow = {
  id: string;
  exercise_id: string;
  superset_code: string | null;
  order_index: number;
  prescribed_sets: number;
  prescribed_reps: string;
  prescribed_weight: number | null;
  rest_seconds: number | null;
  notes: string | null;
  exercise: {
    id: string;
    name: string;
    primary_muscle: string;
    equipment: string;
  } | null;
};

type LibraryRow = {
  id: string;
  name: string;
  primary_muscle: string;
  equipment: string;
  owner_id: string | null;
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
            exercise:exercises ( id, name, primary_muscle, equipment )
          )
        )
      `,
    )
    .eq("id", sessionId)
    .maybeSingle()
    .returns<SessionData>();

  if (!session) notFound();
  if (session.user_id !== user!.id) redirect("/");

  const { data: extrasRaw } = await supabase
    .from("session_extra_exercises")
    .select(
      `id, exercise_id, superset_code, order_index,
       prescribed_sets, prescribed_reps, prescribed_weight,
       rest_seconds, notes,
       exercise:exercises ( id, name, primary_muscle, equipment )`,
    )
    .eq("session_id", sessionId)
    .order("order_index", { ascending: true })
    .returns<ExtraRow[]>();
  const extras = extrasRaw ?? [];

  const planExerciseIds = (session.plan_day?.plan_day_exercises ?? [])
    .map((pde) => pde.exercise?.id)
    .filter((id): id is string => !!id);
  const extraExerciseIds = extras
    .map((e) => e.exercise?.id)
    .filter((id): id is string => !!id);
  const exerciseIds = [
    ...new Set([...planExerciseIds, ...extraExerciseIds]),
  ];

  // a year back: "last time" should still work after a long break
  const historyFrom = new Date(
    new Date(session.started_at).getTime() - 365 * 24 * 60 * 60 * 1000,
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
          .gte("logged_at", historyFrom)
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

  const attachLast = (
    exerciseId: string,
  ): {
    logged_at: string;
    sets: Array<{ set_number: number; weight: number | null; reps: number }>;
  } | null => {
    const last = lastSessionByExercise.get(exerciseId);
    if (!last) return null;
    return {
      logged_at: last.logged_at,
      sets: last.sets
        .slice()
        .sort((a, b) => a.set_number - b.set_number)
        .map((s) => ({
          set_number: s.set_number,
          weight: s.weight,
          reps: s.reps,
        })),
    };
  };

  const planExercises = (session.plan_day?.plan_day_exercises ?? [])
    .slice()
    .sort((a, b) => a.order_index - b.order_index)
    .map((pde) => ({
      id: pde.id,
      order_index: pde.order_index,
      exercise_id: pde.exercise?.id ?? "",
      name: pde.exercise?.name ?? "(deleted)",
      equipment: pde.exercise?.equipment ?? null,
      prescribed_sets: pde.prescribed_sets,
      prescribed_reps: pde.prescribed_reps,
      prescribed_weight: pde.prescribed_weight,
      rest_seconds: pde.rest_seconds,
      notes: pde.notes,
      is_extra: false as const,
      extra_id: null as string | null,
      superset_code_override: null as string | null,
      last_session: attachLast(pde.exercise?.id ?? ""),
    }))
    .filter((e) => e.exercise_id.length > 0);

  const extraExercises = extras
    .filter((e) => !!e.exercise)
    .map((e) => ({
      id: e.id,
      order_index: 10_000 + e.order_index,
      exercise_id: e.exercise!.id,
      name: e.exercise!.name,
      equipment: e.exercise!.equipment ?? null,
      prescribed_sets: e.prescribed_sets,
      prescribed_reps: e.prescribed_reps,
      prescribed_weight: e.prescribed_weight,
      rest_seconds: e.rest_seconds,
      notes: e.notes,
      is_extra: true as const,
      extra_id: e.id,
      superset_code_override: e.superset_code,
      last_session: attachLast(e.exercise!.id),
    }));

  // sets logged under an exercise that's no longer on this day (the plan
  // was edited, or left and right were split later) still belong to this
  // workout, so show them instead of hiding them.
  const shownIds = new Set([...planExercises, ...extraExercises].map((e) => e.exercise_id));
  const orphanIds = [
    ...new Set((sets ?? []).map((s) => s.exercise_id).filter((id) => !shownIds.has(id))),
  ];
  let orphanExercises: typeof planExercises = [];
  if (orphanIds.length > 0) {
    const { data: orphanRows } = await supabase
      .from("exercises")
      .select("id, name, equipment")
      .in("id", orphanIds)
      .returns<Array<{ id: string; name: string; equipment: string | null }>>();
    orphanExercises = (orphanRows ?? []).map((ex, i) => ({
      id: `orphan-${ex.id}`,
      order_index: 20_000 + i,
      exercise_id: ex.id,
      name: ex.name,
      equipment: ex.equipment ?? "other",
      prescribed_sets: (sets ?? []).filter((s) => s.exercise_id === ex.id).length,
      prescribed_reps: "",
      prescribed_weight: null,
      rest_seconds: null,
      notes: "Logged under an exercise that's no longer on this day",
      is_extra: false as const,
      extra_id: null,
      superset_code_override: null,
      last_session: null,
    }));
  }

  const exercises = [...planExercises, ...extraExercises, ...orphanExercises];

  const { data: libraryRaw } = await supabase
    .from("exercises")
    .select("id,name,primary_muscle,equipment,owner_id")
    .or(`owner_id.is.null,owner_id.eq.${user!.id}`)
    .order("name")
    .returns<LibraryRow[]>();
  const library = libraryRaw ?? [];

  const activeSupersetCodes = [
    ...new Set(
      exercises
        .map((e) =>
          e.superset_code_override ??
          (e.notes?.match(/^\[([A-Za-z]+)\d+\]/)?.[1] ?? null),
        )
        .filter((c): c is string => !!c)
        .map((c) => c.toUpperCase()),
    ),
  ].sort();

  const planName =
    session.plan_day?.plan_week?.plan?.name ?? null;

  const title = sessionTitle(session);

  const dayProfile = session.plan_day
    ? classifyDay(
        session.plan_day.name,
        planExercises.map((e) => e.name),
      )
    : null;
  const warmup =
    dayProfile && dayProfile.kind !== "core"
      ? { kind: dayProfile.kind, options: warmupOptions(dayProfile.kind) }
      : null;

  return (
    <main className="mx-auto w-full max-w-lg flex-1 space-y-5 px-4 pb-32">
      <header className="space-y-1 pt-[max(env(safe-area-inset-top),0.5rem)]">
        <Link
          href="/"
          className="-ml-1 inline-flex h-10 items-center gap-1 rounded-lg px-1 text-[15px] font-medium text-(--muted) hover:text-(--foreground)"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M15 5l-7 7 7 7" />
          </svg>
          Today
        </Link>
        {(title.weekday || title.sub) && (
          <div className="label">
            {[title.weekday, title.sub].filter(Boolean).join(", ")}
          </div>
        )}
        <h1 className="display text-[34px]">{title.main}</h1>
        <SessionStartedAt
          sessionId={session.id}
          startedAt={session.started_at}
          finishedAt={session.finished_at}
        />
      </header>

      <SessionLogger
        sessionId={session.id}
        finished={!!session.finished_at}
        initialNotes={session.notes ?? ""}
        exercises={exercises}
        initialSets={sets ?? []}
        library={library}
        activeSupersetCodes={activeSupersetCodes}
        planName={planName}
        hasPlanDay={!!session.plan_day_id}
        warmup={warmup}
      />

      <SessionActions
        sessionId={session.id}
        finished={!!session.finished_at}
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
  if (!d) return { weekday: null, main: "Workout", sub: "No plan" };
  const label = formatDayLabel(d.day_number, d.name);
  const planName = d.plan_week?.plan?.name;
  return {
    weekday: label.weekday,
    main: label.name,
    sub: planName ?? null,
  };
}
