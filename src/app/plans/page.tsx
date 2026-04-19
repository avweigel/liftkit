import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ensurePhasesLoaded } from "@/lib/seed/ensure-phases";
import { formatDayLabel } from "@/lib/display/format-day";

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

const SELECT = `
  id, name, description, is_public, owner_id,
  plan_weeks (
    plan_days (
      day_number, name,
      plan_day_exercises ( id )
    )
  )
`;

export default async function PlansPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let { data: mine } = await supabase
    .from("workout_plans")
    .select(SELECT)
    .eq("owner_id", user!.id)
    .order("name")
    .returns<PlanCard[]>();

  if (!mine || mine.length === 0) {
    try {
      await ensurePhasesLoaded(supabase, user!.id);
    } catch {
      // non-fatal — page will render with whatever state we have
    }
    const reload = await supabase
      .from("workout_plans")
      .select(SELECT)
      .eq("owner_id", user!.id)
      .order("name")
      .returns<PlanCard[]>();
    mine = reload.data;
  }

  const { data: community } = await supabase
    .from("workout_plans")
    .select(SELECT)
    .eq("is_public", true)
    .neq("owner_id", user!.id)
    .order("name")
    .returns<PlanCard[]>();

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 space-y-6 px-3 py-5 sm:px-6 sm:py-10">
      <header className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">plans</h1>
          <p className="mt-1 text-sm text-(--muted)">
            pick a plan to start tracking.
          </p>
        </div>
        <Link
          href="/plans/new"
          className="inline-flex h-10 items-center rounded-lg border border-(--border) bg-(--background) px-3 text-xs font-medium text-(--muted) hover:text-(--foreground)"
        >
          import new
        </Link>
      </header>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-(--muted)">
          my plans
        </h2>
        <PlanGrid
          plans={mine ?? []}
          empty="setting up your plans… refresh in a moment."
        />
      </section>

      {(community?.length ?? 0) > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-(--muted)">
            community
          </h2>
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
      <p className="rounded-lg border border-dashed border-(--border) p-6 text-center text-sm text-(--muted)">
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
        const previews = days
          .slice()
          .sort((a, b) => a.day_number - b.day_number)
          .slice(0, 6)
          .map((d) => formatDayLabel(d.day_number, d.name));
        return (
          <li key={p.id}>
            <Link
              href={`/plans/${p.id}`}
              className="group block h-full rounded-xl border border-(--border) bg-(--surface) p-4 transition hover:border-(--accent)"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate text-base font-bold">{p.name}</div>
                  {p.description && (
                    <p className="mt-0.5 line-clamp-2 text-xs text-(--muted)">
                      {p.description}
                    </p>
                  )}
                </div>
                {p.is_public && (
                  <span className="shrink-0 rounded border border-(--border) px-1.5 text-[10px] uppercase tracking-wider text-(--muted)">
                    public
                  </span>
                )}
              </div>

              <div className="mt-2 flex items-center gap-2 text-xs text-(--muted)">
                <span>
                  {dayCount} day{dayCount === 1 ? "" : "s"}
                </span>
                <span>·</span>
                <span>
                  {exerciseCount} exercise{exerciseCount === 1 ? "" : "s"}
                </span>
              </div>

              {previews.length > 0 && (
                <ul className="mt-3 space-y-0.5 text-xs">
                  {previews.map((d, i) => (
                    <li key={i} className="flex items-baseline gap-2">
                      <span className="w-10 shrink-0 font-semibold text-(--accent)">
                        {d.weekdayShort}
                      </span>
                      <span className="truncate text-(--foreground)/80">
                        {d.name}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
