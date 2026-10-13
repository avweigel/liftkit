import { weightConvention } from "@/lib/display/weight-convention";
import type { Unit } from "@/lib/display/units-core";

export type WeightKind = "barbell" | "db-pair" | "db-single" | "other";

// dumbbell racks go 5, 8, 10, 12, then every 5 lb. 8s and 12s are the only
// sizes that don't land on a multiple of 5.
const DB_SIZES: number[] = (() => {
  const sizes = [2.5, 5, 8, 10, 12];
  for (let w = 15; w <= 150; w += 5) sizes.push(w);
  return sizes;
})();

const PAIR_TOTALS = DB_SIZES.map((w) => w * 2);

// kg racks: 1 kg steps up to 10, then 12.5 and every 2.5 after that
const DB_SIZES_KG: number[] = (() => {
  const sizes = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  for (let w = 12.5; w <= 70; w += 2.5) sizes.push(w);
  return sizes;
})();

const PAIR_TOTALS_KG = DB_SIZES_KG.map((w) => w * 2);

export function weightKind(
  name: string,
  equipment: string | null | undefined,
  context = "",
): WeightKind {
  if (
    equipment === "barbell" ||
    /\b(bb|barbell|ez[\s-]?bar)\b/i.test(name)
  ) {
    return "barbell";
  }
  const conv = weightConvention(name, equipment, context);
  if (conv?.equipment === "dumbbell") {
    return conv.mode === "total" ? "db-pair" : "db-single";
  }
  return "other";
}

function ladder(kind: WeightKind, unit: Unit): number[] | null {
  if (kind === "db-pair") return unit === "kg" ? PAIR_TOTALS_KG : PAIR_TOTALS;
  if (kind === "db-single") return unit === "kg" ? DB_SIZES_KG : DB_SIZES;
  return null;
}

// a barbell load changes by both sides at once and the smallest plate is
// 2.5, so the bar moves in steps of 5. machines and everything else also
// use 5 as a sensible default.
// in kg the smallest common plate is 1.25, so the bar moves by 2.5.
const linearStep = (unit: Unit) => (unit === "kg" ? 2.5 : 5);

export function snapWeight(kind: WeightKind, raw: number, unit: Unit = "lb"): number {
  if (!Number.isFinite(raw) || raw <= 0) return 0;
  const l = ladder(kind, unit);
  const step = linearStep(unit);
  if (!l) return Math.round(raw / step) * step;
  let best = l[0];
  for (const w of l) {
    if (Math.abs(w - raw) < Math.abs(best - raw)) best = w;
  }
  return best;
}

export function stepWeight(
  kind: WeightKind,
  current: number | null,
  dir: 1 | -1,
  unit: Unit = "lb",
): number | null {
  const l = ladder(kind, unit);
  const step = linearStep(unit);
  if (!l) {
    // land on the grid first, so a converted 44.1 steps to 45, not 49.1
    const base = current ?? 0;
    const snapped = Math.round(base / step) * step;
    const next = snapped !== base && Math.sign(snapped - base) === dir ? snapped : snapped + dir * step;
    if (next <= 0) return dir === -1 ? null : step;
    return next;
  }
  if (current === null || current <= 0) {
    return dir === 1 ? l[0] : null;
  }
  if (dir === 1) {
    return l.find((w) => w > current) ?? current + 10;
  }
  const lower = [...l].reverse().find((w) => w < current);
  return lower ?? null;
}
