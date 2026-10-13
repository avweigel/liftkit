import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { CARDIO_TYPES, type CardioKind } from "@/lib/program/cardio";
import { OUTSIDE_GUIDE, cardioPlan, plansFor, type CardioPlan } from "@/lib/program/cardio-plans";
import { CardioRun, OutsideLog } from "./cardio-screens";
import { getUnitPrefs } from "@/lib/measurement";
import { localizeDistance } from "@/lib/display/units-core";

type Props = {
  searchParams: Promise<{ kind?: string; place?: string; plan?: string; pick?: string }>;
};

function isKind(k: string | undefined): k is CardioKind {
  return !!k && k in CARDIO_TYPES;
}

export default async function CardioPage({ searchParams }: Props) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { measurement } = await getUnitPrefs();
  const local = (text: string) => localizeDistance(text, measurement);
  const params = await searchParams;
  const kind: CardioKind = isKind(params.kind) ? params.kind : "easy";
  const type = CARDIO_TYPES[kind];
  const place = params.place === "outside" ? "outside" : "gym";
  const plan = place === "gym" ? cardioPlan(params.plan) : undefined;

  if (place === "outside") {
    const guide = OUTSIDE_GUIDE[kind];
    return (
      <main className="mx-auto w-full max-w-lg flex-1 space-y-6 px-4 pt-4 pb-tabbar">
        <PageHeader back={{ href: "/", label: "Today" }} eyebrow="Outside" title={type.title} />
        <section className="card space-y-3 p-5">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="display text-[20px]">{guide.title}</h2>
            <span className="chip chip-accent">{guide.goal}</span>
          </div>
          <p className="text-[14px] text-(--muted)">{guide.why}</p>
          <ul className="space-y-2">
            {guide.points.map((pt) => (
              <li key={pt} className="flex gap-2.5 text-[15px]">
                <span className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-(--accent)" aria-hidden />
                {pt}
              </li>
            ))}
          </ul>
          <p className="text-[13px] text-(--muted)">Track it on your watch. Log the minutes here when you&rsquo;re back.</p>
        </section>
        <OutsideLog kind={kind} defaultMinutes={type.minutes} />
      </main>
    );
  }

  if (plan) {
    return (
      <main className="mx-auto w-full max-w-lg flex-1 space-y-5 px-4 pt-4 pb-tabbar">
        <PageHeader
          back={{ href: `/cardio?kind=${kind}&place=gym`, label: "Machines" }}
          eyebrow={`${type.title}, ${plan.machine}`}
          title={plan.name}
          subtitle={local(plan.summary)}
        />
        <section className="rounded-xl bg-(--accent-soft) px-4 py-3">
          <div className="label text-(--accent)">Why: {plan.goal}</div>
          <p className="mt-0.5 text-[14px]">{plan.why}</p>
        </section>
        <CardioRun kind={kind} plan={plan} />
      </main>
    );
  }

  // today's best machine first, from the Today card's suggestion
  const pick = cardioPlan(params.pick)?.kind === kind ? params.pick : undefined;
  const plans = plansFor(kind).sort((a, b) => Number(b.id === pick) - Number(a.id === pick));
  return (
    <main className="mx-auto w-full max-w-lg flex-1 space-y-5 px-4 pt-4 pb-tabbar">
      <PageHeader back={{ href: "/", label: "Today" }} eyebrow="Gym" title={type.title} subtitle="Pick a machine." />
      <ul className="space-y-2">
        {plans.map((p) => (
          <li key={p.id}>
            <Link
              href={`/cardio?kind=${kind}&place=gym&plan=${p.id}`}
              className="card flex items-center gap-4 p-4 transition-colors active:bg-(--surface-2)"
            >
              <div className="min-w-0 flex-1">
                <div className="display text-[20px]">{p.machine}</div>
                <div className="text-[14px] text-(--muted)">{p.name}</div>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {p.id === pick && <span className="chip chip-ok">Best today</span>}
                  <span className="chip chip-accent">{p.goal}</span>
                </div>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1.5">
                <Shape plan={p} />
                <span className="num text-[15px] text-(--muted)">{p.minutes} min</span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
      <Link href={`/cardio?kind=${kind}&place=outside`} className="btn btn-ghost btn-block">
        Going outside instead
      </Link>
    </main>
  );
}

// the session at a glance: one bar per step, width by time, height by effort
function Shape({ plan }: { plan: CardioPlan }) {
  const total = plan.steps.reduce((n, s) => n + s.seconds, 0);
  const max = Math.max(...plan.steps.map((s) => s.level), 1);
  return (
    <div className="flex h-7 w-24 items-end gap-px" aria-hidden>
      {plan.steps.map((s, i) => (
        <span
          key={i}
          className="rounded-[2px] bg-(--accent)"
          style={{
            flexGrow: s.seconds / total,
            flexBasis: 0,
            height: `${Math.max(15, (s.level / max) * 100)}%`,
            opacity: 0.35 + (s.level / max) * 0.65,
          }}
        />
      ))}
    </div>
  );
}
