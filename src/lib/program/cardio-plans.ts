import type { CardioKind } from "./cardio";

// a cardio step: what to set the machine to (label), how it should feel
// (sub), and an effort from 1 to 10 that draws the shape of the session
export type CardioPlanStep = { label: string; sub: string; seconds: number; level: number };

export type CardioPlan = {
  id: string;
  kind: CardioKind;
  machine: string;
  name: string;
  minutes: number;
  summary: string;
  steps: CardioPlanStep[];
};

const m = (n: number) => Math.round(n * 60);
const step = (label: string, sub: string, minutes: number, level: number): CardioPlanStep => ({
  label,
  sub,
  seconds: m(minutes),
  level,
});
const repeat = (times: number, block: CardioPlanStep[]) =>
  Array.from({ length: times }, () => block).flat();

// effort words used everywhere, so a number on any machine means the same
const EASY = "Easy: full sentences";
const STEADY = "Steady: short sentences";
const TEMPO = "Comfortably hard: a few words";
const HARD = "Hard: one or two words";
const WARM = "Warm up, nice and loose";
const COOL = "Cool down, let it all settle";

// numbers are starting points. if the effort line and the number disagree,
// trust the effort and change the number.
export const CARDIO_PLANS: CardioPlan[] = [
  // ----- easy -----
  {
    id: "easy-run",
    kind: "easy",
    machine: "Treadmill run",
    name: "Easy run with pickups",
    minutes: 35,
    summary: "Mostly easy, with a one minute pickup every five so it doesn't drag.",
    steps: [
      step("8 km/h", WARM, 5, 3),
      ...repeat(4, [step("9.5 km/h", EASY, 4, 4), step("10.5 km/h", STEADY, 1, 6)]),
      step("9.5 km/h", EASY, 5, 4),
      step("7 km/h", COOL, 5, 2),
    ],
  },
  {
    id: "easy-row",
    kind: "easy",
    machine: "Rower",
    name: "Easy row",
    minutes: 30,
    summary: "Split per 500 m and strokes per minute. Long, smooth strokes, legs first.",
    steps: [
      step("2:40, 18 spm", WARM, 5, 3),
      ...repeat(4, [step("2:30, 20 spm", EASY, 4, 4), step("2:20, 22 spm", STEADY, 1, 6)]),
      step("2:45, 18 spm", COOL, 5, 2),
    ],
  },
  {
    id: "easy-spin",
    kind: "easy",
    machine: "Spin bike",
    name: "Easy ride with seated climbs",
    minutes: 35,
    summary: "Resistance on a 1 to 10 feel. Climbs are heavier and slower, still seated.",
    steps: [
      step("Light, 90 rpm", WARM, 5, 3),
      ...repeat(5, [step("Medium, 90 rpm", EASY, 4, 4), step("Heavy, 70 rpm", "Seated climb, steady", 1, 6)]),
      step("Light, 85 rpm", COOL, 5, 2),
    ],
  },
  {
    id: "easy-elliptical",
    kind: "easy",
    machine: "Elliptical",
    name: "Easy elliptical",
    minutes: 35,
    summary: "Level is the machine's resistance. Stand tall, light hands on the handles.",
    steps: [
      step("Level 4", WARM, 5, 3),
      ...repeat(5, [step("Level 6", EASY, 4, 4), step("Level 8", STEADY, 1, 6)]),
      step("Level 3", COOL, 5, 2),
    ],
  },
  {
    id: "easy-hill-walk",
    kind: "easy",
    machine: "Incline walk",
    name: "Long hill walk",
    minutes: 36,
    summary: "Brisk walk, about 5.5 km/h. Climb slowly to 12%, hold, then come down.",
    steps: [3, 5, 7, 9, 11, 12, 12, 10, 8, 6, 4, 3].map((l) =>
      step(`${l}%`, l >= 11 ? STEADY : EASY, 3, Math.max(2, Math.round(l / 2))),
    ),
  },
  {
    id: "easy-stairs",
    kind: "easy",
    machine: "Stair climber",
    name: "Easy stairs",
    minutes: 30,
    summary: "Upright, light hands, whole foot on each step.",
    steps: [
      step("Level 4", WARM, 5, 3),
      ...repeat(4, [step("Level 6", EASY, 3, 4), step("Level 7", STEADY, 2, 6)]),
      step("Level 4", COOL, 5, 2),
    ],
  },

  // ----- intervals -----
  {
    id: "int-run",
    kind: "intervals",
    machine: "Treadmill run",
    name: "6 x 2 min",
    minutes: 39,
    summary: "Hard reps with a jog between. Step to the side rails only if you must.",
    steps: [
      step("9 km/h", WARM, 10, 3),
      ...repeat(6, [step("13 km/h", HARD, 2, 9), step("8 km/h", "Easy jog, recover", 2, 3)]),
      step("7 km/h", COOL, 5, 2),
    ],
  },
  {
    id: "int-row",
    kind: "intervals",
    machine: "Rower",
    name: "6 x 2 min",
    minutes: 39,
    summary: "Rate up on the hard pieces, but keep the drive long.",
    steps: [
      step("2:35, 20 spm", WARM, 10, 3),
      ...repeat(6, [step("2:00, 28 spm", HARD, 2, 9), step("2:40, 18 spm", "Paddle, recover", 2, 3)]),
      step("2:45, 18 spm", COOL, 5, 2),
    ],
  },
  {
    id: "int-assault",
    kind: "intervals",
    machine: "Assault bike",
    name: "10 x 30 s",
    minutes: 35,
    summary: "Short and sharp. Arms and legs together on the hard parts.",
    steps: [
      step("50 rpm", WARM, 10, 3),
      ...repeat(10, [step("75+ rpm", HARD, 0.5, 10), step("45 rpm", "Spin easy, breathe", 1.5, 2)]),
      step("45 rpm", COOL, 5, 2),
    ],
  },
  {
    id: "int-spin",
    kind: "intervals",
    machine: "Spin bike",
    name: "6 x 2 min",
    minutes: 39,
    summary: "Heavy enough that 100 rpm is work.",
    steps: [
      step("Light, 90 rpm", WARM, 10, 3),
      ...repeat(6, [step("Heavy, 100 rpm", HARD, 2, 9), step("Light, 85 rpm", "Spin easy, recover", 2, 3)]),
      step("Light, 85 rpm", COOL, 5, 2),
    ],
  },

  // ----- tempo -----
  {
    id: "tempo-run",
    kind: "tempo",
    machine: "Treadmill run",
    name: "20 min tempo",
    minutes: 40,
    summary: "One long, even, comfortably hard block in the middle.",
    steps: [
      step("9.5 km/h", WARM, 10, 3),
      step("11.5 km/h", TEMPO, 20, 7),
      step("9 km/h", COOL, 10, 2),
    ],
  },
  {
    id: "tempo-run-progression",
    kind: "tempo",
    machine: "Treadmill run",
    name: "Progression run",
    minutes: 40,
    summary: "Each block a little quicker. Finish feeling strong, not wrecked.",
    steps: [
      step("9 km/h", WARM, 10, 3),
      step("10 km/h", EASY, 8, 4),
      step("10.5 km/h", STEADY, 8, 5),
      step("11 km/h", STEADY, 6, 6),
      step("11.5 km/h", TEMPO, 3, 7),
      step("8.5 km/h", COOL, 5, 2),
    ],
  },
  {
    id: "tempo-row",
    kind: "tempo",
    machine: "Rower",
    name: "20 min tempo row",
    minutes: 40,
    summary: "Hold the same split for the whole middle block.",
    steps: [
      step("2:35, 20 spm", WARM, 10, 3),
      step("2:12, 24 spm", TEMPO, 20, 7),
      step("2:40, 18 spm", COOL, 10, 2),
    ],
  },
  {
    id: "tempo-spin",
    kind: "tempo",
    machine: "Spin bike",
    name: "20 min tempo ride",
    minutes: 40,
    summary: "Medium-heavy and steady. You should be able to hold it the whole 20.",
    steps: [
      step("Light, 90 rpm", WARM, 10, 3),
      step("Medium-heavy, 85 rpm", TEMPO, 20, 7),
      step("Light, 85 rpm", COOL, 10, 2),
    ],
  },

  // ----- walk -----
  {
    id: "walk-hill",
    kind: "walk",
    machine: "Incline walk",
    name: "Long hill walk",
    minutes: 36,
    summary: "About 5.5 km/h. Climb slowly to 12%, hold, then come down.",
    steps: [3, 5, 7, 9, 11, 12, 12, 10, 8, 6, 4, 3].map((l) =>
      step(`${l}%`, l >= 11 ? STEADY : EASY, 3, Math.max(2, Math.round(l / 2))),
    ),
  },
  {
    id: "walk-flat",
    kind: "walk",
    machine: "Treadmill walk",
    name: "Easy walk",
    minutes: 35,
    summary: "No pace goal. A podcast or nothing at all.",
    steps: [step("5.5 km/h, 1%", "Easy, just moving", 35, 3)],
  },
];

export function plansFor(kind: CardioKind): CardioPlan[] {
  return CARDIO_PLANS.filter((p) => p.kind === kind);
}

export function cardioPlan(id: string | null | undefined): CardioPlan | undefined {
  return CARDIO_PLANS.find((p) => p.id === id);
}

// outside: no machine to set, so a short overview of the session
export const OUTSIDE_GUIDE: Record<CardioKind, { title: string; points: string[] }> = {
  easy: {
    title: "Easy run or ride outside",
    points: [
      "30 to 45 minutes at a pace you could chat at.",
      "Nose breathing if you can. If you can't, slow down.",
      "Running: finish with 4 relaxed 20 second strides.",
    ],
  },
  intervals: {
    title: "Intervals outside",
    points: [
      "10 minutes easy to warm up.",
      "6 x 2 minutes hard (one or two words), with 2 minutes easy jog or walk between.",
      "A hill is perfect: run up hard, walk or jog down.",
      "5 minutes easy home.",
    ],
  },
  tempo: {
    title: "Tempo or long outside",
    points: [
      "10 minutes easy, 20 minutes comfortably hard (a few words), 10 minutes easy.",
      "Or skip the tempo and go 45 minutes long and easy.",
      "Pick a flat loop for the tempo so the effort stays even.",
    ],
  },
  walk: {
    title: "Walk outside",
    points: [
      "30 to 45 minutes, no pace goal.",
      "Hills count. So does a walk to the shop.",
      "Phone in your pocket for at least part of it.",
    ],
  },
};
