"use client";

import { MeasurementContext, type Measurement } from "@/lib/display/units";

export function MeasurementProvider({
  value,
  children,
}: {
  value: Measurement;
  children: React.ReactNode;
}) {
  return <MeasurementContext.Provider value={value}>{children}</MeasurementContext.Provider>;
}
