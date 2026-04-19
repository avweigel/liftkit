import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatDayLabel } from "@/lib/display/format-day";
import {
  StartOtherDayButton,
  StartTodayButton,
} from "./dashboard-start-button";

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

type ActivePlan = {
  id: string;
  name: string;
  plan_weeks: Array<{
    plan_days: Array<{
      id: string;
      day_number: number;
      name: string | null;
      plan_day_exercises: Array<{ id: string }>;
    }>;
  }>;
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

  const profileRes = await supabase
    .from("profiles")
    .select("active_plan_id")
    .eq("id", userId)
    .maybeSingle();
  const activePlanId = profileRes.error
    ? null
    : ((profileRes.data?.active_plan_id as string | null | undefined) ?? null);

  let activePlan: ActivePlan | null = null;
  if (activePlanId) {
    const { data } = await supabase
      .from("workout_plans")
      .select(
        `
          id, name,
          plan_weeks (
            plan_days (
              id, day_number, name,
              plan_day_exercises ( id )
            )
          )
        `,
      )
      .eq("id", activePlanId)
      .maybeSingle()
      .returns<ActivePlan>();
    activePlan = data;
  }

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 space-y-6 px-3 py-5 sm:px-6 sm:py-10">
      <header className="space-y-1">
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">today</h1>
        <p className="text-sm text-(--muted)">
          signed in as <span className="text-(--foreground)">{email}</span>
        </p>
      </header>

      {activePlan ? (
        <>
          <ActivePhaseBlock plan={activePlan} />
          <p className="text-xs text-(--muted)">
            tip: &ldquo;today&rsquo;s workout&rdquo; auto-selects the day of
            the week from your active phase (monday = day 1, saturday = day
            6). use the list below to train a different day. switch phases at{" "}
            <Link href="/plans" className="underline">
              plans
            </Link>
            .
          </p>
        </>
      ) : (
        <PickPhaseCard hasAnyPlan={(planCount ?? 0) > 0} />
      )}

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-(--muted)">
          recent sessions
        </h2>

        {!sessions || sessions.length === 0 ? (
          <p className="rounded-lg border border-dashed border-(--border) p-6 text-center text-sm text-(--muted)">
            no sessions yet. start one above.
          </p>
        ) : (
          <ul className="divide-y divide-(--border) overflow-hidden rounded-xl border border-(--border) bg-(--surface)">
            {sessions.map((s) => (
              <li key={s.id}>
                <Link
                  href={`/log/${s.id}`}
                  className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-(--accent-soft)"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">
                      {sessionTitle(s)}
                    </div>
                    <div className="text-xs text-(--muted)">
                      {formatDate(s.started_at)}
                      {s.finished_at ? "" : " · in progress"}
                    </div>
                  </div>
                  <span className="text-(--muted)">→</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

function ActivePhaseBlock({ plan }: { plan: ActivePlan }) {
  const days = (plan.plan_weeks ?? [])
    .flatMap((w) => w.plan_days ?? [])
    .sort((a, b) => a.day_number - b.day_number);

  const dow = new Date().getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
  const todayDayNumber = dow === 0 ? null : dow;
  const todayDay =
    todayDayNumber != null
      ? days.find((d) => d.day_number === todayDayNumber) ?? null
      : null;
  const otherDays = days.filter((d) => d !== todayDay);

  return (
    <section className="space-y-4">
      <div className="flex items-baseline justify-between gap-2">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wider text-(--muted)">
            active phase
          </div>
          <Link
            href={`/plans/${plan.id}`}
            className="text-base font-bold hover:underline"
          >
            {plan.name}
          </Link>
        </div>
        <Link
          href="/plans"
          className="text-xs text-(--muted) underline hover:text-(--foreground)"
        >
          switch phase
        </Link>
      </div>

      {todayDay ? (
        <TodayCard day={todayDay} />
      ) : (
        <RestDayCard planName={plan.name} />
      )}

      {otherDays.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-(--muted)">
            other days this week
          </h3>
          <ul className="divide-y divide-(--border) overflow-hidden rounded-xl border border-(--border) bg-(--surface)">
            {otherDays.map((d) => {
              const label = formatDayLabel(d.day_number, d.name);
              return (
                <li
                  key={d.id}
                  className="flex items-center justify-between gap-3 px-4 py-3"
                >
                  <div className="min-w-0">
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-(--accent)">
                      {label.weekdayShort}
                    </div>
                    <div className="truncate text-sm font-medium">
                      {label.name}
                    </div>
                  </div>
                  <StartOtherDayButton
                    dayId={d.id}
                    label={`log ${label.weekdayShort.toLowerCase()}`}
                  />
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
}

function TodayCard({
  day,
}: {
  day: ActivePlan["plan_weeks"][number]["plan_days"][number];
}) {
  const label = formatDayLabel(day.day_number, day.name);
  const exerciseCount = day.plan_day_exercises.length;
  return (
    <section className="rounded-2xl border-2 border-(--accent) bg-(--accent-soft) p-5 sm:p-6">
      <div className="space-y-1">
        <div className="text-xs font-bold uppercase tracking-wider text-(--accent)">
          today · {label.weekday}
        </div>
        <h2 className="text-2xl font-bold leading-tight sm:text-3xl">
          {label.name}
        </h2>
        <p className="text-sm text-(--muted)">
          {exerciseCount} exercise{exerciseCount === 1 ? "" : "s"} planned
        </p>
      </div>
      <StartTodayButton dayId={day.id} />
    </section>
  );
}

function RestDayCard({ planName }: { planName: string }) {
  return (
    <section className="rounded-2xl border border-dashed border-(--border) bg-(--surface) p-5 text-center">
      <div className="text-xs font-semibold uppercase tracking-wider text-(--muted)">
        rest day
      </div>
      <h2 className="mt-1 text-xl font-bold">no workout today</h2>
      <p className="mt-1 text-sm text-(--muted)">
        {planName} runs monday-saturday. take a rest, or pick another day below
        if you want to train.
      </p>
    </section>
  );
}

function PickPhaseCard({ hasAnyPlan }: { hasAnyPlan: boolean }) {
  return (
    <section className="rounded-2xl border-2 border-(--accent)/30 bg-(--accent-soft) p-5">
      <div className="text-[11px] font-bold uppercase tracking-wider text-(--accent)">
        start here
      </div>
      <h2 className="mt-1 text-lg font-bold">pick a phase</h2>
      <p className="mt-1 text-sm text-(--muted)">
        {hasAnyPlan
          ? "a phase is a workout plan you follow for 6-8 weeks. once you pick one, this home page will show today's workout automatically — no day-picking every session."
          : "we're loading your 12 phases right now. refresh in a moment, then pick one."}
      </p>
      <ol className="mt-3 space-y-1 text-xs text-(--muted)">
        <li>
          <span className="mr-1 font-bold text-(--accent)">1.</span>
          browse the phases list
        </li>
        <li>
          <span className="mr-1 font-bold text-(--accent)">2.</span>
          tap &ldquo;start this phase&rdquo; on one you want to follow
        </li>
        <li>
          <span className="mr-1 font-bold text-(--accent)">3.</span>
          come back here each day to log your workout
        </li>
      </ol>
      <Link
        href="/plans"
        className="mt-4 inline-flex h-11 items-center rounded-lg bg-(--accent) px-5 text-sm font-bold text-(--accent-contrast) shadow-sm active:scale-[0.99]"
      >
        browse phases →
      </Link>
    </section>
  );
}

function sessionTitle(s: SessionRow) {
  const day = s.plan_day;
  const plan = day?.plan_week?.plan;
  if (!day) return "ad hoc session";
  const label = formatDayLabel(day.day_number, day.name);
  if (!plan) return `${label.weekdayShort} · ${label.name}`;
  return `${label.weekdayShort} · ${label.name} — ${plan.name}`;
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}
