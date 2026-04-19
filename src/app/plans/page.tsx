import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { SeedButton } from "./seed-button";

type PlanRow = {
  id: string;
  name: string;
  description: string | null;
  is_public: boolean;
  owner_id: string;
  source_url: string | null;
};

export default async function PlansPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: mine } = await supabase
    .from("workout_plans")
    .select("id,name,description,is_public,owner_id,source_url")
    .eq("owner_id", user!.id)
    .order("name")
    .returns<PlanRow[]>();

  const { data: community } = await supabase
    .from("workout_plans")
    .select("id,name,description,is_public,owner_id,source_url")
    .eq("is_public", true)
    .neq("owner_id", user!.id)
    .order("name")
    .returns<PlanRow[]>();

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 space-y-8 px-4 py-8 sm:px-6 sm:py-10">
      <header className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">plans</h1>
          <p className="mt-1 text-sm text-zinc-500">
            programs you own and public ones others have shared.
          </p>
        </div>
        <Link
          href="/plans/new"
          className="inline-flex h-10 items-center rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          import plan
        </Link>
      </header>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">my plans</h2>
        <PlanList plans={mine ?? []} empty="no plans yet. import one from a sheet." />
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

      <section className="space-y-3">
        <h2 className="text-lg font-medium">community</h2>
        <PlanList plans={community ?? []} empty="no public plans yet." />
      </section>
    </main>
  );
}

function PlanList({ plans, empty }: { plans: PlanRow[]; empty: string }) {
  if (plans.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500 dark:border-zinc-700">
        {empty}
      </p>
    );
  }
  return (
    <ul className="divide-y divide-zinc-200 overflow-hidden rounded-lg border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
      {plans.map((p) => (
        <li key={p.id}>
          <Link
            href={`/plans/${p.id}`}
            className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-900"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="truncate text-sm font-medium">{p.name}</span>
                {p.is_public && (
                  <span className="rounded border border-zinc-200 px-1.5 text-xs text-zinc-500 dark:border-zinc-800">
                    public
                  </span>
                )}
              </div>
              {p.description && (
                <p className="mt-0.5 truncate text-xs text-zinc-500">
                  {p.description}
                </p>
              )}
            </div>
            <span className="text-zinc-400">→</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
