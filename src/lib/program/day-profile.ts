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

export type WarmupOption = {
  id: string;
  name: string;
  dose: string;
};

export const WARMUP_BASE = [
  {
    id: "machine",
    title: "5 min easy on a machine",
    detail:
      "Sleepy: elliptical, spin bike or incline walk. More awake: rower or assault bike.",
  },
  {
    id: "mobility",
    title: "Mobility flow, 1 round",
    detail:
      "World's greatest stretch 3/side, cat-cow 5, lateral lunge 5/side.",
  },
] as const;

const ROPE: WarmupOption = { id: "rope", name: "Jump rope", dose: "3 x 30 s" };
const ROWER: WarmupOption = { id: "rower", name: "Rower power strokes", dose: "3 x 10" };
const BIKE: WarmupOption = { id: "bike", name: "Assault bike sprint", dose: "3 x 8 s" };

const OPTIONS: Record<DayKind, WarmupOption[]> = {
  push: [
    ROPE,
    ROWER,
    { id: "explosive-pushup", name: "Explosive push-ups, hands stay down", dose: "3 x 5" },
  ],
  hinge: [
    { id: "db-swing", name: "Single dumbbell swing", dose: "3 x 8" },
    BIKE,
    ROPE,
  ],
  pull: [
    ROWER,
    { id: "cable-chop", name: "Half-kneeling cable chop, L then R", dose: "3 x 6/side" },
    ROPE,
  ],
  arms: [
    { id: "push-press", name: "Light dumbbell push press", dose: "3 x 5" },
    { id: "bike-arms", name: "Assault bike sprint, arms driving", dose: "3 x 8 s" },
    ROPE,
  ],
  squat: [
    { id: "squat-jump", name: "Squat jumps, low and soft", dose: "3 x 3" },
    { id: "spin-sprint", name: "Standing spin bike sprint", dose: "3 x 10 s" },
    { id: "skater", name: "Skater steps", dose: "3 x 6/side" },
    { id: "stairs", name: "Stair climber, fast", dose: "2 min" },
  ],
  whole: [
    { id: "skater", name: "Skater steps", dose: "3 x 6/side" },
    ROPE,
    ROWER,
  ],
  metcon: [],
  core: [],
  other: [ROPE, ROWER, BIKE],
};

export function warmupOptions(kind: DayKind): WarmupOption[] {
  return OPTIONS[kind];
}
