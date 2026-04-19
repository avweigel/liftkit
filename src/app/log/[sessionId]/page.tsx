import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SessionLogger } from "./session-logger";

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

  const { data: sets } = await supabase
    .from("session_sets")
    .select(
      "id,exercise_id,set_number,weight,reps,rpe,is_warmup,notes,logged_at",
    )
    .eq("session_id", sessionId)
    .order("logged_at", { ascending: true })
    .returns<SessionSet[]>();

  const exercises = (session.plan_day?.plan_day_exercises ?? [])
    .slice()
    .sort((a, b) => a.order_index - b.order_index)
    .map((pde) => ({
      plan_day_exercise_id: pde.id,
      exercise_id: pde.exercise?.id ?? "",
      name: pde.exercise?.name ?? "(deleted)",
      prescribed_sets: pde.prescribed_sets,
      prescribed_reps: pde.prescribed_reps,
      prescribed_weight: pde.prescribed_weight,
      rest_seconds: pde.rest_seconds,
      notes: pde.notes,
    }))
    .filter((e) => e.exercise_id.length > 0);

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 space-y-6 px-4 py-6 sm:px-6 sm:py-8">
      <header className="space-y-2">
        <Link
          href="/"
          className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
        >
          ← home
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">
          {sessionTitle(session)}
        </h1>
        <p className="text-xs text-zinc-500">
          started {formatDateTime(session.started_at)}
          {session.finished_at
            ? ` · finished ${formatDateTime(session.finished_at)}`
            : ""}
        </p>
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

function sessionTitle(s: SessionData): string {
  const d = s.plan_day;
  if (!d) return "ad hoc session";
  const planName = d.plan_week?.plan?.name;
  const weekNum = d.plan_week?.week_number;
  const dayLabel = d.name?.trim() || `day ${d.day_number}`;
  return planName ? `${planName} · w${weekNum} ${dayLabel}` : dayLabel;
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
