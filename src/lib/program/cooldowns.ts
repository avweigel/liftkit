import type { DayKind } from "./day-profile";
import type { WarmupItem } from "./warmups";

export type CooldownStep = { label: string; seconds: number; level?: number };

export type CooldownItem = WarmupItem & {
  steps: CooldownStep[];
};

const min = (m: number) => Math.round(m * 60);
const hill = (levels: number[], minutes: number): CooldownStep[] =>
  levels.map((l) => ({ label: `${l}%`, seconds: min(minutes), level: l }));
const sides = (name: string, seconds: number): CooldownStep[] => [
  { label: `${name}, left`, seconds },
  { label: `${name}, right`, seconds },
];

// every walk keeps the job of a cooldown: climb to a moderate effort you
// could still talk through, then come down slowly so the last few minutes
// are easy. none of them spike your heart rate at the end. walk briskly,
// about 5 to 5.5 km/h, hands off the rails.
const WALKS: CooldownItem[] = [
  {
    id: "walk-hill",
    name: "Incline walk: the hill",
    dose: "20 min",
    detail: "Climb 2% every 2 minutes to 12%, then come back down. Even effort up, a long easy descent.",
    tags: "treadmill cardio pyramid",
    steps: hill([3, 5, 7, 9, 11, 12, 10, 8, 6, 4], 2),
  },
  {
    id: "walk-rolling",
    name: "Incline walk: rolling hills",
    dose: "20 min",
    detail: "Short climbs to 9% with flatter recoveries. The peaks are too short to spike you, so effort stays steady and it never gets dull.",
    tags: "treadmill cardio intervals",
    steps: [
      { label: "3%", seconds: min(3), level: 3 },
      ...[1, 2, 3, 4].flatMap(() => [
        { label: "9%", seconds: min(2), level: 9 },
        { label: "5%", seconds: min(1.5), level: 5 },
      ]),
      { label: "4%", seconds: min(3), level: 4 },
    ],
  },
  {
    id: "walk-steady",
    name: "Incline walk: steady steps",
    dose: "15 min",
    detail: "Three minute blocks, so few changes. Good with a podcast.",
    tags: "treadmill cardio short",
    steps: hill([4, 6, 8, 6, 3], 3),
  },
  {
    id: "walk-ladder",
    name: "Incline walk: long ladder",
    dose: "25 min",
    detail: "Up in 2% steps, five minutes held at 12%, then down. The longest easy aerobic work here, so it can stand in for an evening cardio session.",
    tags: "treadmill cardio long zone 2",
    steps: [
      ...hill([3, 5, 7, 9, 11], 2),
      { label: "12%", seconds: min(5), level: 12 },
      ...hill([10, 8, 6, 4, 2], 2),
    ],
  },
  {
    id: "walk-short",
    name: "Incline walk: short hill",
    dose: "10 min",
    detail: "Up to 10% and back. For days with tired legs or no time.",
    tags: "treadmill cardio short quick",
    steps: hill([4, 7, 10, 7, 4], 2),
  },
];

const OTHER: CooldownItem[] = [
  {
    id: "machine-easy",
    name: "Easy bike or elliptical",
    dose: "10 min",
    detail: "Spin bike or elliptical at a pace you could chat at.",
    tags: "cardio machine bike elliptical",
    steps: [{ label: "Easy pace", seconds: min(10) }],
  },
  {
    id: "stretch-lower",
    name: "Lower body stretch",
    dose: "7 min",
    detail: "Hips, quads and hamstrings. Breathe slowly, ribs down.",
    tags: "stretch mobility legs hips",
    steps: [
      ...sides("Pigeon", 45),
      ...sides("Couch stretch", 45),
      { label: "Seated forward fold", seconds: 60 },
      { label: "90/90 breathing", seconds: 60 },
      { label: "Child's pose, side reach", seconds: 60 },
      ...sides("Supine twist", 30),
    ],
  },
  {
    id: "stretch-upper",
    name: "Upper body stretch",
    dose: "5 min",
    detail: "Chest, lats and upper back. Use the doorway and a rack.",
    tags: "stretch mobility shoulders chest back",
    steps: [
      ...sides("Doorway chest stretch", 45),
      ...sides("Lat stretch on the rack", 45),
      ...sides("Thread the needle", 30),
      { label: "Child's pose", seconds: 60 },
    ],
  },
  {
    id: "stretch-flow",
    name: "Full body flow",
    dose: "5 min",
    detail: "Like the warm-up, but slow: long holds and long exhales.",
    tags: "stretch mobility sun salutation yoga",
    steps: [
      { label: "Slow sun salutations", seconds: 90 },
      ...sides("Lizard with reach", 45),
      ...sides("Pigeon", 30),
      { label: "Child's pose", seconds: 60 },
    ],
  },
];

const ALL = [...WALKS, ...OTHER];

const PREFERRED: Record<DayKind, string> = {
  // legs already did hours of work: let them go, stretch instead
  squat: "stretch-lower",
  hinge: "stretch-lower",
  // fresh legs after upper work: a longer walk is useful easy cardio
  push: "walk-rolling",
  pull: "walk-rolling",
  arms: "walk-ladder",
  whole: "walk-hill",
  // the conditioning already happened
  metcon: "stretch-flow",
  core: "stretch-flow",
  other: "walk-hill",
};

export function cooldownChoices(): CooldownItem[] {
  return ALL;
}

export function cooldownItem(id: string): CooldownItem | undefined {
  return ALL.find((c) => c.id === id);
}

export function preferredCooldown(kind: DayKind): CooldownItem {
  return cooldownItem(PREFERRED[kind]) ?? WALKS[0];
}

export function cooldownSeconds(item: CooldownItem): number {
  return item.steps.reduce((t, s) => t + s.seconds, 0);
}
