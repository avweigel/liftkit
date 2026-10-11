export type WeightConvention = {
  equipment: "dumbbell" | "kettlebell";
  mode: "total" | "single";
  hint: string; // short label, e.g. "total, both dbs" or "single db"
  summary: string; // sentence for descriptions
  perSide: (total: number) => number;
};

// context is the plan's notes and rep text for this exercise. a generic
// library name like "Dumbbell Row" only says it's one-armed in the plan
// ("single arm, left then right", "10/side").
export function weightConvention(
  name: string,
  equipment: string | null | undefined,
  context = "",
): WeightConvention | null {
  const eq = normalizeEquipment(name, equipment);
  if (eq === "other") return null;
  const label = eq === "dumbbell" ? "db" : "kb";
  const long = eq === "dumbbell" ? "dumbbell" : "kettlebell";

  if (isSingleSideUpper(name) || (!isLegMove(name) && SINGLE_ARM_CONTEXT.test(context))) {
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
      hint: `total, both ${label}s`,
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

const SINGLE_ARM_CONTEXT = /\b(single|one)[\s-]?arm\b|\/\s*(side|arm)\b|\bper (side|arm)\b|\bleft then right\b|\bl then r\b/i;

function isLegMove(name: string): boolean {
  if (/single[\s-]?leg/i.test(name)) return true;
  const legKickback = /\bkickbacks?\b/i.test(name) && !/\btri(cep|ceps)?\b/i.test(name);
  return (
    legKickback ||
    /\b(leg|lunge|squat|rdl|deadlift|calf|pistol|bulgarian|step[\s-]?up|glute bridge|hip thrust|swing)\b/i.test(name)
  );
}

function isSingleSideUpper(name: string): boolean {
  // explicit single-leg → not an arm movement
  if (/single[\s-]?leg|single[\s-]?side[\s-]?leg/i.test(name)) return false;
  if (/\bsingle[\s-]?arm\b|\bs\s*a\b/i.test(name)) return true;
  // leg-pattern keywords: side markers apply to a leg, not an arm.
  // "kickback" is a leg move only when it isn't a tricep kickback.
  const legKickback = /\bkickbacks?\b/i.test(name) && !/\btri(cep|ceps)?\b/i.test(name);
  if (
    legKickback ||
    /\b(leg|lunge|squat|rdl|deadlift|calf|pistol|bulgarian|step[\s-]?up|glute bridge|hip thrust)\b/i.test(
      name,
    )
  ) {
    return false;
  }
  // suffix markers like "- L", "(R)", " L", " R" on upper-body
  if (/[-(\s][LR](\)|$)/i.test(name)) return true;
  return false;
}
