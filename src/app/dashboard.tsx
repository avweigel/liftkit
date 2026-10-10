import type { ReactNode } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatDayLabel } from "@/lib/display/format-day";
import { parseSetCode } from "@/lib/set-code";
import { StartDayButton, StartOtherDayButton } from "./dashboard-start-button";
import { TonightCardio } from "./tonight-cardio";
import {
  addDays,
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
  plan_day_id: string | null;
  plan_day: {
    day_number: number;
    name: string | null;
    plan_week: {
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
        order_index: number;
        notes: string | null;
        prescribed_sets: number;
        prescribed_reps: string;
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

type StepState = "done" | "now" | "later";

export async function Dashboard({ userId }: Props) {
  const supabase = await createClient();
  const local = localToday();
  const mondayIso = weekStart(local);

  const [{ data: profile }, { count: planCount }, { data: recent }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("active_plan_id")
        .eq("id", userId)
        .maybeSingle(),
      supabase
        .from("workout_plans")
        .select("id", { count: "exact", head: true })
        .eq("owner_id", userId),
      supabase
        .from("workout_sessions")
        .select(
          `id, started_at, finished_at, plan_day_id,
           plan_day:plan_days ( day_number, name,
             plan_week:plan_weeks ( plan:workout_plans ( id, name ) ) )`,
        )
        .eq("user_id", userId)
        .gte("started_at", `${addDays(mondayIso, -14)}T00:00:00Z`)
        .order("started_at", { ascending: false })
        .limit(40)
        .returns<SessionRow[]>(),
    ]);

  const activePlanId =
    (profile?.active_plan_id as string | null | undefined) ?? null;

  let activePlan: ActivePlan | null = null;
  if (activePlanId) {
    const { data } = await supabase
      .from("workout_plans")
      .select(
        `id, name,
         plan_weeks ( plan_days ( id, day_number, name,
           plan_day_exercises ( id, order_index, notes, prescribed_sets, prescribed_reps,
             exercise:exercises ( name ) ) ) )`,
      )
      .eq("id", activePlanId)
      .maybeSingle()
      .returns<ActivePlan>();
    activePlan = data;
  }

  const sessions = recent ?? [];
  const sessionDay = (s: SessionRow) =>
    localToday(new Date(s.started_at)).iso;

  const planDays = (activePlan?.plan_weeks ?? [])
    .flatMap((w) => w.plan_days)
    .sort((a, b) => a.day_number - b.day_number);
  const todayDay = planDays.find((d) => d.day_number === local.weekday) ?? null;
  const tomorrowDay =
    planDays.find((d) => d.day_number === nextWeekday(local.weekday)) ?? null;

  const profileOf = (d: PlanDay | null): DayProfile | null =>
    d
      ? classifyDay(
          d.name,
          d.plan_day_exercises.map((x) => x.exercise?.name ?? "").filter(Boolean),
        )
      : null;
  const todayProfile = profileOf(todayDay);
  const tomorrowProfile = profileOf(tomorrowDay);

  const todaySession = todayDay
    ? sessions.find(
        (s) => s.plan_day_id === todayDay.id && sessionDay(s) === local.iso,
      ) ?? null
    : null;
  const openSession = sessions.find((s) => !s.finished_at) ?? null;

  const { data: cardioRows } = await supabase
    .from("cardio_logs")
    .select("id, logged_on, kind, minutes, place")
    .eq("user_id", userId)
    .gte("logged_on", mondayIso)
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

  // which plan days have a session this week (mon to today)
  const doneThisWeek = new Set(
    sessions
      .filter((s) => s.plan_day_id && sessionDay(s) >= mondayIso)
      .map((s) => s.plan_day_id as string),
  );

  const morningState: StepState = todaySession?.finished_at
    ? "done"
    : "now";
  const coreState: StepState = core?.doneToday
    ? "done"
    : morningState === "done"
      ? "now"
      : "later";
  const eveningState: StepState =
    cardioTonight.length > 0
      ? "done"
      : morningState === "done" && coreState === "done"
        ? "now"
        : "later";

  const dateLine = new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "Europe/Stockholm",
  }).format(new Date());

  return (
    <main className="mx-auto w-full max-w-lg flex-1 space-y-8 px-4 pt-4 pb-tabbar">
      <header className="space-y-1 pt-[max(env(safe-area-inset-top),0.5rem)]">
        <div className="label">{dateLine}</div>
        <h1 className="display text-[34px]">{greeting()}</h1>
        {activePlan && (
          <Link
            href={`/plans/${activePlan.id}`}
            className="inline-flex text-[15px] text-(--muted) hover:text-(--foreground)"
          >
            {activePlan.name}
          </Link>
        )}
      </header>

      {openSession && openSession.id !== todaySession?.id && (
        <Link
          href={`/log/${openSession.id}`}
          className="card flex items-center justify-between gap-3 border-(--accent-line) p-4"
        >
          <div className="min-w-0">
            <div className="label">Unfinished workout</div>
            <div className="truncate font-semibold">{sessionTitle(openSession)}</div>
          </div>
          <span className="btn btn-secondary btn-sm">Open</span>
        </Link>
      )}

      {!activePlan ? (
        <PickPlanCard hasAnyPlan={(planCount ?? 0) > 0} />
      ) : (
        <ol className="relative space-y-6">
          <Step state={morningState} time="Morning" title="Workout">
            {todayDay ? (
              <WorkoutCard day={todayDay} session={todaySession} />
            ) : (
              <RestCard />
            )}
          </Step>

          {core && (
            <Step state={coreState} time="After lifting" title="Core">
              <CoreCard core={core} />
            </Step>
          )}

          <Step state={eveningState} time="Evening" title="Cardio" last>
            <TonightCardio
              suggestions={cardioSuggestions}
              logged={cardioTonight}
              tomorrowLabel={
                tomorrowDay
                  ? formatDayLabel(tomorrowDay.day_number, tomorrowDay.name).name
                  : "a rest day"
              }
              hardThisWeek={hardThisWeek}
              maxHard={MAX_HARD_PER_WEEK}
            />
          </Step>
        </ol>
      )}

      {activePlan && planDays.length > 0 && (
        <WeekStrip
          days={planDays}
          todayNumber={local.weekday}
          done={doneThisWeek}
        />
      )}

      <RecentSessions sessions={sessions.filter((s) => s.finished_at).slice(0, 5)} />
    </main>
  );
}

function greeting() {
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", {
      hour: "numeric",
      hour12: false,
      timeZone: "Europe/Stockholm",
    }).format(new Date()),
  );
  if (hour < 4) return "Late night";
  if (hour < 11) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

// one stop on the day line: a dot on the rail, a time, then its card
function Step({
  state,
  time,
  title,
  last = false,
  children,
}: {
  state: StepState;
  time: string;
  title: string;
  last?: boolean;
  children: ReactNode;
}) {
  return (
    <li className="relative pl-8">
      {!last && (
        <span
          aria-hidden
          className="absolute top-6 bottom-[-1.5rem] left-[9px] w-[2px] rounded-full bg-(--border)"
        />
      )}
      <span
        aria-hidden
        className={`absolute top-[5px] left-0 flex h-5 w-5 items-center justify-center rounded-full ${
          state === "done"
            ? "bg-(--ok) text-(--surface)"
            : state === "now"
              ? "bg-(--accent) ring-4 ring-(--accent-soft)"
              : "border-2 border-(--border) bg-(--background)"
        }`}
      >
        {state === "done" && (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12.5l4.5 4.5L19 7.5" />
          </svg>
        )}
      </span>
      <div className="mb-2 flex items-baseline gap-2">
        <h2 className="display text-[22px]">{title}</h2>
        <span className="label">{time}</span>
        {state === "done" && <span className="chip chip-ok ml-auto">Done</span>}
      </div>
      {children}
    </li>
  );
}

function WorkoutCard({
  day,
  session,
}: {
  day: PlanDay;
  session: SessionRow | null;
}) {
  const label = formatDayLabel(day.day_number, day.name);
  const ordered = day.plan_day_exercises
    .slice()
    .sort((a, b) => a.order_index - b.order_index);
  const lead = ordered[0];
  const leadIsStraight =
    lead &&
    ordered.filter(
      (e) => parseSetCode(e.notes).code?.letter === parseSetCode(lead.notes).code?.letter,
    ).length === 1;
  const blocks = new Set(
    ordered.map((e) => parseSetCode(e.notes).code?.letter ?? e.id),
  ).size;

  return (
    <section className="card overflow-hidden">
      <div className="space-y-3 p-5">
        <div>
          <div className="label">{label.weekday}</div>
          <h3 className="display text-[30px]">{label.name}</h3>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <span className="chip">
            <span className="num text-[13px]">{ordered.length}</span> exercises
          </span>
          <span className="chip">
            <span className="num text-[13px]">{blocks}</span> blocks
          </span>
          {lead?.exercise && leadIsStraight && (
            <span className="chip chip-accent">
              Big lift: {lead.exercise.name}
            </span>
          )}
        </div>
      </div>
      <div className="border-t border-(--border) bg-(--surface-2)/50 p-3">
        {!session ? (
          <StartDayButton dayId={day.id} label="Start workout" block />
        ) : session.finished_at ? (
          <Link href={`/log/${session.id}`} className="btn btn-secondary btn-block">
            View today&rsquo;s workout
          </Link>
        ) : (
          <Link href={`/log/${session.id}`} className="btn btn-primary btn-block">
            Continue workout
          </Link>
        )}
      </div>
    </section>
  );
}

function RestCard() {
  return (
    <section className="card space-y-1 p-5">
      <h3 className="display text-[22px]">Rest day</h3>
      <p className="text-[15px] text-(--muted)">
        Nothing planned this morning. Pick any day below if you want to train.
      </p>
    </section>
  );
}

function WeekStrip({
  days,
  todayNumber,
  done,
}: {
  days: PlanDay[];
  todayNumber: number;
  done: Set<string>;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-baseline justify-between px-1">
        <h2 className="display text-[22px]">This week</h2>
      </div>
      <ul className="grid grid-cols-7 gap-1.5">
        {[1, 2, 3, 4, 5, 6, 7].map((n) => {
          const d = days.find((x) => x.day_number === n);
          const label = formatDayLabel(n, d?.name);
          const isToday = n === todayNumber;
          const isDone = d ? done.has(d.id) : false;
          const past = n < todayNumber;
          return (
            <li key={n}>
              <div
                className={`flex h-[68px] flex-col items-center justify-center gap-1 rounded-xl text-center ${
                  isToday
                    ? "bg-(--accent-soft) ring-1 ring-(--accent-line)"
                    : "bg-(--surface)"
                }`}
              >
                <span className={`text-[12px] font-semibold ${isToday ? "text-(--accent)" : "text-(--muted)"}`}>
                  {label.weekdayShort.slice(0, 2)}
                </span>
                <span
                  aria-label={isDone ? "done" : d ? (past ? "missed" : "planned") : "rest"}
                  className={`flex h-6 w-6 items-center justify-center rounded-full ${
                    isDone
                      ? "bg-(--ok) text-(--surface)"
                      : d
                        ? past
                          ? "border-2 border-dashed border-(--border)"
                          : "border-2 border-(--border)"
                        : ""
                  }`}
                >
                  {isDone ? (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12.5l4.5 4.5L19 7.5" />
                    </svg>
                  ) : !d ? (
                    <span className="h-1 w-1 rounded-full bg-(--faint)" />
                  ) : null}
                </span>
              </div>
            </li>
          );
        })}
      </ul>
      <ul className="card divide-y divide-(--border) overflow-hidden">
        {days
          .filter((d) => d.day_number !== todayNumber)
          .map((d) => {
            const label = formatDayLabel(d.day_number, d.name);
            return (
              <li key={d.id} className="flex min-h-14 items-center justify-between gap-3 px-4 py-2">
                <div className="min-w-0">
                  <span className="mr-2 text-[13px] font-semibold text-(--muted)">
                    {label.weekdayShort}
                  </span>
                  <span className="font-medium">{label.name}</span>
                </div>
                <StartOtherDayButton dayId={d.id} label="Train" />
              </li>
            );
          })}
      </ul>
    </section>
  );
}

function RecentSessions({ sessions }: { sessions: SessionRow[] }) {
  if (sessions.length === 0) return null;
  return (
    <section className="space-y-3">
      <h2 className="display px-1 text-[22px]">Recent</h2>
      <ul className="card divide-y divide-(--border) overflow-hidden">
        {sessions.map((s) => (
          <li key={s.id}>
            <Link
              href={`/log/${s.id}`}
              className="flex min-h-14 items-center justify-between gap-3 px-4 py-3 hover:bg-(--surface-2)"
            >
              <div className="min-w-0">
                <div className="truncate font-medium">{sessionTitle(s)}</div>
                <div className="text-[13px] text-(--muted)">
                  {formatDate(s.started_at)}
                  {s.plan_day?.plan_week?.plan?.name
                    ? `, ${s.plan_day.plan_week.plan.name}`
                    : ""}
                </div>
              </div>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-(--faint)" aria-hidden>
                <path d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function PickPlanCard({ hasAnyPlan }: { hasAnyPlan: boolean }) {
  return (
    <section className="card space-y-3 p-5">
      <h2 className="display text-[26px]">Pick a plan to follow</h2>
      <p className="text-[15px] text-(--muted)">
        {hasAnyPlan
          ? "Choose one of your plans and this screen will show each day's workout, your core routine and tonight's cardio."
          : "Import a plan from a Google Sheet to get started."}
      </p>
      <Link href={hasAnyPlan ? "/plans" : "/plans/new"} className="btn btn-primary btn-block">
        {hasAnyPlan ? "Choose a plan" : "Import a plan"}
      </Link>
    </section>
  );
}

function sessionTitle(s: SessionRow) {
  const day = s.plan_day;
  if (!day) return "Workout without a plan";
  return formatDayLabel(day.day_number, day.name).name;
}

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "Europe/Stockholm",
  }).format(new Date(iso));
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

  const nameOf = (d: (typeof days)[number]) => d.name ?? `Day ${d.day_number}`;
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
    reason = "Heavy legs today, so no Copenhagens.";
  } else if (lastDay) {
    const idx = days.findIndex((d) => d.id === lastDay.id);
    pick = days[(idx + 1) % days.length];
  } else {
    reason = "Start the rotation with A.";
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
  if (core.doneToday) {
    return (
      <section className="card flex items-center justify-between gap-3 p-4">
        <div>
          <div className="font-semibold">{core.doneToday}</div>
          <div className="text-[13px] text-(--muted)">Done for today</div>
        </div>
      </section>
    );
  }
  return (
    <section className="card space-y-3 p-4">
      <div>
        <div className="display text-[20px]">{core.suggested.name}</div>
        <p className="text-[14px] text-(--muted)">{core.reason}</p>
      </div>
      <div className="flex items-center gap-2">
        <StartDayButton
          dayId={core.suggested.id}
          label={`Start ${core.suggested.name}`}
          variant="secondary"
        />
        {core.other && (
          <StartOtherDayButton dayId={core.other.id} label={`Do ${core.other.name} instead`} />
        )}
      </div>
    </section>
  );
}
