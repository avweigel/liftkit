import { normalizeDayName } from "@/lib/day-name-normalize";

export type DayKind =
  | "push"
  | "pull"
  | "hinge"
  | "squat"
  | "arms"
  | "metcon"
  | "whole"
  | "core"
  | "other";

export type DayProfile = {
  kind: DayKind;
  // a heavy leg day the evening before should never get hard cardio
  heavyLegs: boolean;
  // counts as a hard session for the body as a whole
  hard: boolean;
};

const HEAVY_LEG_LIFT =
  /\b(back squat|front squat|deadlift|dl|hack squat|leg press|bulgarian|pistol)\b/i;
const SQUAT_LIFT = /\b(back squat|front squat|hack squat)\b/i;
const HINGE_LIFT = /\b(deadlift|dl|rdl)\b/i;

export function classifyDay(
  dayName: string | null | undefined,
  exerciseNames: string[] = [],
): DayProfile {
  const name = normalizeDayName(dayName ?? "").toLowerCase();
  const exercises = exerciseNames.join(" | ");
  const heavyLift = HEAVY_LEG_LIFT.test(exercises);
  const legName = /\b(leg|legs|lower|quads?|glutes?|hamstrings?|squat|hinge)\b/.test(name);

  if (/\bcore\b|rib flare/.test(name)) {
    return { kind: "core", heavyLegs: false, hard: false };
  }
  if (/metcon|conditioning/.test(name)) {
    return { kind: "metcon", heavyLegs: false, hard: true };
  }
  if (/whole|full/.test(name)) {
    return { kind: "whole", heavyLegs: false, hard: false };
  }
  if (legName) {
    const hinge =
      /hinge|hamstring/.test(name) ||
      (HINGE_LIFT.test(exercises) && !SQUAT_LIFT.test(exercises) && !/squat|quad/.test(name));
    return {
      kind: hinge ? "hinge" : "squat",
      heavyLegs: heavyLift || /squat|hinge/.test(name),
      hard: true,
    };
  }
  if (/shoulder|arm/.test(name)) {
    return { kind: "arms", heavyLegs: false, hard: false };
  }
  if (/pull|back/.test(name)) {
    return { kind: "pull", heavyLegs: false, hard: false };
  }
  if (/push|chest/.test(name)) {
    return { kind: "push", heavyLegs: false, hard: false };
  }
  if (heavyLift) return { kind: "squat", heavyLegs: true, hard: true };
  return { kind: "other", heavyLegs: false, hard: false };
}
