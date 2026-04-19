import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type PlanDetail = {
  id: string;
  name: string;
  description: string | null;
  is_public: boolean;
  owner_id: string;
  source_url: string | null;
  plan_weeks: Array<{
    id: string;
    week_number: number;
    name: string | null;
    plan_days: Array<{
      id: string;
      day_number: number;
      name: string | null;
      notes: string | null;
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
    }>;
  }>;
};

type Props = { params: Promise<{ id: string }> };

export default async function PlanDetailPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: plan } = await supabase
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
    .returns<PlanDetail>();

  if (!plan) notFound();

  const weeks = [...(plan.plan_weeks ?? [])].sort(
    (a, b) => a.week_number - b.week_number,
  );

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 space-y-8 px-4 py-8 sm:px-6 sm:py-10">
      <header className="space-y-2">
        <Link
          href="/plans"
          className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
        >
          ← plans
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">{plan.name}</h1>
          {plan.is_public && (
            <span className="rounded border border-zinc-200 px-1.5 text-xs text-zinc-500 dark:border-zinc-800">
              public
            </span>
          )}
        </div>
        {plan.description && (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            {plan.description}
          </p>
        )}
        {plan.source_url && (
          <p className="text-xs text-zinc-500">
            source:{" "}
            <a
              href={plan.source_url}
              target="_blank"
              rel="noreferrer"
              className="underline"
            >
              original sheet
            </a>
          </p>
        )}
      </header>

      {weeks.length === 0 ? (
        <p className="rounded-lg border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500 dark:border-zinc-700">
          this plan has no weeks yet.
        </p>
      ) : (
        <div className="space-y-6">
          {weeks.map((w) => {
            const days = [...(w.plan_days ?? [])].sort(
              (a, b) => a.day_number - b.day_number,
            );
            return (
              <section
                key={w.id}
                className="space-y-4 rounded-lg border border-zinc-200 p-5 dark:border-zinc-800"
              >
                <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
                  week {w.week_number}
                  {w.name ? ` · ${w.name}` : ""}
                </h2>
                {days.map((d) => {
                  const exs = [...(d.plan_day_exercises ?? [])].sort(
                    (a, b) => a.order_index - b.order_index,
                  );
                  return (
                    <div key={d.id} className="space-y-2">
                      <div className="text-sm font-medium">
                        day {d.day_number}
                        {d.name ? ` · ${d.name}` : ""}
                      </div>
                      {d.notes && (
                        <p className="text-xs text-zinc-500">{d.notes}</p>
                      )}
                      <ul className="divide-y divide-zinc-200 overflow-hidden rounded border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
                        {exs.map((ex) => (
                          <li
                            key={ex.id}
                            className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm"
                          >
                            <div className="min-w-0">
                              <div className="truncate font-medium">
                                {ex.exercise?.name ?? "(deleted exercise)"}
                              </div>
                              {ex.notes && (
                                <p className="text-xs text-zinc-500">
                                  {ex.notes}
                                </p>
                              )}
                            </div>
                            <div className="shrink-0 text-xs text-zinc-500 tabular-nums">
                              {ex.prescribed_sets}×{ex.prescribed_reps}
                              {ex.prescribed_weight !== null
                                ? ` @ ${ex.prescribed_weight}`
                                : ""}
                              {ex.rest_seconds !== null
                                ? ` · ${ex.rest_seconds}s rest`
                                : ""}
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </section>
            );
          })}
        </div>
      )}
    </main>
  );
}
