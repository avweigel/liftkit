import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { SeedButton } from "./seed-button";

type PlanCard = {
  id: string;
  name: string;
  description: string | null;
  is_public: boolean;
  owner_id: string;
  plan_weeks: Array<{
    plan_days: Array<{
      day_number: number;
      name: string | null;
      plan_day_exercises: Array<{ id: string }>;
    }>;
  }>;
};

export default async function PlansPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const select = `
    id, name, description, is_public, owner_id,
    plan_weeks (
      plan_days (
        day_number, name,
        plan_day_exercises ( id )
      )
    )
  `;

  const { data: mine } = await supabase
    .from("workout_plans")
    .select(select)
    .eq("owner_id", user!.id)
    .order("name")
    .returns<PlanCard[]>();

  const { data: community } = await supabase
    .from("workout_plans")
    .select(select)
    .eq("is_public", true)
    .neq("owner_id", user!.id)
    .order("name")
    .returns<PlanCard[]>();

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 space-y-8 px-4 py-8 sm:px-6 sm:py-10">
      <header className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">plans</h1>
          <p className="mt-1 text-sm text-zinc-500">
            pick a plan to start tracking, or import a new one.
          </p>
        </div>
        <Link
          href="/plans/new"
          className="inline-flex h-10 items-center rounded-lg border border-zinc-300 bg-white px-4 text-sm font-medium hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-950 dark:hover:bg-zinc-900"
        >
          import
        </Link>
      </header>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">my plans</h2>
        <PlanGrid
          plans={mine ?? []}
          empty="no plans yet. import one from a sheet."
        />
        {(mine?.length ?? 0) === 0 && (
          <div className="space-y-1 pt-1">
            <p className="text-xs text-zinc-500">
              or seed your account with the 12 phase workouts from the shared
              workbook:
            </p>
            <SeedButton />
          </div>
        )}
      </section>

      {(community?.length ?? 0) > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-medium">community</h2>
          <PlanGrid plans={community ?? []} empty="" />
        </section>
      )}
    </main>
  );
}

function PlanGrid({ plans, empty }: { plans: PlanCard[]; empty: string }) {
  if (plans.length === 0) {
    if (!empty) return null;
    return (
      <p className="rounded-lg border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500 dark:border-zinc-700">
        {empty}
      </p>
    );
  }
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {plans.map((p) => {
        const days = p.plan_weeks.flatMap((w) => w.plan_days);
        const dayCount = days.length;
        const exerciseCount = days.reduce(
          (n, d) => n + (d.plan_day_exercises?.length ?? 0),
          0,
        );
        const dayNames = days
          .slice()
          .sort((a, b) => a.day_number - b.day_number)
          .map((d) => d.name?.trim() || `day ${d.day_number}`)
          .slice(0, 6);
        return (
          <li key={p.id}>
            <Link
              href={`/plans/${p.id}`}
              className="group block h-full rounded-lg border border-zinc-200 p-4 transition hover:border-zinc-900 dark:border-zinc-800 dark:hover:border-zinc-100"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold">
                    {p.name}
                  </div>
                  {p.description && (
                    <p className="mt-0.5 line-clamp-2 text-xs text-zinc-500">
                      {p.description}
                    </p>
                  )}
                </div>
                {p.is_public && (
                  <span className="shrink-0 rounded border border-zinc-200 px-1.5 text-xs text-zinc-500 dark:border-zinc-800">
                    public
                  </span>
                )}
              </div>

              <div className="mt-3 flex items-center gap-3 text-xs text-zinc-500">
                <span>
                  {dayCount} day{dayCount === 1 ? "" : "s"}
                </span>
                <span>·</span>
                <span>
                  {exerciseCount} exercise{exerciseCount === 1 ? "" : "s"}
                </span>
              </div>

              {dayNames.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1">
                  {dayNames.map((n, i) => (
                    <span
                      key={i}
                      className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
                    >
                      {n}
                    </span>
                  ))}
                </div>
              )}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
