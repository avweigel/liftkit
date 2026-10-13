import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { getUnitPrefs } from "@/lib/measurement";
import { localizeDistance } from "@/lib/display/units-core";
import {
  MACHINES_FOR,
  MACHINE_NAMES,
  SESSION_TITLES,
  buildSession,
  zonesFor,
  type Machine,
  type SessionId,
} from "@/lib/program/running";
import { loadLongMinutes, loadRunProfile } from "@/lib/running-data";
import { CardioRun, OutsideLog } from "./cardio-screens";

type Props = {
  searchParams: Promise<{ session?: string; machine?: string }>;
};

const isSession = (s: string | undefined): s is SessionId => !!s && s in SESSION_TITLES;

export default async function CardioPage({ searchParams }: Props) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const params = await searchParams;
  const id: SessionId = isSession(params.session) ? params.session : "easy";
  const allowed = MACHINES_FOR[id];
  const machine: Machine = allowed.includes(params.machine as Machine) ? (params.machine as Machine) : allowed[0];

  const [{ measurement }, profile, longMinutes] = await Promise.all([
    getUnitPrefs(),
    loadRunProfile(user.id),
    loadLongMinutes(user.id),
  ]);
  const session = buildSession(id, machine, profile, { longMinutes, measurement });
  const z = zonesFor(profile.maxHr);
  const local = (t: string) => localizeDistance(t, measurement);

  return (
    <main className="mx-auto w-full max-w-lg flex-1 space-y-5 px-4 pt-4 pb-tabbar">
      <PageHeader
        back={{ href: "/", label: "Today" }}
        eyebrow={`${session.goal}, ${session.minutes} min`}
        title={session.title}
      />

      <nav aria-label="Where" className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1">
        {allowed.map((m) => (
          <Link
            key={m}
            href={`/cardio?session=${id}&machine=${m}`}
            aria-current={m === machine ? "page" : undefined}
            className={`chip h-10 shrink-0 px-4 text-[14px] ${m === machine ? "chip-accent" : ""}`}
          >
            {MACHINE_NAMES[m]}
          </Link>
        ))}
      </nav>

      <section className="rounded-xl bg-(--accent-soft) px-4 py-3">
        <div className="label text-(--accent)">Why</div>
        <p className="mt-0.5 text-[14px]">{session.why}</p>
      </section>

      {id !== "walk" && (
        <dl className="grid grid-cols-3 gap-2">
          <Zone label="Easy" range={`${z.easy[0]} to ${z.easy[1]}`} active={id !== "intervals"} />
          <Zone label="Steady" range={`${z.steady[0]} to ${z.steady[1]}`} active={id === "long"} />
          <Zone label="Hard" range={`${z.hard[0]} to ${z.hard[1]}`} active={id === "intervals" || id === "strides"} />
        </dl>
      )}

      {machine === "outside" ? (
        <>
          <section className="card space-y-2 p-5">
            <ul className="space-y-2">
              {session.outside.map((pt) => (
                <li key={pt} className="flex gap-2.5 text-[15px]">
                  <span className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-(--accent)" aria-hidden />
                  {local(pt)}
                </li>
              ))}
            </ul>
          </section>
          <OutsideLog session={session} />
        </>
      ) : (
        <CardioRun session={session} />
      )}
    </main>
  );
}

function Zone({ label, range, active }: { label: string; range: string; active: boolean }) {
  return (
    <div className={`rounded-xl px-3 py-2 ${active ? "bg-(--surface-2)" : "bg-(--surface-2)/40 opacity-60"}`}>
      <dt className="text-[12px] text-(--muted)">{label} HR</dt>
      <dd className="num text-[17px]">{range}</dd>
    </div>
  );
}
