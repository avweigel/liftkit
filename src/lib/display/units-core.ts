// plain unit maths, safe to call from server and client code alike

export type Unit = "lb" | "kg";
export type Measurement = "metric" | "imperial";

const LB_PER_KG = 2.20462;

export const weightUnitFor = (m: Measurement): Unit => (m === "metric" ? "kg" : "lb");

export function convert(value: number, from: Unit, to: Unit): number {
  if (from === to) return value;
  const raw = from === "kg" ? value * LB_PER_KG : value / LB_PER_KG;
  // kg reads cleanly in halves; stored lb keeps a decimal so a kg entry
  // comes back exactly when shown in kg again
  return to === "kg" ? Math.round(raw * 2) / 2 : Math.round(raw * 10) / 10;
}

export function formatWeight(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1).replace(/\.0$/, "");
}

const KM_PER_MI = 1.609344;
const oneDecimal = (n: number) => String(Math.round(n * 10) / 10);

// plans are written in km and km/h. imperial shows them as mi and mph.
export function localizeDistance(text: string, m: Measurement): string {
  if (m === "metric") return text;
  return text
    .replace(/(\d+(?:\.\d+)?)\s*km\/h/g, (_, n) => `${oneDecimal(Number(n) / KM_PER_MI)} mph`)
    .replace(/(\d+(?:\.\d+)?)\s*km\b/g, (_, n) => `${oneDecimal(Number(n) / KM_PER_MI)} mi`);
}
