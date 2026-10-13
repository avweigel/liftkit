import { createClient } from "@/lib/supabase/server";
import type { Measurement, Unit } from "@/lib/display/units-core";

export type UnitPrefs = { stored: Unit; measurement: Measurement; shown: Unit };

// signed out, or a profile that never chose: follow the stored unit
export async function getUnitPrefs(): Promise<UnitPrefs> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { stored: "kg", measurement: "metric", shown: "kg" };
  const { data } = await supabase
    .from("profiles")
    .select("units, measurement")
    .eq("id", user.id)
    .maybeSingle<{ units: Unit | null; measurement: Measurement | null }>();
  const stored = data?.units ?? "lb";
  const measurement = data?.measurement ?? (stored === "lb" ? "imperial" : "metric");
  return { stored, measurement, shown: measurement === "metric" ? "kg" : "lb" };
}
