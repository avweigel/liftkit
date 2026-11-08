"use client";

import { useState } from "react";

type Step = { label: string; seconds: number; where?: string };
type Line = { label: string; time: string };
type Group = { where: string | undefined; lines: Line[] };

// the whole routine on one screen, grouped by where you stand, so you can
// carry the right things over before the timer starts. left and right of
// the same stretch fold into one line.
export function StepList({ steps, bring }: { steps: Step[]; bring?: string }) {
  const [open, setOpen] = useState(false);
  const groups = groupSteps(steps);
  const count = groups.reduce((n, g) => n + g.lines.length, 0);

  return (
    <div className="space-y-2 text-[13px]">
      {bring && (
        <p className="text-(--muted)">
          <span className="font-semibold text-(--foreground)">Bring:</span> {bring}
        </p>
      )}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="font-semibold text-(--accent)"
      >
        {open ? "Hide the list" : `See all ${count} steps`}
      </button>
      {open && (
        <div className="space-y-2.5">
          {groups.map((g, i) => (
            <div key={i}>
              {g.where && <div className="label mb-0.5">{g.where}</div>}
              <ul className="divide-y divide-(--border)">
                {g.lines.map((l, j) => (
                  <li key={j} className="flex items-baseline justify-between gap-3 py-1">
                    <span>{l.label}</span>
                    <span className="num shrink-0 text-(--muted)">{l.time}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function groupSteps(steps: Step[]): Group[] {
  const groups: Group[] = [];
  for (let i = 0; i < steps.length; i++) {
    const st = steps[i];
    const next = steps[i + 1];
    let line: Line;
    const base = st.label.replace(/, left$/, "");
    if (base !== st.label && next && next.label === `${base}, right`) {
      line = {
        label: `${base}, both sides`,
        time: st.seconds === next.seconds ? `${fmt(st.seconds)} each` : `${fmt(st.seconds)} + ${fmt(next.seconds)}`,
      };
      i++;
    } else {
      line = { label: st.label, time: fmt(st.seconds) };
    }
    const last = groups[groups.length - 1];
    if (last && last.where === st.where) last.lines.push(line);
    else groups.push({ where: st.where, lines: [line] });
  }
  return groups;
}

function fmt(seconds: number) {
  if (seconds % 60 === 0) return `${seconds / 60} min`;
  if (seconds > 60) return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
  return `${seconds} s`;
}
