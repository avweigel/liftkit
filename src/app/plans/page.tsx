import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ensurePhasesLoaded } from "@/lib/seed/ensure-phases";
import { PageHeader, SectionTitle } from "@/components/page-header";
import { dayHeading, isCorePlan, isOldPhase } from "./plan-display";

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

// "Phase 2" before "Phase 10"
function byPhaseNumber(a: PlanCard, b: PlanCard): number {
  const na = Number(a.name.match(/\d+/)?.[0] ?? 0);
  const nb = Number(b.name.match(/\d+/)?.[0] ?? 0);
  return na - nb || a.name.localeCompare(b.name);
}

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
      // non-fatal: the page renders with whatever state we have
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

  const profileRes = await supabase
    .from("profiles")
    .select("active_plan_id")
    .eq("id", user!.id)
    .maybeSingle();
  const activePlanId = profileRes.error
    ? null
    : ((profileRes.data?.active_plan_id as string | null | undefined) ?? null);

  const minePlans = mine ?? [];
  const communityPlans = community ?? [];
  const active =
    [...minePlans, ...communityPlans].find((p) => p.id === activePlanId) ??
    null;

  const rest = minePlans.filter((p) => p.id !== active?.id);
  const current = rest.filter((p) => !isOldPhase(p.name));
  const phases = rest.filter((p) => isOldPhase(p.name)).sort(byPhaseNumber);
  const others = communityPlans.filter((p) => p.id !== active?.id);

  const nothingYet = minePlans.length === 0 && !active;

  return (
    <main className="mx-auto w-full max-w-lg flex-1 space-y-6 px-4 pt-4 pb-tabbar">
      <PageHeader
        title="Plans"
        subtitle="Your active plan sets today's workout."
        action={
          <Link href="/plans/new" className="btn btn-secondary btn-sm h-11">
            Import
          </Link>
        }
      />

      {active && (
        <section className="space-y-3">
          <PlanCardView plan={active} isActive />
        </section>
      )}

      {nothingYet ? (
        <p className="card p-6 text-center text-[15px] text-(--muted)">
          Setting up your plans. Refresh in a moment, or import one from a
          Google Sheet.
        </p>
      ) : (
        current.length > 0 && (
          <section className="space-y-3">
            <SectionTitle>{active ? "Other plans" : "Your plans"}</SectionTitle>
            <ul className="space-y-3">
              {current.map((p) => (
                <li key={p.id}>
                  <PlanCardView plan={p} />
                </li>
              ))}
            </ul>
          </section>
        )
      )}

      {phases.length > 0 && (
        <details className="group card overflow-hidden">
          <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 px-4 [&::-webkit-details-marker]:hidden">
            <span className="flex items-center gap-2">
              <span className="display text-[18px]">Older phases</span>
              <span className="chip num">{phases.length}</span>
            </span>
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
              className="text-(--muted) transition-transform duration-200 group-open:rotate-180"
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </summary>
          <ul className="space-y-2 border-t border-(--border) bg-(--background) p-3">
            {phases.map((p) => (
              <li key={p.id}>
                <PlanCardView plan={p} compact />
              </li>
            ))}
          </ul>
        </details>
      )}

      {others.length > 0 && (
        <section className="space-y-3">
          <SectionTitle>Community plans</SectionTitle>
          <ul className="space-y-3">
            {others.map((p) => (
              <li key={p.id}>
                <PlanCardView plan={p} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}

function PlanCardView({
  plan,
  isActive = false,
  compact = false,
}: {
  plan: PlanCard;
  isActive?: boolean;
  compact?: boolean;
}) {
  const core = isCorePlan(plan.name);
  const days = plan.plan_weeks
    .flatMap((w) => w.plan_days)
    .slice()
    .sort((a, b) => a.day_number - b.day_number);
  const exerciseCount = days.reduce(
    (n, d) => n + (d.plan_day_exercises?.length ?? 0),
    0,
  );

  return (
    <Link
      href={`/plans/${plan.id}`}
      className={`card block transition-colors duration-150 ${
        isActive
          ? "border-(--accent-line) p-5"
          : "p-4 hover:border-(--accent-line)"
      }`}
    >
      {isActive && (
        <div className="mb-2">
          <span className="chip chip-accent">Active plan</span>
        </div>
      )}
      <div className="flex items-start justify-between gap-3">
        <h3
          className={`display min-w-0 ${isActive ? "text-[26px]" : "text-[19px]"}`}
        >
          {plan.name}
        </h3>
        {plan.is_public && <span className="chip shrink-0">Public</span>}
      </div>
      {plan.description && !compact && (
        <p className="mt-1 line-clamp-2 text-[15px] text-(--muted)">
          {plan.description}
        </p>
      )}

      <div className="mt-3 flex flex-wrap gap-1.5">
        <span className="chip">
          <span className="num">{days.length}</span>
          {days.length === 1 ? "day" : "days"}
        </span>
        <span className="chip">
          <span className="num">{exerciseCount}</span>
          {exerciseCount === 1 ? "exercise" : "exercises"}
        </span>
        {core && <span className="chip">Daily A/B</span>}
      </div>

      {days.length > 0 && (
        <ul
          className={`mt-3 grid gap-x-3 gap-y-1 text-[14px] ${
            core ? "grid-cols-2" : "grid-cols-[2.75rem_1fr]"
          }`}
        >
          {days.map((d, i) => {
            const h = dayHeading(d.day_number, d.name, core);
            return core ? (
              <li key={i} className="truncate">
                {h.name}
              </li>
            ) : (
              <li key={i} className="contents">
                <span
                  className={`label ${isActive ? "text-(--accent)" : ""}`}
                >
                  {h.weekdayShort}
                </span>
                <span className="truncate">{h.name}</span>
              </li>
            );
          })}
        </ul>
      )}
    </Link>
  );
}
