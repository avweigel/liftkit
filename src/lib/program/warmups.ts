import type { DayKind } from "./day-profile";

export type WarmupItem = {
  id: string;
  name: string;
  dose?: string;
  detail?: string;
  // shows a countdown when set
  seconds?: number;
};

export type WarmupSlot = "pulse" | "mobility" | "drill";

// every slot has a default for the day and a list to swap from. all of it
// is meant to work at 5 am in a quiet gym: nothing loud, nothing that needs
// a big floor space or a band.
const PULSE: WarmupItem[] = [
  { id: "machine-easy", name: "Easy on any machine", dose: "5 min", seconds: 300, detail: "Sleepy: elliptical, spin bike or incline walk. More awake: rower or assault bike." },
  { id: "rower-easy", name: "Rower, easy", dose: "5 min", seconds: 300 },
  { id: "elliptical", name: "Elliptical", dose: "5 min", seconds: 300 },
  { id: "spin-easy", name: "Spin bike", dose: "5 min", seconds: 300 },
  { id: "incline-walk", name: "Incline walk", dose: "5 min", seconds: 300 },
  { id: "assault-easy", name: "Assault bike, easy", dose: "5 min", seconds: 300 },
  { id: "stairs-easy", name: "Stair climber, slow", dose: "5 min", seconds: 300 },
  { id: "rope-easy", name: "Jump rope, easy bounce", dose: "3 min", seconds: 180 },
];

const MOBILITY: WarmupItem[] = [
  { id: "sun-lunge", name: "Sun salutations, then side lunges", dose: "3-5, then 3-5/side" },
  { id: "wgs-flow", name: "World's greatest stretch flow", dose: "1 round", detail: "World's greatest stretch 3/side, cat-cow 5, lateral lunge 5/side." },
  { id: "sun-only", name: "Sun salutations", dose: "3-5" },
  { id: "hips-9090", name: "90/90 hip switches and cat-cow", dose: "8 switches, 5 cat-cow" },
  { id: "ankle-hip", name: "Ankle rocks, cossack shifts, deep squat hold", dose: "8/side, 5/side, 30 s", detail: "Good before squats." },
  { id: "upper-flow", name: "Wall slides, open books, cat-cow", dose: "8, 5/side, 5", detail: "Good before pressing and pulling." },
  { id: "hinge-flow", name: "Hip hinge drill and leg swings", dose: "10, then 10/side each way", detail: "Good before deadlifts." },
];

const DRILLS: Record<string, WarmupItem> = Object.fromEntries(
  (
    [
      { id: "rope", name: "Jump rope", dose: "3 x 30 s" },
      { id: "rower", name: "Rower power strokes", dose: "3 x 10" },
      { id: "bike", name: "Assault bike sprint", dose: "3 x 8 s" },
      { id: "skater", name: "Skater steps", dose: "3 x 6/side" },
      { id: "squat-jump", name: "Squat jumps, low and soft", dose: "3 x 3" },
      { id: "spin-sprint", name: "Standing spin bike sprint", dose: "3 x 10 s" },
      { id: "stairs", name: "Stair climber, fast", dose: "2 min" },
      { id: "db-swing", name: "Single dumbbell swing", dose: "3 x 8" },
      { id: "explosive-pushup", name: "Explosive push-ups, hands stay down", dose: "3 x 5" },
      { id: "cable-chop", name: "Half-kneeling cable chop, L then R", dose: "3 x 6/side" },
      { id: "push-press", name: "Light dumbbell push press", dose: "3 x 5" },
      { id: "bike-arms", name: "Assault bike sprint, arms driving", dose: "3 x 8 s" },
      { id: "goblet-pause", name: "Light goblet squat, 3 s pause", dose: "2 x 5" },
      { id: "glute-bridge", name: "Glute bridge, 2 s squeeze", dose: "2 x 10" },
      { id: "lateral-step", name: "Lateral step-ups", dose: "2 x 8/side" },
      { id: "scap-pushup", name: "Scap push-ups", dose: "2 x 10" },
      { id: "light-row", name: "Light cable row, slow", dose: "2 x 12" },
    ] satisfies WarmupItem[]
  ).map((d) => [d.id, d]),
);

const DRILL_DEFAULTS: Record<DayKind, string[]> = {
  push: ["rope", "rower", "explosive-pushup"],
  hinge: ["db-swing", "bike", "rope"],
  pull: ["rower", "cable-chop", "rope"],
  arms: ["push-press", "bike-arms", "rope"],
  squat: ["squat-jump", "spin-sprint", "skater"],
  whole: ["skater", "rope", "rower"],
  metcon: [],
  core: [],
  other: ["rope", "rower", "bike"],
};

export type WarmupPlan = {
  pulse: WarmupItem;
  mobility: WarmupItem;
  drills: WarmupItem[];
};

export function defaultWarmup(kind: DayKind): WarmupPlan {
  return {
    pulse: PULSE[0],
    mobility: MOBILITY[0],
    drills: DRILL_DEFAULTS[kind].map((id) => DRILLS[id]),
  };
}

export function warmupChoices(slot: WarmupSlot): WarmupItem[] {
  if (slot === "pulse") return PULSE;
  if (slot === "mobility") return MOBILITY;
  return Object.values(DRILLS);
}

export function warmupItem(slot: WarmupSlot, id: string): WarmupItem | undefined {
  return findIn(warmupChoices(slot), id);
}

function findIn(list: WarmupItem[], id: string | undefined): WarmupItem | undefined {
  return id ? list.find((i) => i.id === id) : undefined;
}
