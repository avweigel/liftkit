"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type ChartPoint = {
  date: string;
  value: number;
};

const fmtShort = (v: number) =>
  new Date(v).toLocaleDateString(undefined, { month: "short", day: "numeric" });

export function ProgressChart({
  points,
  unit,
}: {
  points: ChartPoint[];
  unit: string;
}) {
  const data = points.map((p) => ({
    value: p.value,
    ts: new Date(p.date).getTime(),
  }));

  const first = data[0].value;
  const last = data[data.length - 1].value;
  const change = last - first;
  const tick = { fill: "var(--muted)", fontSize: 12 };

  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between gap-3">
        <div className="flex items-baseline gap-1">
          <span className="num text-[28px] leading-none">{last}</span>
          <span className="text-[13px] text-(--muted)">{unit}</span>
        </div>
        {change !== 0 && (
          <span className={change > 0 ? "chip chip-accent" : "chip"}>
            <span className="num">
              {change > 0 ? "+" : "-"}
              {Math.abs(Math.round(change * 10) / 10)} {unit}
            </span>
            <span>since {fmtShort(data[0].ts)}</span>
          </span>
        )}
      </div>
      <div className="h-48 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
            <CartesianGrid stroke="var(--border)" vertical={false} />
            <XAxis
              dataKey="ts"
              type="number"
              domain={["dataMin", "dataMax"]}
              scale="time"
              tickFormatter={fmtShort}
              tick={tick}
              tickLine={false}
              axisLine={false}
              minTickGap={28}
              tickMargin={8}
            />
            <YAxis
              dataKey="value"
              tick={tick}
              tickLine={false}
              axisLine={false}
              width={40}
              tickCount={4}
              allowDecimals={false}
              domain={["auto", "auto"]}
            />
            <Tooltip
              cursor={{ stroke: "var(--border)" }}
              contentStyle={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: 12,
                fontSize: 13,
                color: "var(--foreground)",
              }}
              labelStyle={{ color: "var(--muted)" }}
              itemStyle={{ color: "var(--foreground)" }}
              labelFormatter={(v) =>
                new Date(v as number).toLocaleDateString(undefined, {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                })
              }
              formatter={(v) => [`${v} ${unit}`, "Best"]}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke="var(--accent)"
              strokeWidth={2.5}
              dot={{ r: 3, fill: "var(--accent)", strokeWidth: 0 }}
              activeDot={{ r: 5, fill: "var(--accent)", stroke: "var(--surface)", strokeWidth: 2 }}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
