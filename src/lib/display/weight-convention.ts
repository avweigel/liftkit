export type WeightConvention = {
  equipment: "dumbbell" | "kettlebell";
  mode: "total" | "single";
  hint: string; // short label, e.g. "total — both dbs" or "single db"
  summary: string; // sentence for descriptions
  perSide: (total: number) => number;
};

export function weightConvention(
  name: string,
  equipment: string | null | undefined,
): WeightConvention | null {
  const eq = normalizeEquipment(name, equipment);
  if (eq === "other") return null;
  const label = eq === "dumbbell" ? "db" : "kb";
  const long = eq === "dumbbell" ? "dumbbell" : "kettlebell";

  if (isSingleSideUpper(name)) {
    return {
      equipment: eq,
      mode: "single",
      hint: `single ${label} (per side)`,
      summary: `enter the weight of the one ${long} you're using.`,
      perSide: (w) => w,
    };
  }

  if (eq === "dumbbell") {
    return {
      equipment: eq,
      mode: "total",
      hint: `total — both ${label}s`,
      summary: `enter the sum of both dumbbells. a 70 lb log = two 35 lb dbs.`,
      perSide: (w) => w / 2,
    };
  }

  // default kettlebell (not flagged single-side): usually one kb held
  // in one or both hands. treat the weight as total/as-held.
  return {
    equipment: eq,
    mode: "total",
    hint: "single kb (held as one)",
    summary: "enter the weight of the kettlebell you're holding.",
    perSide: (w) => w,
  };
}

function normalizeEquipment(
  name: string,
  equipment: string | null | undefined,
): "dumbbell" | "kettlebell" | "other" {
  if (equipment === "dumbbell" || equipment === "kettlebell") return equipment;
  if (/\b(db|dumbbell)\b/i.test(name)) return "dumbbell";
  if (/\b(kb|kettlebell)\b/i.test(name)) return "kettlebell";
  return "other";
}

function isSingleSideUpper(name: string): boolean {
  // explicit single-leg → not an arm movement
  if (/single[\s-]?leg|single[\s-]?side[\s-]?leg/i.test(name)) return false;
  if (/\bsingle[\s-]?arm\b|\bs\s*a\b/i.test(name)) return true;
  // leg-pattern keywords: side markers apply to a leg, not an arm
  if (
    /\b(leg|lunge|squat|rdl|deadlift|calf|pistol|bulgarian|step[\s-]?up|glute bridge|kickback|hip thrust)\b/i.test(
      name,
    )
  ) {
    return false;
  }
  // suffix markers like "- L", "(R)", " L", " R" on upper-body
  if (/[-(\s][LR](\)|$)/i.test(name)) return true;
  return false;
}
