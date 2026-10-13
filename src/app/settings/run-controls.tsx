"use client";

import { useContext, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { SectionTitle } from "@/components/page-header";
import { setRunProfile } from "@/lib/actions/run-profile";
import { MeasurementContext } from "@/lib/display/units";
import { GOAL_EASY_PACE_S, formatPace, zonesFor, type RunProfile } from "@/lib/program/running";

const MI = 1.609344;

// pace is typed in the unit you see, stored per km
function toShownSeconds(perKm: number, metric: boolean) {
  return Math.round(metric ? perKm : perKm * MI);
}

function parsePace(text: string): number | null {
  const m = text.trim().match(/^(\d{1,2})[:.,](\d{2})$/);
  if (!m) return null;
  const s = Number(m[1]) * 60 + Number(m[2]);
  return Number(m[2]) < 60 ? s : null;
}

export function RunControls({ profile }: { profile: RunProfile }) {
  const metric = useContext(MeasurementContext) === "metric";
  const per = metric ? "km" : "mile";
  const shown = toShownSeconds(profile.easyPaceS, metric);
  const [maxHr, setMaxHr] = useState(String(profile.maxHr));
  const [pace, setPace] = useState(`${Math.floor(shown / 60)}:${String(shown % 60).padStart(2, "0")}`);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const hr = Number(maxHr);
  const z = Number.isInteger(hr) && hr >= 120 && hr <= 230 ? zonesFor(hr) : null;

  const save = () => {
    const paceS = parsePace(pace);
    if (!z) return setMsg("Max heart rate should be a whole number, like 190.");
    if (paceS == null) return setMsg(`Easy pace looks like 7:45, minutes and seconds per ${per}.`);
    const perKm = Math.round(metric ? paceS : paceS / MI);
    setMsg(null);
    startTransition(async () => {
      try {
        await setRunProfile({ maxHr: hr, easyPaceS: perKm });
        router.refresh();
        setMsg("Saved. Your sessions use the new numbers.");
      } catch {
        setMsg("Couldn't save. Check your connection and try again.");
      }
    });
  };

  return (
    <section className="space-y-3">
      <SectionTitle>Running</SectionTitle>
      <div className="card space-y-4 p-4">
        <label className="flex items-center justify-between gap-3">
          <span>
            <span className="block font-semibold">Max heart rate</span>
            <span className="block text-[13px] text-(--muted)">Sets your easy, steady and hard ranges</span>
          </span>
          <input
            inputMode="numeric"
            value={maxHr}
            onChange={(e) => setMaxHr(e.target.value.replace(/\D/g, ""))}
            className="num h-12 w-20 rounded-lg border border-(--border) bg-(--background) text-center text-[20px] outline-none focus:border-(--accent-line)"
          />
        </label>
        <label className="flex items-center justify-between gap-3">
          <span>
            <span className="block font-semibold">Easy pace, per {per}</span>
            <span className="block text-[13px] text-(--muted)">A pace you could hold while talking. Update it as it gets quicker.</span>
          </span>
          <input
            inputMode="decimal"
            value={pace}
            onChange={(e) => setPace(e.target.value)}
            className="num h-12 w-20 rounded-lg border border-(--border) bg-(--background) text-center text-[20px] outline-none focus:border-(--accent-line)"
          />
        </label>
        {z && (
          <p className="text-[13px] text-(--muted)">
            Easy HR {z.easy[0]} to {z.easy[1]}, steady {z.steady[0]} to {z.steady[1]}, hard {z.hard[0]} to {z.hard[1]}. Goal: easy at{" "}
            {formatPace(GOAL_EASY_PACE_S, metric ? "metric" : "imperial")} with HR under {z.easy[1]}.
          </p>
        )}
        <button type="button" onClick={save} disabled={pending} className="btn btn-secondary btn-block">
          {pending ? "Saving…" : "Save running numbers"}
        </button>
        {msg && <p className="text-[13px] text-(--muted)">{msg}</p>}
      </div>
    </section>
  );
}
