"use client";

import { useContext, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { SectionTitle } from "@/components/page-header";
import { setMeasurement } from "@/lib/actions/measurement";
import { MeasurementContext, type Measurement } from "@/lib/display/units";

const OPTIONS: Array<{ value: Measurement; label: string; hint: string }> = [
  { value: "metric", label: "Metric", hint: "kg, km" },
  { value: "imperial", label: "Imperial", hint: "lb, mi" },
];

export function UnitControls() {
  const current = useContext(MeasurementContext);
  const [picked, setPicked] = useState<Measurement>(current);
  const [error, setError] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const choose = (next: Measurement) => {
    if (next === picked) return;
    const before = picked;
    setPicked(next);
    setError(false);
    startTransition(async () => {
      try {
        await setMeasurement(next);
        router.refresh();
      } catch {
        setPicked(before);
        setError(true);
      }
    });
  };

  return (
    <section className="space-y-3">
      <SectionTitle>Units</SectionTitle>
      <div className="card space-y-2 p-4">
        <div
          role="radiogroup"
          aria-label="Units"
          className="grid grid-cols-2 gap-1 rounded-[14px] bg-(--surface-2) p-1"
        >
          {OPTIONS.map((o) => {
            const active = picked === o.value;
            return (
              <button
                key={o.value}
                type="button"
                role="radio"
                aria-checked={active}
                disabled={pending}
                onClick={() => choose(o.value)}
                className={`flex h-14 flex-col items-center justify-center rounded-[11px] transition-colors ${
                  active ? "bg-(--surface) text-(--foreground) shadow-sm" : "text-(--muted)"
                }`}
              >
                <span className="text-[15px] font-semibold">{o.label}</span>
                <span className="text-[13px]">{o.hint}</span>
              </button>
            );
          })}
        </div>
        <p className="text-[13px] text-(--muted)">
          {error
            ? "Couldn't save that. Check your connection and try again."
            : "Changes how weights and distances show. Nothing you've logged changes. In a workout, the lb and kg switch still works per exercise."}
        </p>
      </div>
    </section>
  );
}
