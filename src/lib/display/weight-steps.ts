import { weightConvention } from "@/lib/display/weight-convention";

export type WeightKind = "barbell" | "db-pair" | "db-single" | "other";

// dumbbell racks go 5, 8, 10, 12, then every 5 lb. 8s and 12s are the only
// sizes that don't land on a multiple of 5.
const DB_SIZES: number[] = (() => {
  const sizes = [2.5, 5, 8, 10, 12];
  for (let w = 15; w <= 150; w += 5) sizes.push(w);
  return sizes;
})();

const PAIR_TOTALS = DB_SIZES.map((w) => w * 2);

export function weightKind(
  name: string,
  equipment: string | null | undefined,
): WeightKind {
  if (
    equipment === "barbell" ||
    /\b(bb|barbell|ez[\s-]?bar)\b/i.test(name)
  ) {
    return "barbell";
  }
  const conv = weightConvention(name, equipment);
  if (conv?.equipment === "dumbbell") {
    return conv.mode === "total" ? "db-pair" : "db-single";
  }
  return "other";
}

function ladder(kind: WeightKind): number[] | null {
  if (kind === "db-pair") return PAIR_TOTALS;
  if (kind === "db-single") return DB_SIZES;
  return null;
}

// a barbell load changes by both sides at once and the smallest plate is
// 2.5, so the bar moves in steps of 5. machines and everything else also
// use 5 as a sensible default.
const LINEAR_STEP = 5;

export function snapWeight(kind: WeightKind, raw: number): number {
  if (!Number.isFinite(raw) || raw <= 0) return 0;
  const l = ladder(kind);
  if (!l) return Math.round(raw / LINEAR_STEP) * LINEAR_STEP;
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
): number | null {
  const l = ladder(kind);
  if (!l) {
    const base = current ?? 0;
    const next = base + dir * LINEAR_STEP;
    if (next <= 0) return dir === -1 ? null : LINEAR_STEP;
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
