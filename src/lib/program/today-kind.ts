import type { createClient } from "@/lib/supabase/server";
import { classifyDay, type DayKind } from "@/lib/program/day-profile";
import { localToday } from "@/lib/local-date";

type Supabase = Awaited<ReturnType<typeof createClient>>;

type PlanDays = {
  plan_weeks: Array<{
    plan_days: Array<{
      day_number: number;
      name: string | null;
      plan_day_exercises: Array<{ exercise: { name: string } | null }>;
    }>;
  }>;
};

// what kind of day today is in the active plan: drives which warm-up and
// cooldown get suggested
export async function todayKind(
  supabase: Supabase,
  userId: string,
): Promise<{ kind: DayKind; dayName: string | null }> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("active_plan_id")
    .eq("id", userId)
    .maybeSingle();
  const planId = (profile?.active_plan_id as string | null | undefined) ?? null;
  if (!planId) return { kind: "other", dayName: null };
  const { data: plan } = await supabase
    .from("workout_plans")
    .select("plan_weeks ( plan_days ( day_number, name, plan_day_exercises ( exercise:exercises ( name ) ) ) )")
    .eq("id", planId)
    .maybeSingle()
    .returns<PlanDays>();
  const day = (plan?.plan_weeks ?? [])
    .flatMap((w) => w.plan_days)
    .find((d) => d.day_number === localToday().weekday);
  if (!day) return { kind: "other", dayName: null };
  const profileOf = classifyDay(
    day.name,
    day.plan_day_exercises.map((x) => x.exercise?.name ?? "").filter(Boolean),
  );
  return { kind: profileOf.kind === "core" ? "other" : profileOf.kind, dayName: day.name };
}

export async function routineStatus(
  supabase: Supabase,
  userId: string,
  kind: "warmup" | "cooldown",
): Promise<"done" | "skipped" | null> {
  const { data } = await supabase
    .from("routine_logs")
    .select("status")
    .eq("user_id", userId)
    .eq("logged_on", localToday().iso)
    .eq("kind", kind)
    .maybeSingle();
  return (data?.status as "done" | "skipped" | undefined) ?? null;
}
