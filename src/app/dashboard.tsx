import type { ReactNode } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatDayLabel } from "@/lib/display/format-day";
import {
  DismissibleHint,
  HINT_KEYS,
} from "@/components/dismissible-hint";
import {
  StartDayButton,
  StartOtherDayButton,
  StartTodayButton,
} from "./dashboard-start-button";
import { DashboardSessionDelete } from "./dashboard-session-delete";
import { TonightCardio } from "./tonight-cardio";
import {
  localToday,
  nextWeekday,
  weekStart,
} from "@/lib/local-date";
import { classifyDay, type DayProfile } from "@/lib/program/day-profile";
import {
  HARD_KINDS,
  MAX_HARD_PER_WEEK,
  suggestCardio,
  type CardioKind,
} from "@/lib/program/cardio";

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
      plan_day_exercises: Array<{
        id: string;
        exercise: { name: string } | null;
      }>;
    }>;
  }>;
};

type PlanDay = ActivePlan["plan_weeks"][number]["plan_days"][number];

type CorePlan = {
  id: string;
  name: string;
  plan_weeks: Array<{
    plan_days: Array<{ id: string; day_number: number; name: string | null }>;
  }>;
};

type CardioRow = {
  id: string;
  logged_on: string;
  kind: CardioKind;
  minutes: number | null;
  place: "outside" | "gym" | null;
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
              plan_day_exercises ( id, exercise:exercises ( name ) )
            )
          )
        `,
      )
      .eq("id", activePlanId)
      .maybeSingle()
      .returns<ActivePlan>();
    activePlan = data;
  }

  // today in the lifter's time zone; sunday is day 7 so 7-day plans work
  const local = localToday();
  const todayDayNumber = local.weekday;
  const planDays = activePlan
    ? activePlan.plan_weeks.flatMap((w) => w.plan_days)
    : [];
  const todayDay =
    planDays.find((d) => d.day_number === todayDayNumber) ?? null;
  const tomorrowDay =
    planDays.find((d) => d.day_number === nextWeekday(todayDayNumber)) ??
    null;
  const profileOf = (d: PlanDay | null): DayProfile | null =>
    d
      ? classifyDay(
          d.name,
          d.plan_day_exercises
            .map((x) => x.exercise?.name ?? "")
            .filter(Boolean),
        )
      : null;
  const todayProfile = profileOf(todayDay);
  const tomorrowProfile = profileOf(tomorrowDay);

  const { data: cardioRows } = await supabase
    .from("cardio_logs")
    .select("id, logged_on, kind, minutes, place")
    .eq("user_id", userId)
    .gte("logged_on", weekStart(local))
    .order("created_at", { ascending: true })
    .returns<CardioRow[]>();
  const hardThisWeek = (cardioRows ?? []).filter((r) =>
    HARD_KINDS.includes(r.kind),
  ).length;
  const cardioTonight = (cardioRows ?? []).filter(
    (r) => r.logged_on === local.iso,
  );
  const cardioSuggestions = suggestCardio({
    today: todayProfile,
    tomorrow: tomorrowProfile,
    hardThisWeek,
    weekday: local.weekday,
  });

  const core = await loadCore(supabase, userId, local.iso, todayProfile);

  // Any session for today's plan day started within the last 18 hours
  let todaySession: {
    id: string;
    started_at: string;
    finished_at: string | null;
  } | null = null;
  if (todayDay) {
    const eighteenHoursAgo = new Date(
      Date.now() - 18 * 60 * 60 * 1000,
    ).toISOString();
    const { data } = await supabase
      .from("workout_sessions")
      .select("id, started_at, finished_at")
      .eq("user_id", userId)
      .eq("plan_day_id", todayDay.id)
      .gte("started_at", eighteenHoursAgo)
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    todaySession = data;
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
          <ActivePhaseBlock
            plan={activePlan}
            todaySession={todaySession}
            todayDayNumber={todayDayNumber}
          >
            {core && <CoreCard core={core} />}
            <TonightCardio
              suggestions={cardioSuggestions}
              logged={cardioTonight}
              todayLabel={
                todayDay ? formatDayLabel(todayDay.day_number, todayDay.name).name : "rest day"
              }
              tomorrowLabel={
                tomorrowDay
                  ? formatDayLabel(tomorrowDay.day_number, tomorrowDay.name).name
                  : "rest day"
              }
              hardThisWeek={hardThisWeek}
              maxHard={MAX_HARD_PER_WEEK}
            />
          </ActivePhaseBlock>
          <DismissibleHint storageKey={HINT_KEYS.dashboardTip}>
            <p className="pr-8 text-xs text-(--muted)">
              tip: &ldquo;today&rsquo;s workout&rdquo; auto-selects the day of
              the week from your active phase (monday = day 1, saturday = day
              6). use the list below to train a different day. switch phases
              at{" "}
              <Link href="/plans" className="underline">
                plans
              </Link>
              .
            </p>
          </DismissibleHint>
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
            {sessions.map((s) => {
              const open = !s.finished_at;
              return (
                <li
                  key={s.id}
                  className={`flex items-stretch ${open ? "bg-(--accent-soft)/60" : ""}`}
                >
                  <Link
                    href={`/log/${s.id}`}
                    className="flex min-w-0 flex-1 items-center justify-between gap-3 px-4 py-3 hover:bg-(--accent-soft)"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-medium">
                          {sessionTitle(s)}
                        </span>
                        {open && (
                          <span className="shrink-0 rounded-full bg-(--accent)/20 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-(--accent)">
                            open · tap to finish
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-(--muted)">
                        {formatDate(s.started_at)}
                      </div>
                    </div>
                    <span className="text-(--muted)">→</span>
                  </Link>
                  <div className="flex items-center px-2">
                    <DashboardSessionDelete sessionId={s.id} />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}

function ActivePhaseBlock({
  plan,
  todaySession,
  todayDayNumber,
  children,
}: {
  plan: ActivePlan;
  todaySession: {
    id: string;
    started_at: string;
    finished_at: string | null;
  } | null;
  todayDayNumber: number;
  children?: ReactNode;
}) {
  const days = (plan.plan_weeks ?? [])
    .flatMap((w) => w.plan_days ?? [])
    .sort((a, b) => a.day_number - b.day_number);

  const todayDay = days.find((d) => d.day_number === todayDayNumber) ?? null;
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
        <TodayCard day={todayDay} session={todaySession} />
      ) : (
        <RestDayCard planName={plan.name} />
      )}

      {children}

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
  session,
}: {
  day: ActivePlan["plan_weeks"][number]["plan_days"][number];
  session: {
    id: string;
    started_at: string;
    finished_at: string | null;
  } | null;
}) {
  const label = formatDayLabel(day.day_number, day.name);
  const exerciseCount = day.plan_day_exercises.length;
  const state: "done" | "in-progress" | "not-started" =
    session?.finished_at
      ? "done"
      : session
        ? "in-progress"
        : "not-started";
  return (
    <section className="accent-wash relative overflow-hidden rounded-2xl border border-(--accent)/40 bg-(--surface) p-5 sm:p-6">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full opacity-30 blur-3xl"
        style={{ background: "var(--accent)" }}
      />
      <div className="relative space-y-1">
        <div className="flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-wider text-(--accent)">
          <span>today · {label.weekday}</span>
          {state === "done" && (
            <span className="rounded-full bg-(--ok)/20 px-2 py-0.5 text-[10px] text-(--ok)">
              ✓ completed
            </span>
          )}
          {state === "in-progress" && (
            <span className="rounded-full bg-(--accent)/20 px-2 py-0.5 text-[10px]">
              in progress
            </span>
          )}
        </div>
        <h2 className="text-2xl font-bold leading-tight sm:text-3xl">
          {label.name}
        </h2>
        <p className="text-sm text-(--muted)">
          {exerciseCount} exercise{exerciseCount === 1 ? "" : "s"} planned
        </p>
      </div>
      <div className="relative">
        {state === "not-started" && <StartTodayButton dayId={day.id} />}
        {state === "in-progress" && session && (
          <Link
            href={`/log/${session.id}`}
            className="mt-4 inline-flex h-12 w-full items-center justify-center rounded-xl bg-(--accent) text-base font-bold text-(--accent-contrast) shadow-sm active:scale-[0.99]"
          >
            continue today&rsquo;s workout →
          </Link>
        )}
        {state === "done" && session && (
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href={`/log/${session.id}`}
              className="inline-flex h-11 items-center rounded-lg border border-(--border) bg-(--background) px-4 text-sm font-medium"
            >
              view today&rsquo;s session
            </Link>
            <StartTodayButton dayId={day.id} />
          </div>
        )}
      </div>
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
        {planName} has nothing planned today. take a rest, or pick another
        day below if you want to train.
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

type CoreInfo = {
  planName: string;
  suggested: { id: string; name: string };
  other: { id: string; name: string } | null;
  doneToday: string | null;
  reason: string;
};

async function loadCore(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  todayIso: string,
  todayProfile: DayProfile | null,
): Promise<CoreInfo | null> {
  const { data: plans } = await supabase
    .from("workout_plans")
    .select("id, name, plan_weeks ( plan_days ( id, day_number, name ) )")
    .eq("owner_id", userId)
    .ilike("name", "core%")
    .order("created_at", { ascending: false })
    .limit(1)
    .returns<CorePlan[]>();
  const plan = plans?.[0];
  if (!plan) return null;
  const days = plan.plan_weeks
    .flatMap((w) => w.plan_days)
    .sort((a, b) => a.day_number - b.day_number);
  if (days.length === 0) return null;

  const { data: last } = await supabase
    .from("workout_sessions")
    .select("plan_day_id, started_at")
    .eq("user_id", userId)
    .in(
      "plan_day_id",
      days.map((d) => d.id),
    )
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nameOf = (d: (typeof days)[number]) =>
    formatDayLabel(d.day_number, d.name).name;
  const lastDay = last ? days.find((d) => d.id === last.plan_day_id) : null;
  const doneToday =
    last && lastDay && localToday(new Date(last.started_at)).iso === todayIso
      ? nameOf(lastDay)
      : null;

  // the first day (A) never loads the adductors, so it's the safe pick on
  // heavy leg days. otherwise alternate from whatever you did last.
  let pick = days[0];
  let reason = "Alternating from your last core session.";
  if (todayProfile?.heavyLegs) {
    reason = "Heavy legs today, so A: no Copenhagens.";
  } else if (lastDay) {
    const idx = days.findIndex((d) => d.id === lastDay.id);
    pick = days[(idx + 1) % days.length];
  } else {
    reason = "Start with A.";
  }
  const other = days.find((d) => d.id !== pick.id) ?? null;

  return {
    planName: plan.name,
    suggested: { id: pick.id, name: nameOf(pick) },
    other: other ? { id: other.id, name: nameOf(other) } : null,
    doneToday,
    reason,
  };
}

function CoreCard({ core }: { core: CoreInfo }) {
  return (
    <section className="space-y-2 rounded-2xl border border-(--border) bg-(--surface) p-4">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-(--muted)">
          core today
        </h2>
        {core.doneToday && (
          <span className="rounded-full bg-(--ok)/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-(--ok)">
            ✓ {core.doneToday} done
          </span>
        )}
      </div>
      <p className="text-xs text-(--muted)">{core.reason}</p>
      <div className="flex flex-wrap items-center gap-3">
        <StartDayButton
          dayId={core.suggested.id}
          label={`start ${core.suggested.name.toLowerCase()} →`}
        />
        {core.other && (
          <StartOtherDayButton
            dayId={core.other.id}
            label={`or ${core.other.name.toLowerCase()}`}
          />
        )}
      </div>
    </section>
  );
}
