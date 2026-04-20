import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { findCanonical } from "@/lib/exercise-normalize";
import { weightConvention } from "@/lib/display/weight-convention";
import { ProgressChart, type ChartPoint } from "./progress-chart";

type Props = { params: Promise<{ id: string }> };

type Exercise = {
  id: string;
  name: string;
  primary_muscle: string;
  equipment: string;
  owner_id: string | null;
  notes: string | null;
};

type SetRow = {
  weight: number | null;
  reps: number;
  is_warmup: boolean;
  logged_at: string;
  session_id: string;
};

type PR = {
  user_id: string;
  exercise_id: string;
  max_weight: number | null;
  max_reps: number | null;
  max_volume: number | null;
};

export default async function ExerciseDetailPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: exercise }, { data: allSets }, { data: pr }] =
    await Promise.all([
      supabase
        .from("exercises")
        .select("id,name,primary_muscle,equipment,owner_id,notes")
        .eq("id", id)
        .maybeSingle()
        .returns<Exercise>(),
      supabase
        .from("session_sets")
        .select("weight,reps,is_warmup,logged_at,session_id")
        .eq("exercise_id", id)
        .eq("is_warmup", false)
        .order("logged_at", { ascending: true })
        .returns<SetRow[]>(),
      supabase
        .from("v_personal_records")
        .select("user_id,exercise_id,max_weight,max_reps,max_volume")
        .eq("user_id", user!.id)
        .eq("exercise_id", id)
        .maybeSingle()
        .returns<PR>(),
    ]);

  if (!exercise) notFound();

  const points = computeChartPoints(allSets ?? []);
  const totalWorkingSets = (allSets ?? []).length;
  const totalSessions = new Set((allSets ?? []).map((s) => s.session_id)).size;

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 space-y-5 px-4 py-6 sm:px-6 sm:py-8">
      <header className="space-y-2">
        <Link
          href="/exercises"
          className="inline-flex items-center text-sm text-(--muted) hover:text-(--foreground)"
        >
          ← exercises
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            {exercise.name}
          </h1>
          <p className="mt-1 text-sm text-(--muted)">
            {exercise.primary_muscle.replace("_", " ")} · {exercise.equipment}
          </p>
          {(() => {
            const description =
              exercise.notes?.trim() ||
              findCanonical(exercise.name)?.description ||
              null;
            return description ? (
              <p className="mt-3 text-sm leading-relaxed text-(--foreground)/80">
                {description}
              </p>
            ) : null;
          })()}
          {(() => {
            const conv = weightConvention(exercise.name, exercise.equipment);
            if (!conv) return null;
            return (
              <p className="mt-3 rounded-lg border border-(--border) bg-(--surface) p-2 text-xs text-(--muted)">
                <span className="font-semibold text-(--foreground)">
                  weight convention
                </span>
                : {conv.summary}
              </p>
            );
          })()}
        </div>
      </header>

      <section className="grid grid-cols-3 gap-2 sm:gap-3">
        <PRChip
          label="best weight"
          value={pr?.max_weight}
          unit="lb"
          accent
        />
        <PRChip label="best reps" value={pr?.max_reps} />
        <PRChip label="best volume" value={pr?.max_volume} unit="lb" />
      </section>
      {totalWorkingSets === 0 && (
        <p className="text-xs text-(--muted)">
          prs and the chart fill in automatically once you log working sets.
          warmup sets don&rsquo;t count.
        </p>
      )}

      <section className="space-y-3 rounded-xl border border-(--border) bg-(--surface) p-4">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-(--muted)">
            progress
          </h2>
          <div className="text-xs text-(--muted)">
            {totalSessions} session{totalSessions === 1 ? "" : "s"} ·{" "}
            {totalWorkingSets} working set{totalWorkingSets === 1 ? "" : "s"}
          </div>
        </div>
        {points.length === 0 ? (
          <p className="py-6 text-center text-sm text-(--muted)">
            no working sets logged yet. your top set per session will show up
            as a dot on this chart once you start logging.
          </p>
        ) : (
          <ProgressChart points={points} />
        )}
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-(--muted)">
          recent sets
        </h2>
        {allSets && allSets.length > 0 ? (
          <ul className="divide-y divide-(--border) overflow-hidden rounded-xl border border-(--border) bg-(--surface)">
            {allSets
              .slice()
              .reverse()
              .slice(0, 20)
              .map((s, i) => (
                <li
                  key={`${s.session_id}-${s.logged_at}-${i}`}
                  className="flex items-center justify-between px-4 py-2 text-sm"
                >
                  <span className="text-(--muted)">
                    {new Date(s.logged_at).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                  <span className="tabular-nums">
                    <span className="font-semibold">{s.weight ?? "bw"}</span>
                    <span className="text-(--muted)"> × </span>
                    <span className="font-semibold">{s.reps}</span>
                  </span>
                </li>
              ))}
          </ul>
        ) : (
          <p className="rounded-xl border border-dashed border-(--border) p-6 text-center text-sm text-(--muted)">
            no sets yet.
          </p>
        )}
      </section>
    </main>
  );
}

function PRChip({
  label,
  value,
  unit,
  accent,
}: {
  label: string;
  value: number | null | undefined;
  unit?: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-3 ${accent ? "border-(--accent)/40 bg-(--accent-soft)" : "border-(--border) bg-(--surface)"}`}
    >
      <div className="text-[10px] font-semibold uppercase tracking-wider text-(--muted)">
        {label}
      </div>
      <div className="mt-1 flex items-baseline gap-1">
        <span
          className={`text-2xl font-bold tabular-nums ${accent ? "text-(--accent)" : ""}`}
        >
          {value ?? "—"}
        </span>
        {unit && value != null && (
          <span className="text-xs text-(--muted)">{unit}</span>
        )}
      </div>
    </div>
  );
}

function computeChartPoints(sets: SetRow[]): ChartPoint[] {
  const bySession = new Map<string, SetRow[]>();
  for (const s of sets) {
    const list = bySession.get(s.session_id) ?? [];
    list.push(s);
    bySession.set(s.session_id, list);
  }
  const points: ChartPoint[] = [];
  for (const list of bySession.values()) {
    const weights = list
      .map((s) => s.weight)
      .filter((w): w is number => w !== null);
    const top = weights.length > 0 ? Math.max(...weights) : null;
    if (top === null) continue;
    const earliest = list
      .map((s) => s.logged_at)
      .sort()[0];
    points.push({ date: earliest, weight: top });
  }
  return points.sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );
}
