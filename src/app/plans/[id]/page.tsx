import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PlanView } from "./plan-view";
import type { PlanDetail, Exercise } from "./types";

type Props = { params: Promise<{ id: string }> };

export default async function PlanDetailPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: plan }, { data: library }, profileResult] = await Promise.all([
    supabase
      .from("workout_plans")
      .select(
        `
          id, name, description, is_public, owner_id, source_url,
          plan_weeks (
            id, week_number, name,
            plan_days (
              id, day_number, name, notes,
              plan_day_exercises (
                id, order_index, prescribed_sets, prescribed_reps,
                prescribed_weight, rest_seconds, notes,
                exercise:exercises ( id, name, primary_muscle )
              )
            )
          )
        `,
      )
      .eq("id", id)
      .maybeSingle()
      .returns<PlanDetail>(),
    supabase
      .from("exercises")
      .select("id,name,primary_muscle")
      .or(`owner_id.is.null,owner_id.eq.${user!.id}`)
      .order("name")
      .returns<Exercise[]>(),
    supabase
      .from("profiles")
      .select("active_plan_id")
      .eq("id", user!.id)
      .maybeSingle(),
  ]);

  if (!plan) notFound();

  const canEdit = plan.owner_id === user!.id;
  const activePlanId = profileResult.error
    ? null
    : (profileResult.data?.active_plan_id as string | null | undefined) ??
      null;
  const isActive = activePlanId === plan.id;

  const weeks = [...(plan.plan_weeks ?? [])]
    .sort((a, b) => a.week_number - b.week_number)
    .map((w) => ({
      ...w,
      plan_days: [...(w.plan_days ?? [])]
        .sort((a, b) => a.day_number - b.day_number)
        .map((d) => ({
          ...d,
          plan_day_exercises: [...(d.plan_day_exercises ?? [])].sort(
            (a, b) => a.order_index - b.order_index,
          ),
        })),
    }));

  return (
    <PlanView
      plan={{ ...plan, plan_weeks: weeks }}
      library={library ?? []}
      canEdit={canEdit}
      isActive={isActive}
    />
  );
}
