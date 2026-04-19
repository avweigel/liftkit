import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

type SessionRow = {
  id: string;
  started_at: string;
  finished_at: string | null;
  notes: string | null;
  plan_day: {
    day_number: number;
    name: string | null;
    plan_week: {
      week_number: number;
      plan: { id: string; name: string } | null;
    } | null;
  } | null;
};

type Props = { userId: string; email: string };

export async function Dashboard({ userId, email }: Props) {
  const supabase = await createClient();

  const { data: sessions } = await supabase
    .from("workout_sessions")
    .select(
      `
        id,
        started_at,
        finished_at,
        notes,
        plan_day:plan_days (
          day_number,
          name,
          plan_week:plan_weeks (
            week_number,
            plan:workout_plans ( id, name )
          )
        )
      `,
    )
    .eq("user_id", userId)
    .order("started_at", { ascending: false })
    .limit(5)
    .returns<SessionRow[]>();

  const { count: planCount } = await supabase
    .from("workout_plans")
    .select("id", { count: "exact", head: true })
    .eq("owner_id", userId);

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 space-y-8 px-4 py-8 sm:px-6 sm:py-10">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">today</h1>
        <p className="text-sm text-zinc-500">signed in as {email}</p>
      </header>

      <TodayCard hasPlan={(planCount ?? 0) > 0} />

      <section className="space-y-3">
        <div className="flex items-end justify-between">
          <h2 className="text-lg font-medium">recent sessions</h2>
        </div>

        {!sessions || sessions.length === 0 ? (
          <p className="rounded-lg border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500 dark:border-zinc-700">
            no sessions yet. start one above.
          </p>
        ) : (
          <ul className="divide-y divide-zinc-200 overflow-hidden rounded-lg border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
            {sessions.map((s) => (
              <li key={s.id}>
                <Link
                  href={`/log/${s.id}`}
                  className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-900"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">
                      {sessionTitle(s)}
                    </div>
                    <div className="text-xs text-zinc-500">
                      {formatDate(s.started_at)}
                      {s.finished_at ? "" : " · in progress"}
                    </div>
                  </div>
                  <span className="text-zinc-400">→</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

function TodayCard({ hasPlan }: { hasPlan: boolean }) {
  return (
    <section className="rounded-xl border border-zinc-200 bg-zinc-50 p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-medium">ready to lift?</h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            {hasPlan
              ? "pick a plan day from your plans."
              : "you don't have a plan yet. pick one to get started."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/plans"
            className="inline-flex h-11 items-center rounded-lg bg-zinc-900 px-5 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            {hasPlan ? "browse my plans" : "browse plans"}
          </Link>
          {!hasPlan && (
            <Link
              href="/plans/new"
              className="inline-flex h-11 items-center rounded-lg border border-zinc-300 bg-white px-5 text-sm font-medium text-zinc-900 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:hover:bg-zinc-900"
            >
              import a plan
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}

function sessionTitle(s: SessionRow) {
  const day = s.plan_day;
  const plan = day?.plan_week?.plan;
  if (!day || !plan) return "ad hoc session";
  const dayLabel =
    day.name ?? `day ${day.day_number}`;
  const weekNum = day.plan_week?.week_number;
  return `${plan.name} · w${weekNum} ${dayLabel}`;
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}
