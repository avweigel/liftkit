import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { SessionShape } from "@/components/session-shape";
import { getUnitPrefs } from "@/lib/measurement";
import { localizeDistance } from "@/lib/display/units-core";
import {
  MACHINES_FOR,
  MACHINE_NAMES,
  SESSION_TITLES,
  WEEKLY,
  buildSession,
  fitFor,
  isTreadmill,
  pickForToday,
  sessionKm,
  type Machine,
  type SessionId,
} from "@/lib/program/running";
import { loadDayContext, loadLongMinutes, loadRunProfile, loadWeekDone } from "@/lib/running-data";

// every session the plan knows, grouped by what it's for, with today's
// fit so you can pick with your eyes open
export default async function AllCardioPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ measurement }, profile, longMinutes, ctx, done] = await Promise.all([
    getUnitPrefs(),
    loadRunProfile(user.id),
    loadLongMinutes(user.id),
    loadDayContext(user.id),
    loadWeekDone(user.id),
  ]);
  const picked = pickForToday(done, ctx);
  const local = (t: string) => localizeDistance(t, measurement);
  const groups: Array<{ id: SessionId; blurb: string }> = [
    { id: "easy", blurb: "Base building. Heart rate stays low, distance adds up." },
    { id: "long", blurb: "The week's biggest run. Easy effort, longer time." },
    { id: "intervals", blurb: "The hard session. One a week is plenty." },
    { id: "strides", blurb: "Easy running with a few quick bursts for form." },
    { id: "walk", blurb: "Recovery that still counts." },
  ];

  return (
    <main className="mx-auto w-full max-w-lg flex-1 space-y-7 px-4 pt-4 pb-tabbar">
      <PageHeader back={{ href: "/", label: "Today" }} eyebrow="Cardio" title="All sessions" subtitle="Pick anything. Each one says whether today suits it." />
      {groups.map((g) => {
        const fit = fitFor(g.id, ctx);
        const isDone = WEEKLY.includes(g.id as (typeof WEEKLY)[number]) && done.includes(g.id);
        return (
          <section key={g.id} className="space-y-2">
            <div className="flex flex-wrap items-baseline gap-2 px-1">
              <h2 className="display text-[22px]">{SESSION_TITLES[g.id]}</h2>
              {isDone && <span className="chip chip-ok">Done this week</span>}
              {!isDone && !fit.ok && <span className="chip">Better another day</span>}
              {g.id === picked.pick && !isDone && <span className="chip chip-accent">Best today</span>}
            </div>
            <p className="px-1 text-[13px] text-(--muted)">{isDone || fit.ok ? g.blurb : fit.note}</p>
            <ul className="space-y-1.5">
              {MACHINES_FOR[g.id].map((m: Machine) => {
                const s = buildSession(g.id, m, profile, { longMinutes, measurement });
                const kmText = isTreadmill(m) ? `${Math.round(sessionKm(s.steps) * 10) / 10} km` : null;
                return (
                  <li key={m}>
                    <Link
                      href={`/cardio?session=${g.id}&machine=${m}`}
                      className={`card flex items-center gap-3 p-3 transition-colors active:bg-(--surface-2) ${
                        fit.ok && m === fit.machine && g.id === picked.pick ? "border-(--accent-line)" : ""
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-x-2">
                          <span className="font-semibold">{s.title}</span>
                          {!s.title.toLowerCase().includes(MACHINE_NAMES[m].toLowerCase()) && (
                            <span className="text-[12px] text-(--muted)">{MACHINE_NAMES[m]}</span>
                          )}
                        </div>
                        <p className="mt-0.5 text-[13px] text-(--muted)">{local(s.plain.replace(/\s*About [\d.]+ km\.$/, ""))}</p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <SessionShape steps={s.steps} className="h-6 w-16" />
                        <span className="num text-[13px] text-(--muted)">
                          {s.minutes} min{kmText ? `, ${local(kmText)}` : ""}
                        </span>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </main>
  );
}
