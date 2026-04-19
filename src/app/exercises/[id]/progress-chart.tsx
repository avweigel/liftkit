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
  weight: number;
};

export function ProgressChart({ points }: { points: ChartPoint[] }) {
  const data = points.map((p) => ({
    ...p,
    ts: new Date(p.date).getTime(),
  }));

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
        >
          <CartesianGrid
            stroke="var(--border)"
            strokeDasharray="3 3"
            vertical={false}
          />
          <XAxis
            dataKey="ts"
            type="number"
            domain={["dataMin", "dataMax"]}
            scale="time"
            tickFormatter={(v) =>
              new Date(v).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
              })
            }
            stroke="var(--muted)"
            fontSize={11}
            tick={{ fill: "var(--muted)" }}
          />
          <YAxis
            dataKey="weight"
            stroke="var(--muted)"
            fontSize={11}
            tick={{ fill: "var(--muted)" }}
            width={36}
          />
          <Tooltip
            contentStyle={{
              background: "var(--background)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              fontSize: 12,
            }}
            labelFormatter={(v) =>
              new Date(v as number).toLocaleDateString(undefined, {
                weekday: "short",
                month: "short",
                day: "numeric",
              })
            }
            formatter={(v) => [`${v} lb`, "top set"]}
          />
          <Line
            type="monotone"
            dataKey="weight"
            stroke="var(--accent)"
            strokeWidth={2.5}
            dot={{ r: 3, fill: "var(--accent)" }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
