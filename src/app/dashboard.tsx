import { Fragment, type ReactNode } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatDayLabel } from "@/lib/display/format-day";
import { parseSetCode } from "@/lib/set-code";
import { formatRxReps } from "@/lib/display/reps";
import { preferredCooldown } from "@/lib/program/cooldowns";
import { StartDayButton, StartOtherDayButton } from "./dashboard-start-button";
import { TonightCardio } from "./tonight-cardio";
import { DayOrderControl } from "./day-order-control";
import { normalizeOrder, type DayBlock } from "@/lib/program/day-order";
import {
  addDays,
  localToday,
  nextWeekday,
  weekStart,
} from "@/lib/local-date";
import { classifyDay, type DayProfile } from "@/lib/program/day-profile";
import { pickForToday } from "@/lib/program/running";
import { loadLongMinutes, sessionOf, type CardioLog } from "@/lib/running-data";

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
    plan_days: Array<{
      id: string;
      day_number: number;
      name: string | null;
      plan_day_exercises: Array<{ exercises: { name: string } | null }>;
    }>;
  }>;
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
        .select("active_plan_id, day_order")
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

  // a week of cardio, plus the day before monday so tuesday can see it
  const { data: cardioRows } = await supabase
    .from("cardio_logs")
    .select("id, logged_on, kind, session, machine, minutes")
    .eq("user_id", userId)
    .gte("logged_on", addDays(mondayIso, -1))
    .order("created_at", { ascending: true })
    .returns<CardioLog[]>();
  const cardioWeek = (cardioRows ?? []).filter((r) => r.logged_on >= mondayIso);
  const cardioTonight = cardioWeek
    .filter((r) => r.logged_on === local.iso)
    .map((r) => ({ id: r.id, session: sessionOf(r), minutes: r.minutes, machine: r.machine }));
  const yesterday = addDays(local.iso, -1);
  const metconOn = (day: string) =>
    sessions.some(
      (x) => x.finished_at && sessionDay(x) === day && /metcon|conditioning/i.test(x.plan_day?.name ?? ""),
    );
  const hardOn = (day: string) =>
    (cardioRows ?? []).some((r) => r.logged_on === day && sessionOf(r) === "intervals");
  const running = pickForToday(cardioWeek.map(sessionOf), {
    today: todayProfile,
    tomorrow: tomorrowProfile,
    weekday: local.weekday,
    hardYesterday: hardOn(yesterday) || metconOn(yesterday),
    hardToday: hardOn(local.iso),
  });
  const longMinutes = await loadLongMinutes(userId);

  const core = await loadCore(supabase, userId, local.iso, todayProfile);

  // which plan days have a session this week (mon to today)
  const doneThisWeek = new Set(
    sessions
      .filter((s) => s.plan_day_id && sessionDay(s) >= mondayIso)
      .map((s) => s.plan_day_id as string),
  );

  const { data: routineRows } = await supabase
    .from("routine_logs")
    .select("kind, status")
    .eq("user_id", userId)
    .eq("logged_on", local.iso)
    .returns<Array<{ kind: "warmup" | "cooldown"; status: "done" | "skipped" }>>();
  const routine = (k: "warmup" | "cooldown") =>
    routineRows?.find((r) => r.kind === k)?.status ?? null;
  // warm-up and cooldown only make sense around a lifting day
  const liftingDay = !!todayDay && todayProfile?.kind !== "core";
  const cooldownPick = liftingDay && todayProfile ? preferredCooldown(todayProfile.kind) : null;

  // the day line: the first step not done after the last one you did is
  // "now". anything you passed without logging just sits there, quiet.
  const dayOrder = normalizeOrder((profile as { day_order?: string[] | null } | null)?.day_order);
  const blockSteps: Record<DayBlock, Array<{ key: string; show: boolean; done: boolean }>> = {
    strength: [
      { key: "warmup", show: liftingDay, done: !!routine("warmup") },
      { key: "workout", show: true, done: !!todaySession?.finished_at },
      { key: "cooldown", show: liftingDay, done: !!routine("cooldown") },
    ],
    core: [{ key: "core", show: !!core, done: !!core?.doneToday }],
    cardio: [{ key: "cardio", show: true, done: cardioTonight.length > 0 }],
  };
  const steps = dayOrder.flatMap((b) => blockSteps[b]).filter((st) => st.show);
  const lastDone = steps.reduce((acc, st, i) => (st.done ? i : acc), -1);
  const nowIdx = steps.findIndex((st, i) => !st.done && i > lastDone);
  const stateOf = (key: string): StepState => {
    const i = steps.findIndex((st) => st.key === key);
    if (i < 0) return "later";
    if (steps[i].done) return "done";
    return i === nowIdx ? "now" : "later";
  };
  const morningState = stateOf("workout");
  // core and cardio say what they follow, since the order is yours to pick
  const AFTER: Record<DayBlock, string> = {
    strength: "After lifting",
    core: "After core",
    cardio: "After cardio",
  };
  const timeFor = (b: DayBlock) => {
    const i = dayOrder.indexOf(b);
    if (i === 0) return "First";
    if (b === "core" && dayOrder[i - 1] === "strength") return "After cooldown";
    return AFTER[dayOrder[i - 1]];
  };
  const shown = dayOrder.filter((b) => b !== "core" || !!core);
  const lastBlock = shown[shown.length - 1];

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

      {openSession && openSession.id !== todaySession?.id && openSession.id !== core?.openToday?.id && (
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
        <div className="space-y-3">
          <div className="-mt-4 flex justify-end">
            <DayOrderControl order={dayOrder} />
          </div>
          <ol className="relative space-y-6">
            {dayOrder.map((block) => (
              <Fragment key={block}>
                {block === "strength" && (
                  <>
                    {liftingDay && (
                      <Step state={stateOf("warmup")} time="Before lifting" title="Warm-up">
                        <RoutineCard
                          href="/warmup"
                          status={routine("warmup")}
                          title="Warm-up"
                          line="Pulse raiser, mobility, then a quick superset"
                          cta="Start warm-up"
                          active={stateOf("warmup") === "now"}
                        />
                      </Step>
                    )}

                    <Step state={morningState} time={dayOrder[0] === "strength" ? "Morning" : AFTER[dayOrder[dayOrder.indexOf("strength") - 1]]} title="Workout" last={lastBlock === "strength" && !(liftingDay && cooldownPick)}>
                      {todayDay ? (
                        <WorkoutCard day={todayDay} session={todaySession} />
                      ) : (
                        <RestCard />
                      )}
                    </Step>

                    {liftingDay && cooldownPick && (
                      <Step state={stateOf("cooldown")} time="After lifting" title="Cooldown" last={lastBlock === "strength"}>
                        <RoutineCard
                          href="/cooldown"
                          status={routine("cooldown")}
                          title={cooldownPick.name}
                          line={`${cooldownPick.dose ?? ""}, or swap for a stretch`}
                          cta="Start cooldown"
                          active={stateOf("cooldown") === "now"}
                        />
                      </Step>
                    )}
                  </>
                )}
                {block === "core" && (
                  <>
                    {core && (
                      <Step state={stateOf("core")} time={timeFor("core")} title="Core" last={lastBlock === "core"}>
                        <CoreCard core={core} />
                      </Step>
                    )}
                  </>
                )}
                {block === "cardio" && (
                  <>
                    <Step state={stateOf("cardio")} time={timeFor("cardio")} title="Cardio" last={lastBlock === "cardio"}>
                      <TonightCardio
                        pick={running.pick}
                        options={running.options}
                        doneThisWeek={cardioWeek.map(sessionOf)}
                        logged={cardioTonight}
                        longMinutes={longMinutes}
                      />
                    </Step>
                  </>
                )}
              </Fragment>
            ))}
          </ol>
        </div>
      )}

      {activePlan && (eveningNow() || todaySession?.finished_at) && (
        <TomorrowCard day={tomorrowDay} />
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

function stockholmHour(): number {
  return Number(
    new Intl.DateTimeFormat("en-GB", {
      hour: "numeric",
      hour12: false,
      timeZone: "Europe/Stockholm",
    }).format(new Date()),
  );
}

// from late afternoon on, the next thing you want to know is tomorrow
function eveningNow(): boolean {
  return stockholmHour() >= 17;
}

function TomorrowCard({ day }: { day: PlanDay | null }) {
  if (!day) {
    return (
      <section className="space-y-3">
        <h2 className="display text-[22px]">Tomorrow</h2>
        <div className="card p-5">
          <div className="display text-[20px]">Rest day</div>
          <p className="text-[14px] text-(--muted)">Nothing planned.</p>
        </div>
      </section>
    );
  }
  const label = formatDayLabel(day.day_number, day.name);
  const count = previewItems(day).length;
  return (
    <section className="space-y-3">
      <h2 className="display text-[22px]">Tomorrow</h2>
      <details className="card group overflow-hidden" open>
        <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 px-5 py-4 [&::-webkit-details-marker]:hidden">
          <div className="min-w-0 flex-1">
            <div className="label">{label.weekday}</div>
            <div className="display text-[24px]">{label.name}</div>
          </div>
          <span className="chip">
            <span className="num text-[13px]">{count}</span> exercises
          </span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="text-(--muted) transition-transform group-open:rotate-180" aria-hidden>
            <path d="M6 9l6 6 6-6" />
          </svg>
        </summary>
        <div className="border-t border-(--border) p-4">
          <DayExerciseList day={day} />
        </div>
      </details>
    </section>
  );
}

function previewItems(day: PlanDay) {
  return day.plan_day_exercises
    .slice()
    .sort((a, b) => a.order_index - b.order_index)
    .filter((e) => !/^\s*(\[[A-Z]\d*\]\s*)?cooldown\b/i.test(e.notes ?? ""));
}

// the day's exercises grouped as they'll be done, with the plan's notes,
// so you can see what's coming without starting anything
function DayExerciseList({ day }: { day: PlanDay }) {
  const ordered = previewItems(day);
  // consecutive exercises with the same letter are one superset
  const groups: Array<{ letter: string | null; items: typeof ordered }> = [];
  for (const e of ordered) {
    const letter = parseSetCode(e.notes).code?.letter ?? null;
    const last = groups[groups.length - 1];
    if (last && letter && last.letter === letter) last.items.push(e);
    else groups.push({ letter, items: [e] });
  }
  return (
    <ol className="space-y-3">
      {groups.map((g, gi) => (
        <li key={gi} className="flex gap-3">
          <span className="num flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-(--accent-soft) text-[14px] text-(--accent)">
            {g.letter ?? gi + 1}
          </span>
          <ul className="min-w-0 flex-1 space-y-1.5">
            {g.items.map((e) => {
              const note = parseSetCode(e.notes).cleanNotes;
              return (
                <li key={e.id}>
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="truncate text-[15px] font-semibold">{e.exercise?.name ?? "Exercise"}</span>
                    <span className="num shrink-0 text-[14px] text-(--muted)">
                      {e.prescribed_reps.includes(",")
                        ? formatRxReps(e.prescribed_reps)
                        : `${e.prescribed_sets} × ${e.prescribed_reps}`}
                    </span>
                  </div>
                  {note && <p className="text-[13px] text-(--muted)">{note}</p>}
                </li>
              );
            })}
          </ul>
        </li>
      ))}
    </ol>
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
  const totalSets = ordered.reduce((n, e) => n + e.prescribed_sets, 0);

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
            <span className="num text-[13px]">{totalSets}</span> sets
          </span>
          {lead?.exercise && leadIsStraight && (
            <span className="chip chip-accent">
              Big lift: {lead.exercise.name}
            </span>
          )}
        </div>
      </div>
      <details className="group border-t border-(--border)">
        <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between px-5 text-[14px] font-semibold text-(--accent) [&::-webkit-details-marker]:hidden">
          See the workout
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="transition-transform group-open:rotate-180" aria-hidden>
            <path d="M6 9l6 6 6-6" />
          </svg>
        </summary>
        <div className="px-5 pb-4">
          <DayExerciseList day={day} />
        </div>
      </details>
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

function RoutineCard({
  href,
  status,
  title,
  line,
  cta,
  active,
}: {
  href: string;
  status: "done" | "skipped" | null;
  title: string;
  line: string;
  cta: string;
  active: boolean;
}) {
  if (status) {
    return (
      <Link href={href} className="card flex items-center justify-between gap-3 p-4">
        <div className="min-w-0">
          <div className="truncate font-semibold">{title}</div>
          <div className="text-[13px] text-(--muted)">{status === "done" ? "Done" : "Skipped today"}</div>
        </div>
        <span className="text-[13px] font-semibold text-(--muted)">View</span>
      </Link>
    );
  }
  return (
    <section className="card space-y-3 p-4">
      <div>
        <div className="display text-[20px]">{title}</div>
        <p className="text-[14px] text-(--muted)">{line}</p>
      </div>
      <Link href={href} className={`btn btn-block ${active ? "btn-primary" : "btn-secondary"}`}>
        {cta}
      </Link>
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
                  aria-label={isDone ? "done" : d ? (past ? "not logged" : "planned") : "rest"}
                  className={`flex h-6 w-6 items-center justify-center rounded-full ${
                    isDone
                      ? "bg-(--ok) text-(--surface)"
                      : d
                        ? past
                          ? "border-2 border-(--border) opacity-50"
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
      <details className="card group overflow-hidden">
        <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between px-4 font-semibold">
          Other days
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="text-(--muted) transition-transform group-open:rotate-180" aria-hidden>
            <path d="M6 9l6 6 6-6" />
          </svg>
        </summary>
      <ul className="divide-y divide-(--border) border-t border-(--border)">
        {days
          .filter((d) => d.day_number !== todayNumber)
          .map((d) => {
            const label = formatDayLabel(d.day_number, d.name);
            return (
              <li key={d.id}>
                <details className="group/day">
                  <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 px-4 py-2 [&::-webkit-details-marker]:hidden">
                    <div className="min-w-0 flex-1">
                      <span className="mr-2 text-[13px] font-semibold text-(--muted)">
                        {label.weekdayShort}
                      </span>
                      <span className="font-medium">{label.name}</span>
                    </div>
                    <span className="text-[13px] font-semibold text-(--muted) group-open/day:hidden">Preview</span>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="text-(--muted) transition-transform group-open/day:rotate-180" aria-hidden>
                      <path d="M6 9l6 6 6-6" />
                    </svg>
                  </summary>
                  <div className="space-y-3 px-4 pb-4">
                    <DayExerciseList day={d} />
                    <StartOtherDayButton dayId={d.id} label={`Start ${label.name}`} />
                  </div>
                </details>
              </li>
            );
          })}
      </ul>
      </details>
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
  others: Array<{ id: string; name: string }>;
  doneToday: string | null;
  openToday: { id: string; name: string } | null;
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
    .select("id, name, plan_weeks ( plan_days ( id, day_number, name, plan_day_exercises ( exercises ( name ) ) ) )")
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
    .select("id, plan_day_id, started_at, finished_at")
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
  const startedToday =
    !!last && !!lastDay && localToday(new Date(last.started_at)).iso === todayIso;
  const doneToday = startedToday && last?.finished_at ? nameOf(lastDay!) : null;
  const openToday =
    startedToday && !last?.finished_at ? { id: last!.id as string, name: nameOf(lastDay!) } : null;

  // rotate through every core day (A, B, C...). on heavy leg days skip any
  // day that loads the adductors (Copenhagens), which leg day already hit.
  const legSafe = (d: (typeof days)[number]) =>
    !d.plan_day_exercises.some((x) => /copenhagen|adduct/i.test(x.exercises?.name ?? ""));
  const lastIdx = lastDay ? days.findIndex((d) => d.id === lastDay.id) : -1;
  const order = days.map((_, i) => days[(lastIdx + 1 + i) % days.length]);
  let pick = order[0];
  let reason = lastDay ? `Next in the rotation after ${nameOf(lastDay)}.` : "Start the rotation with A.";
  if (todayProfile?.heavyLegs && !legSafe(pick)) {
    const safe = order.find(legSafe);
    if (safe) {
      pick = safe;
      reason = `Heavy legs today, so ${nameOf(safe)} instead of Copenhagens.`;
    }
  }
  const others = days.filter((d) => d.id !== pick.id).map((d) => ({ id: d.id, name: nameOf(d) }));

  return {
    planName: plan.name,
    suggested: { id: pick.id, name: nameOf(pick) },
    others,
    doneToday,
    openToday,
    reason,
  };
}

function CoreCard({ core }: { core: CoreInfo }) {
  if (core.openToday) {
    return (
      <section className="card flex items-center justify-between gap-3 p-4">
        <div>
          <div className="display text-[20px]">{core.openToday.name}</div>
          <div className="text-[13px] text-(--muted)">In progress</div>
        </div>
        <Link href={`/log/${core.openToday.id}`} className="btn btn-primary btn-sm">
          Continue
        </Link>
      </section>
    );
  }
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
        {core.others.length > 0 && <span className="label">or</span>}
        {core.others.map((o) => (
          <StartOtherDayButton key={o.id} dayId={o.id} label={o.name.replace(/^core\s+/i, "")} />
        ))}
      </div>
    </section>
  );
}
