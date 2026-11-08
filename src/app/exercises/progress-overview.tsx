"use client";

import Link from "next/link";
import { Bar, BarChart, Cell, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { PainScore } from "@/components/pain-score";

export type WeekRow = {
  // monday of the week, iso date
  week: string;
  label: string;
  runs: number;
  km: number;
  minutes: number;
  longMinutes: number | null;
  longKm: number | null;
};

export type LiftRow = {
  id: string;
  name: string;
  unit: string;
  // one point per session: the top working set
  points: Array<{ date: string; weight: number | null; reps: number }>;
};

const tooltipStyle = {
  background: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: 12,
  fontSize: 13,
  color: "var(--foreground)",
};

// running and the handstand are the two things in this program worth a
// chart. the lifts get a line each, the library is underneath.
export function RunningProgress({ weeks, goalRuns }: { weeks: WeekRow[]; goalRuns: number }) {
  const latest = weeks[weeks.length - 1];
  const prev = weeks[weeks.length - 2];
  const longs = weeks.filter((w) => w.longMinutes != null);
  const firstLong = longs[0];
  const lastLong = longs[longs.length - 1];
  const tick = { fill: "var(--muted)", fontSize: 11 };

  return (
    <section className="card space-y-4 p-4">
      <div className="flex items-baseline justify-between">
        <h2 className="display text-[22px]">Running</h2>
        <span className="text-[13px] text-(--muted)">last {weeks.length} weeks</span>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Stat label="This week" value={`${latest?.runs ?? 0}`} sub={`of ${goalRuns} runs`} />
        <Stat label="Km this week" value={latest ? latest.km.toFixed(1) : "0"} sub={prev ? `${prev.km.toFixed(1)} last week` : ""} />
        <Stat
          label="Long run"
          value={lastLong?.longMinutes != null ? `${lastLong.longMinutes}` : "—"}
          sub={firstLong && lastLong && firstLong !== lastLong ? `min, from ${firstLong.longMinutes}` : "min"}
        />
      </div>

      <div>
        <div className="mb-1 flex items-baseline justify-between">
          <span className="text-[14px] font-semibold">Long run, minutes</span>
          <span className="text-[12px] text-(--muted)">one a week, five more each time</span>
        </div>
        <div className="h-36 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weeks} margin={{ top: 8, right: 4, left: -6, bottom: 0 }} barCategoryGap={2}>
              <XAxis dataKey="label" tick={tick} tickLine={false} axisLine={false} interval="preserveStartEnd" />
              <YAxis tick={tick} tickLine={false} axisLine={false} width={34} tickCount={4} allowDecimals={false} domain={[0, "auto"]} />
              <Tooltip
                cursor={{ fill: "var(--surface-2)" }}
                contentStyle={tooltipStyle}
                labelStyle={{ color: "var(--muted)" }}
                itemStyle={{ color: "var(--foreground)" }}
                formatter={(v, _n, item) => {
                  const row = item.payload as WeekRow;
                  return [`${v} min${row.longKm ? `, ${row.longKm.toFixed(1)} km` : ""}`, "Long run"];
                }}
                labelFormatter={(l) => `Week of ${l}`}
              />
              <Bar dataKey="longMinutes" radius={[4, 4, 0, 0]} isAnimationActive={false}>
                {weeks.map((w, i) => (
                  <Cell key={w.week} fill={i === weeks.length - 1 ? "var(--accent)" : "var(--accent-soft)"} stroke={i === weeks.length - 1 ? "none" : "var(--accent-line)"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div>
        <div className="mb-1 flex items-baseline justify-between">
          <span className="text-[14px] font-semibold">Km per week</span>
          <span className="text-[12px] text-(--muted)">all runs together</span>
        </div>
        <div className="h-28 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weeks} margin={{ top: 8, right: 4, left: -6, bottom: 0 }} barCategoryGap={2}>
              <XAxis dataKey="label" tick={tick} tickLine={false} axisLine={false} interval="preserveStartEnd" />
              <YAxis tick={tick} tickLine={false} axisLine={false} width={34} tickCount={3} allowDecimals={false} domain={[0, "auto"]} />
              <Tooltip
                cursor={{ fill: "var(--surface-2)" }}
                contentStyle={tooltipStyle}
                labelStyle={{ color: "var(--muted)" }}
                itemStyle={{ color: "var(--foreground)" }}
                formatter={(v, _n, item) => {
                  const row = item.payload as WeekRow;
                  return [`${Number(v).toFixed(1)} km in ${row.runs} run${row.runs === 1 ? "" : "s"}`, "Week"];
                }}
                labelFormatter={(l) => `Week of ${l}`}
              />
              <Bar dataKey="km" radius={[4, 4, 0, 0]} isAnimationActive={false}>
                {weeks.map((w, i) => (
                  <Cell key={w.week} fill={i === weeks.length - 1 ? "var(--accent)" : "var(--accent-soft)"} stroke={i === weeks.length - 1 ? "none" : "var(--accent-line)"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="mt-1 text-[12px] text-(--muted)">Runs logged without a distance count their planned kilometres.</p>
      </div>
    </section>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-xl bg-(--surface-2) px-3 py-2.5">
      <div className="label">{label}</div>
      <div className="num mt-0.5 text-[24px] leading-none">{value}</div>
      <div className="mt-1 text-[12px] text-(--muted)">{sub}</div>
    </div>
  );
}

export function LiftProgress({ lifts }: { lifts: LiftRow[] }) {
  return (
    <section className="card space-y-3 p-4">
      <div className="flex items-baseline justify-between">
        <h2 className="display text-[22px]">Strength</h2>
        <span className="text-[13px] text-(--muted)">top set, each session</span>
      </div>
      <ul className="divide-y divide-(--border)">
        {lifts.map((l) => (
          <LiftLine key={l.id} lift={l} />
        ))}
      </ul>
    </section>
  );
}

function LiftLine({ lift }: { lift: LiftRow }) {
  const pts = lift.points;
  const last = pts[pts.length - 1];
  const first = pts[0];
  // chin-ups and the like: reps are the number that moves
  const byReps = pts.every((p) => p.weight == null || p.weight === 0);
  const value = (p: { weight: number | null; reps: number }) => (byReps ? p.reps : (p.weight ?? 0));
  const data = pts.map((p) => ({ ts: new Date(p.date).getTime(), v: value(p), reps: p.reps, weight: p.weight }));
  const change = last && first ? value(last) - value(first) : 0;
  return (
    <li className="flex items-center gap-3 py-2.5">
      <Link href={`/exercises/${lift.id}`} className="min-w-0 flex-1">
        <div className="truncate text-[15px] font-semibold">{lift.name}</div>
        <div className="text-[13px] text-(--muted)">
          {last ? (
            byReps ? (
              <>
                <span className="num text-(--foreground)">{last.reps}</span> reps
              </>
            ) : (
              <>
                <span className="num text-(--foreground)">{last.weight}</span> {lift.unit} × {last.reps}
              </>
            )
          ) : (
            "Not logged yet"
          )}
          {pts.length > 1 && change !== 0 && (
            <span className={`ml-2 ${change > 0 ? "text-(--ok)" : "text-(--muted)"}`}>
              {change > 0 ? "+" : ""}
              {Math.round(change * 10) / 10} {byReps ? "reps" : lift.unit}
            </span>
          )}
        </div>
      </Link>
      <div className="h-9 w-24 shrink-0">
        {data.length > 1 && (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 4, right: 4, left: 4, bottom: 4 }}>
              <YAxis hide domain={["dataMin", "dataMax"]} />
              <Line type="monotone" dataKey="v" stroke="var(--accent)" strokeWidth={2} dot={false} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </li>
  );
}

export function WristSnapshot() {
  return (
    <section className="card space-y-3 p-4">
      <div className="flex items-baseline justify-between">
        <h2 className="display text-[22px]">Wrist</h2>
        <span className="text-[13px] text-(--muted)">handstand pain, daily</span>
      </div>
      <PainScore context="handstand" label="Today" />
      <p className="text-[13px] text-(--muted)">
        The bars are the last four weeks. Green is a 0, orange a 1, red a 2 or 3. The trend line compares the last seven days with the seven before.
      </p>
    </section>
  );
}
