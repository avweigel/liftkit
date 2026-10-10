import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { findCanonical } from "@/lib/exercise-normalize";
import { weightConvention } from "@/lib/display/weight-convention";
import { PageHeader, SectionTitle } from "@/components/page-header";
import { enumLabel, formatSet, shortDate } from "../labels";
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

type Records = {
  bestWeight: SetRow | null;
  bestReps: SetRow | null;
  bestVolume: SetRow | null;
};

type Session = { id: string; at: string; sets: SetRow[] };

export default async function ExerciseDetailPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: exercise }, { data: allSets }, { data: profile }] =
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
        .from("profiles")
        .select("units")
        .eq("id", user!.id)
        .maybeSingle()
        .returns<{ units: "lb" | "kg" | null }>(),
    ]);

  if (!exercise) notFound();

  const unit = profile?.units ?? "lb";
  const sets = allSets ?? [];
  const sessions = groupSessions(sets);
  const records = computeRecords(sets);
  const weighted = records.bestWeight !== null;
  const points = computeChartPoints(sessions, weighted);

  const muscle = enumLabel(exercise.primary_muscle);
  const equipment = enumLabel(exercise.equipment);
  const description =
    exercise.notes?.trim() || findCanonical(exercise.name)?.description || null;
  const convention = weightConvention(exercise.name, exercise.equipment);

  return (
    <main className="mx-auto w-full max-w-lg flex-1 space-y-6 px-4 pt-4 pb-tabbar">
      <PageHeader
        back={{ href: "/exercises", label: "Progress" }}
        title={exercise.name}
      />

      {(muscle || equipment || exercise.owner_id) && (
        <div className="-mt-2 flex flex-wrap gap-1.5">
          {muscle && <span className="chip">{muscle}</span>}
          {equipment && <span className="chip">{equipment}</span>}
          {exercise.owner_id && <span className="chip">Custom</span>}
        </div>
      )}

      {sets.length === 0 ? (
        <div className="card space-y-1 p-5">
          <p className="text-[16px] font-medium">No working sets yet</p>
          <p className="text-[15px] text-(--muted)">
            Log this exercise in a workout and your records and trend fill in
            here. Warmup sets do not count.
          </p>
        </div>
      ) : (
        <>
          <section className="grid grid-cols-3 gap-2">
            {weighted ? (
              <>
                <Tile
                  label="Best weight"
                  value={records.bestWeight!.weight!}
                  unit={unit}
                  detail={`× ${records.bestWeight!.reps}`}
                  accent
                />
                {records.bestReps && (
                  <Tile
                    label="Best reps"
                    value={records.bestReps.reps}
                    detail={`at ${records.bestReps.weight} ${unit}`}
                  />
                )}
                {records.bestVolume && (
                  <Tile
                    label="Best set"
                    value={records.bestVolume.weight! * records.bestVolume.reps}
                    unit={unit}
                    detail={formatSet(
                      records.bestVolume.weight,
                      records.bestVolume.reps,
                    )}
                  />
                )}
              </>
            ) : (
              <>
                {records.bestReps && (
                  <Tile
                    label="Best reps"
                    value={records.bestReps.reps}
                    detail="Bodyweight"
                    accent
                  />
                )}
                <Tile label="Sessions" value={sessions.length} />
                <Tile label="Working sets" value={sets.length} />
              </>
            )}
          </section>

          <section className="space-y-3">
            <SectionTitle
              action={
                <span className="label">
                  <span className="num">{sessions.length}</span>{" "}
                  {sessions.length === 1 ? "session" : "sessions"}
                </span>
              }
            >
              {weighted ? "Top set" : "Most reps"}
            </SectionTitle>
            <div className="card p-4">
              {points.length < 2 ? (
                <div className="space-y-1 py-6 text-center">
                  <p className="text-[16px] font-medium">
                    Log this twice to see a trend
                  </p>
                  <p className="text-[14px] text-(--muted)">
                    Each session adds a point for your best set.
                  </p>
                </div>
              ) : (
                <ProgressChart
                  points={points}
                  unit={weighted ? unit : "reps"}
                />
              )}
            </div>
          </section>
        </>
      )}

      {(description || convention) && (
        <section className="space-y-3">
          <SectionTitle>About</SectionTitle>
          <div className="card space-y-3 p-4 text-[15px]">
            {description && <p>{sentence(description)}</p>}
            {convention && (
              <div className="rounded-[12px] bg-(--surface-2) p-3">
                <div className="label">How to enter weight</div>
                <p className="mt-0.5 text-[14px]">
                  {sentence(convention.summary)}
                </p>
              </div>
            )}
          </div>
        </section>
      )}

      {sessions.length > 0 && (
        <section className="space-y-3">
          <SectionTitle>Recent sessions</SectionTitle>
          <ul className="card divide-y divide-(--border) overflow-hidden">
            {sessions
              .slice()
              .reverse()
              .slice(0, 10)
              .map((s) => (
                <li key={s.id} className="flex gap-4 px-4 py-3">
                  <span className="label w-14 shrink-0 pt-0.5">
                    {shortDate(s.at)}
                  </span>
                  <span className="flex min-w-0 flex-1 flex-wrap gap-x-4 gap-y-1">
                    {s.sets.map((set, i) => (
                      <span key={i} className="num text-[16px]">
                        {formatSet(set.weight, set.reps)}
                      </span>
                    ))}
                  </span>
                </li>
              ))}
          </ul>
        </section>
      )}
    </main>
  );
}

function Tile({
  label,
  value,
  unit,
  detail,
  accent,
}: {
  label: string;
  value: number;
  unit?: string;
  detail?: ReactNode;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-[16px] border p-3 ${
        accent
          ? "border-(--accent-line) bg-(--accent-soft)"
          : "border-(--border) bg-(--surface)"
      }`}
    >
      <div className="label">{label}</div>
      <div className="mt-1 flex items-baseline gap-1">
        <span
          className={`num text-[26px] leading-none ${accent ? "text-(--accent)" : ""}`}
        >
          {formatNumber(value)}
        </span>
        {unit && <span className="text-[12px] text-(--muted)">{unit}</span>}
      </div>
      {detail && (
        <div className="num mt-1.5 text-[13px] text-(--muted)">{detail}</div>
      )}
    </div>
  );
}

function formatNumber(n: number) {
  return Number.isInteger(n)
    ? n.toLocaleString()
    : n.toLocaleString(undefined, { maximumFractionDigits: 1 });
}

function sentence(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function groupSessions(sets: SetRow[]): Session[] {
  const map = new Map<string, Session>();
  for (const s of sets) {
    const cur = map.get(s.session_id);
    if (cur) cur.sets.push(s);
    else map.set(s.session_id, { id: s.session_id, at: s.logged_at, sets: [s] });
  }
  return Array.from(map.values()).sort((a, b) => a.at.localeCompare(b.at));
}

// computed here rather than read from v_personal_records so the numbers
// always match the sets shown on this page
function computeRecords(sets: SetRow[]): Records {
  let bestWeight: SetRow | null = null;
  let bestReps: SetRow | null = null;
  let bestVolume: SetRow | null = null;
  const anyWeighted = sets.some((s) => (s.weight ?? 0) > 0);

  for (const s of sets) {
    const w = s.weight ?? 0;
    if (w > 0 && s.reps >= 1) {
      if (
        !bestWeight ||
        w > bestWeight.weight! ||
        (w === bestWeight.weight && s.reps > bestWeight.reps)
      ) {
        bestWeight = s;
      }
      if (!bestVolume || w * s.reps > bestVolume.weight! * bestVolume.reps) {
        bestVolume = s;
      }
    }
    // with weights logged, best reps only counts loaded sets; for
    // bodyweight-only work every set counts
    if (anyWeighted ? w > 0 : true) {
      if (
        !bestReps ||
        s.reps > bestReps.reps ||
        (s.reps === bestReps.reps && w > (bestReps.weight ?? 0))
      ) {
        bestReps = s;
      }
    }
  }
  return { bestWeight, bestReps, bestVolume };
}

function computeChartPoints(sessions: Session[], weighted: boolean): ChartPoint[] {
  const points: ChartPoint[] = [];
  for (const s of sessions) {
    const values = weighted
      ? s.sets.map((x) => x.weight ?? 0).filter((w) => w > 0)
      : s.sets.map((x) => x.reps);
    if (values.length === 0) continue;
    points.push({ date: s.at, value: Math.max(...values) });
  }
  return points;
}
