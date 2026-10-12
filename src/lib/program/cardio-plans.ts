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
  // what the session trains, in two words, and why it's built this way
  goal: string;
  why: string;
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
    goal: "Aerobic base",
    why: "Zone 2: the easy effort that grows your heart's stroke volume and the mitochondria in your legs, the base everything harder sits on. The short pickups keep your running form sharp without adding fatigue.",
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
    goal: "Aerobic base",
    why: "Zone 2 work with almost no impact. Rowing also trains your back, glutes and hamstrings for posture, which suits the days after heavy legs.",
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
    goal: "Aerobic base",
    why: "Zone 2 for the heart, and the short seated climbs build leg muscular endurance without the pounding of running.",
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
    goal: "Aerobic base",
    why: "Zone 2 with no impact. The best choice when your legs or joints are sore and you still want the aerobic work.",
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
    goal: "Aerobic base, glutes",
    why: "Walking uphill gets your heart rate into zone 2 at a walking pace, and the incline loads your glutes, hamstrings and calves for strength endurance with no impact.",
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
    goal: "Aerobic base, glutes",
    why: "Zone 2 with every step a small single-leg lift, so it builds glute and quad endurance too. Stay upright and let your legs do it.",
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
    name: "4 x 4 min",
    minutes: 40,
    summary: "The Norwegian 4 x 4: four hard 4 minute reps with 3 minutes of easy jogging between.",
    goal: "VO2 max",
    why: "Four minutes is long enough for your heart and lungs to reach their maximum and stay there for a while. That time near max is what raises VO2 max, one of the strongest markers of long-term fitness and health.",
    steps: [
      step("9 km/h", WARM, 8, 3),
      ...repeat(4, [step("12.5 km/h", HARD, 4, 9), step("8 km/h", "Easy jog, recover", 3, 3)]),
      step("7 km/h", COOL, 4, 2),
    ],
  },
  {
    id: "int-row",
    kind: "intervals",
    machine: "Rower",
    name: "5 x 3 min",
    minutes: 40,
    summary: "Five hard 3 minute pieces with 2 minutes of easy paddling between.",
    goal: "VO2 max",
    why: "Three minute pieces at a hard, sustainable effort keep you near your maximum heart rate. Rowing spreads the work over legs, back and arms, so you can work at max without beating up your legs.",
    steps: [
      step("2:35, 20 spm", WARM, 10, 3),
      ...repeat(5, [step("2:05, 26 spm", HARD, 3, 9), step("2:45, 18 spm", "Paddle, recover", 2, 3)]),
      step("2:45, 18 spm", COOL, 5, 2),
    ],
  },
  {
    id: "int-spin",
    kind: "intervals",
    machine: "Spin bike",
    name: "4 x 4 min",
    minutes: 40,
    summary: "The 4 x 4 on the bike: heavy enough that 95 rpm is real work.",
    goal: "VO2 max",
    why: "The same 4 x 4 that raises VO2 max, without the impact of running. A good choice the evening after a lower body day if your legs feel fine.",
    steps: [
      step("Light, 90 rpm", WARM, 8, 3),
      ...repeat(4, [step("Heavy, 95 rpm", HARD, 4, 9), step("Light, 85 rpm", "Spin easy, recover", 3, 3)]),
      step("Light, 85 rpm", COOL, 4, 2),
    ],
  },
  {
    id: "int-assault",
    kind: "intervals",
    machine: "Assault bike",
    name: "10 x 30 s",
    minutes: 35,
    summary: "Short and sharp. Arms and legs together on the hard parts.",
    goal: "Power, repeat sprints",
    why: "Thirty second all-out efforts train your fast, powerful energy systems and your ability to recover between bursts. The long easy gaps keep each sprint high quality. It's different from the 4 x 4, so it's the one to pick when you want speed and power.",
    steps: [
      step("50 rpm", WARM, 10, 3),
      ...repeat(10, [step("75+ rpm", HARD, 0.5, 10), step("45 rpm", "Spin easy, breathe", 1.5, 2)]),
      step("45 rpm", COOL, 5, 2),
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
    goal: "Threshold",
    why: "20 minutes at threshold, the fastest pace you can hold for about an hour. It raises that ceiling, so every pace below it gets easier.",
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
    goal: "Threshold, finishing strength",
    why: "Starts easy and finishes at threshold. You practise running well on tired legs, and the gradual build makes the hard part manageable.",
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
    goal: "Threshold",
    why: "Threshold on the rower: one steady, hard block that also builds back and leg endurance. Hold the same split throughout.",
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
    goal: "Threshold",
    why: "Threshold on the bike, with no impact. Good when you want hard work but your legs need a break from running.",
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
    machine: "Incline walk: long hill",
    name: "Long hill walk",
    minutes: 36,
    summary: "About 5.5 km/h. Climb slowly to 12%, hold, then come down.",
    goal: "Recovery, glutes",
    why: "Easy movement to recover between hard days. Blood flow without fatigue, and the incline keeps your glutes and calves working.",
    steps: [3, 5, 7, 9, 11, 12, 12, 10, 8, 6, 4, 3].map((l) =>
      step(`${l}%`, l >= 11 ? STEADY : EASY, 3, Math.max(2, Math.round(l / 2))),
    ),
  },
  {
    id: "walk-rolling",
    kind: "walk",
    machine: "Incline walk: rolling hills",
    name: "Rolling hills walk",
    minutes: 35,
    summary: "About 5.5 km/h. Three minute climbs to 10% with easier stretches between, so it never gets dull.",
    goal: "Recovery, glutes",
    why: "Easy movement with gentle variety. The climbs are short enough to keep it easy, and they still give your glutes and calves some work.",
    steps: [
      step("3%", WARM, 4, 2),
      ...repeat(4, [step("10%", STEADY, 3, 6), step("5%", EASY, 3, 3)]),
      step("4%", EASY, 4, 3),
      step("2%", COOL, 3, 2),
    ],
  },
];

export function plansFor(kind: CardioKind): CardioPlan[] {
  return CARDIO_PLANS.filter((p) => p.kind === kind);
}

export function cardioPlan(id: string | null | undefined): CardioPlan | undefined {
  return CARDIO_PLANS.find((p) => p.id === id);
}

// outside: no machine to set, so a short overview of the session
export const OUTSIDE_GUIDE: Record<CardioKind, { title: string; goal: string; why: string; points: string[] }> = {
  easy: {
    title: "Easy run or ride outside",
    goal: "Aerobic base",
    why: "Zone 2 builds the engine everything else runs on, and it helps you recover from lifting.",
    points: [
      "30 to 45 minutes at a pace you could chat at.",
      "Nose breathing if you can. If you can't, slow down.",
      "Running: finish with 4 relaxed 20 second strides.",
    ],
  },
  intervals: {
    title: "4 x 4 intervals outside",
    goal: "VO2 max",
    why: "Four minutes hard is long enough to reach your maximum and stay there. That's what raises VO2 max.",
    points: [
      "8 to 10 minutes easy to warm up.",
      "4 x 4 minutes hard (one or two words), with 3 minutes easy jog or walk between.",
      "A long gentle hill is perfect: run up hard, jog back down.",
      "5 minutes easy home.",
    ],
  },
  tempo: {
    title: "Tempo or long outside",
    goal: "Threshold",
    why: "Raising the pace you can hold for an hour makes every pace below it feel easier.",
    points: [
      "10 minutes easy, 20 minutes comfortably hard (a few words), 10 minutes easy.",
      "Or skip the tempo and go 45 minutes long and easy.",
      "Pick a flat loop for the tempo so the effort stays even.",
    ],
  },
  walk: {
    title: "Walk outside",
    goal: "Recovery",
    why: "Easy movement between hard days: blood flow without adding fatigue.",
    points: [
      "30 to 45 minutes, no pace goal.",
      "Hills count. So does a walk to the shop.",
      "Phone in your pocket for at least part of it.",
    ],
  },
};
