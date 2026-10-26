import { createClient } from "@/lib/supabase/server";
import { DEFAULT_RUN_PROFILE, nextLongMinutes, type DayContext, type RunProfile, type SessionId } from "@/lib/program/running";
import { classifyDay, type DayProfile } from "@/lib/program/day-profile";
import { addDays, localToday, nextWeekday, weekStart } from "@/lib/local-date";

export type CardioLog = {
  id: string;
  logged_on: string;
  kind: string;
  session: SessionId | null;
  machine: string | null;
  minutes: number | null;
};

// logs from before the running plan only have a kind
export function sessionOf(log: Pick<CardioLog, "kind" | "session">): SessionId {
  if (log.session) return log.session;
  if (log.kind === "intervals") return "intervals";
  if (log.kind === "tempo" || log.kind === "long") return "long";
  if (log.kind === "walk") return "walk";
  return "easy";
}

export async function loadRunProfile(userId: string): Promise<RunProfile> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("max_hr, easy_pace_s")
    .eq("id", userId)
    .maybeSingle<{ max_hr: number | null; easy_pace_s: number | null }>();
  return {
    maxHr: data?.max_hr ?? DEFAULT_RUN_PROFILE.maxHr,
    easyPaceS: data?.easy_pace_s ?? DEFAULT_RUN_PROFILE.easyPaceS,
  };
}

export async function loadLongMinutes(userId: string): Promise<number> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("cardio_logs")
    .select("minutes")
    .eq("user_id", userId)
    .eq("session", "long")
    .order("logged_on", { ascending: true })
    .returns<Array<{ minutes: number | null }>>();
  return nextLongMinutes((data ?? []).map((r) => r.minutes ?? 0).filter((m) => m > 0));
}

// everything pickForToday needs, loaded on its own so pages other than
// Today (the cardio library) can show the same fit notes
export async function loadDayContext(userId: string): Promise<DayContext> {
  const supabase = await createClient();
  const local = localToday();
  const yesterday = addDays(local.iso, -1);
  const { data: profile } = await supabase
    .from("profiles")
    .select("active_plan_id")
    .eq("id", userId)
    .maybeSingle<{ active_plan_id: string | null }>();
  type Day = { day_number: number; name: string | null; plan_day_exercises: Array<{ exercise: { name: string } | null }> };
  let today: DayProfile | null = null;
  let tomorrow: DayProfile | null = null;
  if (profile?.active_plan_id) {
    const { data: plan } = await supabase
      .from("workout_plans")
      .select("plan_weeks ( plan_days ( day_number, name, plan_day_exercises ( exercise:exercises ( name ) ) ) )")
      .eq("id", profile.active_plan_id)
      .maybeSingle<{ plan_weeks: Array<{ plan_days: Day[] }> }>();
    const days = (plan?.plan_weeks ?? []).flatMap((w) => w.plan_days);
    const profileOf = (d: Day | undefined) =>
      d ? classifyDay(d.name, d.plan_day_exercises.map((x) => x.exercise?.name ?? "").filter(Boolean)) : null;
    today = profileOf(days.find((d) => d.day_number === local.weekday));
    tomorrow = profileOf(days.find((d) => d.day_number === nextWeekday(local.weekday)));
  }
  const [{ data: logs }, { data: sessions }] = await Promise.all([
    supabase
      .from("cardio_logs")
      .select("logged_on, kind, session")
      .eq("user_id", userId)
      .gte("logged_on", yesterday)
      .returns<Array<{ logged_on: string; kind: string; session: SessionId | null }>>(),
    supabase
      .from("workout_sessions")
      .select("started_at, finished_at, plan_day:plan_days ( name )")
      .eq("user_id", userId)
      .gte("started_at", `${yesterday}T00:00:00Z`)
      .returns<Array<{ started_at: string; finished_at: string | null; plan_day: { name: string | null } | null }>>(),
  ]);
  const hardOn = (day: string) => (logs ?? []).some((r) => r.logged_on === day && sessionOf(r) === "intervals");
  const metconOn = (day: string) =>
    (sessions ?? []).some(
      (x) => x.finished_at && localToday(new Date(x.started_at)).iso === day && /metcon|conditioning/i.test(x.plan_day?.name ?? ""),
    );
  return {
    today,
    tomorrow,
    weekday: local.weekday,
    hardYesterday: hardOn(yesterday) || metconOn(yesterday),
    hardToday: hardOn(local.iso),
  };
}

export async function loadWeekDone(userId: string): Promise<SessionId[]> {
  const supabase = await createClient();
  const local = localToday();
  const { data } = await supabase
    .from("cardio_logs")
    .select("kind, session")
    .eq("user_id", userId)
    .gte("logged_on", weekStart(local))
    .returns<Array<{ kind: string; session: SessionId | null }>>();
  return (data ?? []).map(sessionOf);
}
