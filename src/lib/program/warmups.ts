import type { DayKind } from "./day-profile";

export type WarmupItem = {
  id: string;
  name: string;
  dose?: string;
  detail?: string;
  // shows a countdown when set
  seconds?: number;
  // what to set the machine to, shown big on the timer
  setting?: string;
  cue?: string;
  // a placeholder that asks you to pick a machine before the timer shows
  chooser?: boolean;
  // extra words for search, so "hips" or "cardio" finds the right things
  tags?: string;
  // a guided sequence: the timer names each piece as it comes
  steps?: Array<{ label: string; seconds: number; sub?: string }>;
};

export type WarmupSlot = "pulse" | "care" | "mobility" | "drill";

// every slot has a default for the day and a list to swap from. all of it
// is meant to work at 5 am in a quiet gym: nothing loud, nothing that needs
// a big floor space or a band.
const PULSE: WarmupItem[] = [
  // walking to the gym does most of this. the flow is the pulse raiser now;
  // the machines stay as swaps for cold mornings
  { id: "walked-here", name: "Walked here", dose: "Tick it off", detail: "The walk did the warming. Go straight to the flow, a bit longer than usual.", tags: "walk none skip" },
  { id: "machine-easy", name: "Easy on any machine", dose: "5 min", seconds: 300, chooser: true, detail: "For a cold morning. Sleepy: elliptical, spin bike or incline walk. More awake: rower or assault bike.", tags: "cardio machine" },
  // mobility day: the body needs heat before end-range work, so this one is
  // longer and not optional
  { id: "machine-10", name: "Easy on a machine, 10 min", dose: "10 min", seconds: 600, setting: "Warm, not worked", cue: "Rower, bike or incline walk. Breathe through the nose", detail: "Mobility needs a warm body. Pick whichever machine is free.", tags: "cardio machine mobility" },
  { id: "elliptical", name: "Elliptical", dose: "5 min", seconds: 300, setting: "Level 4", cue: "Easy pace, nose breathing", tags: "cardio machine" },
  { id: "spin-easy", name: "Spin bike", dose: "5 min", seconds: 300, setting: "Light, 85 rpm", cue: "Easy spin, seated", tags: "cardio machine" },
  { id: "incline-walk", name: "Incline walk", dose: "5 min", seconds: 300, setting: "5 km/h, 6%", cue: "Hands off the rails", tags: "cardio machine treadmill" },
  { id: "rower-easy", name: "Rower", dose: "5 min", seconds: 300, setting: "2:45, 18 spm", cue: "Legs, then lean, then arms", tags: "cardio machine" },
  { id: "assault-easy", name: "Assault bike", dose: "5 min", seconds: 300, setting: "Easy, 50 rpm", cue: "Arms and legs together, smooth", tags: "cardio machine air bike" },
  { id: "stairs-easy", name: "Stair climber", dose: "5 min", seconds: 300, setting: "Level 3", cue: "Slow steps, light hands", tags: "cardio machine" },
  { id: "rope-easy", name: "Jump rope, easy bounce", dose: "3 min", seconds: 180, setting: "Easy bounce", cue: "Small hops, quiet landings", tags: "cardio machine" },
];

// the wrist and nerve routine. runs every day because the handstand does.
// nerves want to slide, not stretch: everything slow and mild, stopping
// short of any tingling. left side gets the work, right a lighter pass.
const CARE: WarmupItem[] = [
  {
    id: "wrist-nerve",
    name: "Wrist and nerve routine",
    dose: "9 min",
    detail: "Nerve glides, pec minor, scalenes, lower traps, forearm. Then one short handstand.",
    tags: "wrist nerve shoulder neck pec rehab care handstand",
    seconds: 530,
    steps: [
      { label: "Radial nerve glide, left", sub: "Arm out and slightly back, palm facing behind you, fingers down. Tilt the head away to add, toward to release. Mild, never a zing", seconds: 45 },
      { label: "Radial nerve glide, right", sub: "Same, lighter", seconds: 30 },
      { label: "Pec minor opener", sub: "Face away from the stall bars, hands on a bar above shoulder height, step forward. Ribs down, no arching", seconds: 60 },
      { label: "Scalene release, left", sub: "Sit tall, hand behind the back, ear toward the opposite shoulder, chin slightly up. Gentle", seconds: 30 },
      { label: "Scalene release, right", sub: "Same, lighter", seconds: 30 },
      { label: "Serratus wall slides", sub: "Forearms on the wall, slide up, push the wall away at the top. About 10", seconds: 45 },
      { label: "Trap-3 raise, light", sub: "Chest on a bench or bent over, arms in a Y, thumbs up. 2 x 10", seconds: 60 },
      { label: "Thenar release, left", sub: "Ball or dumbbell handle into the pad under the thumb, then up the thumb side of the forearm. Slow, no digging", seconds: 60 },
      { label: "Thenar release, right", sub: "Same, lighter", seconds: 30 },
      { label: "Radial deviation, left", sub: "Thumb-up grip on a light dumbbell, arm at the side, lift the thumb end. 2 x 12", seconds: 45 },
      { label: "Radial deviation, right", sub: "Same", seconds: 45 },
      { label: "Wrist circles and finger spreads", sub: "20 each", seconds: 30 },
      { label: "One handstand", sub: "Short. Stop before it hurts. That length is today's dose", seconds: 20 },
    ],
  },
  {
    id: "wrist-nerve-short",
    name: "Wrist and nerve, the short version",
    dose: "3 min",
    detail: "Glide, pec opener, serratus slides, one handstand. For a rushed morning.",
    tags: "wrist nerve short quick",
    seconds: 175,
    steps: [
      { label: "Radial nerve glide, left", sub: "Arm out and back, palm behind you, move the head not the wrist", seconds: 40 },
      { label: "Radial nerve glide, right", seconds: 25 },
      { label: "Pec minor opener", sub: "Stall bars, ribs down", seconds: 50 },
      { label: "Serratus wall slides", sub: "About 10", seconds: 40 },
      { label: "One handstand", sub: "Short. Stop before it hurts", seconds: 20 },
    ],
  },
];

const MOBILITY: WarmupItem[] = [
  { id: "sun-lunge", name: "Sun salutations, then side lunges", dose: "5, then 3-5/side", detail: "A steady flow. Five rounds is the pulse raiser when you walked here." },
  { id: "wgs-flow", name: "Lizard with reach flow", dose: "1 round", detail: "Lizard with reach 3/side (lunge, elbow to instep, then rotate and reach up), cat-cow 5, side lunge 5/side.", tags: "hips lunge rotation twist stretch" },
  { id: "sun-only", name: "Sun salutations", dose: "3-5" },
  { id: "hips-9090", name: "90/90 hip switches and cat-cow", dose: "8 switches, 5 cat-cow" },
  { id: "ankle-hip", name: "Ankle rocks, cossack shifts, deep squat hold", dose: "8/side, 5/side, 30 s", detail: "Good before squats." },
  { id: "upper-flow", name: "Wall slides, open books, cat-cow", dose: "8, 5/side, 5", detail: "Good before pressing and pulling." },
  { id: "squat-reach-flow", name: "Deep squat with T-spine reach, then leg swings", dose: "5/side, then 8-10 each way, twice", detail: "Swings: front, side, back with momentum, then again slow and controlled.", tags: "rotation twist hips" },
  { id: "hinge-flow", name: "Hip hinge drill and leg swings", dose: "10, then 8-10 each way, twice", detail: "Good before deadlifts. Swings: front, side, back with momentum, then again slow and controlled." },
];

const DRILLS: Record<string, WarmupItem> = Object.fromEntries(
  (
    [
      { id: "rope", name: "Jump rope", dose: "3 x 30 s", tags: "cardio" },
      { id: "rower", name: "Rower power strokes", dose: "3 x 10", tags: "cardio" },
      { id: "bike", name: "Assault bike sprint", dose: "3 x 8 s", tags: "cardio" },
      { id: "skater", name: "Skater steps", dose: "3 x 6/side" },
      { id: "squat-jump", name: "Squat jumps, low and soft", dose: "3 x 3" },
      { id: "spin-sprint", name: "Standing spin bike sprint", dose: "3 x 10 s", tags: "cardio" },
      { id: "stairs", name: "Stair climber, fast", dose: "2 min", tags: "cardio" },
      { id: "db-swing", name: "Single dumbbell swing", dose: "3 x 8" },
      { id: "explosive-pushup", name: "Explosive push-ups, hands stay down", dose: "3 x 5" },
      { id: "cable-chop", name: "Half-kneeling cable chop, L then R", dose: "3 x 6/side" },
      { id: "push-press", name: "Light dumbbell push press", dose: "3 x 5" },
      { id: "bike-arms", name: "Assault bike sprint, arms driving", dose: "3 x 8 s", tags: "cardio" },
      { id: "goblet-pause", name: "Light goblet squat, 3 s pause", dose: "2 x 5" },
      { id: "glute-bridge", name: "Glute bridge, 2 s squeeze", dose: "2 x 10" },
      { id: "lateral-step", name: "Lateral step-ups", dose: "2 x 8/side" },
      { id: "scap-pushup", name: "Scap push-ups", dose: "2 x 10" },
      { id: "light-row", name: "Light cable row, slow", dose: "2 x 12" },
      { id: "leg-swings", name: "Leg swings, dynamic then controlled", dose: "8-10 each way, twice", detail: "Each leg: 8-10 front, 8-10 side, 8-10 back with momentum. Then the same three again, slow and controlled.", tags: "hips mobility hamstrings adductors" },
      { id: "squat-reach", name: "Deep squat with T-spine reach", dose: "5/side", detail: "Sit in a deep squat. One hand stays down, the other reaches to the ceiling as you rotate. Switch sides.", tags: "rotation thoracic twist hips mobility" },
    ] satisfies WarmupItem[]
  ).map((d) => [d.id, d]),
);

const DRILL_DEFAULTS: Record<DayKind, string[]> = {
  push: ["rope", "rower", "explosive-pushup"],
  hinge: ["db-swing", "bike", "rope"],
  pull: ["rower", "cable-chop", "rope"],
  arms: ["push-press", "bike-arms", "rope"],
  squat: ["squat-jump", "spin-sprint", "skater"],
  // sunday is light on purpose: the long run follows
  whole: ["glute-bridge", "goblet-pause"],
  metcon: [],
  core: [],
  mobility: [],
  other: ["rope", "rower", "bike"],
};

export type WarmupPlan = {
  pulse: WarmupItem;
  care: WarmupItem;
  mobility: WarmupItem;
  drills: WarmupItem[];
};

export function defaultWarmup(kind: DayKind): WarmupPlan {
  return {
    pulse: kind === "mobility" ? PULSE.find((p) => p.id === "machine-10")! : PULSE[0],
    care: CARE[0],
    mobility: kind === "mobility" ? MOBILITY.find((m) => m.id === "sun-only")! : MOBILITY[0],
    drills: DRILL_DEFAULTS[kind].map((id) => DRILLS[id]),
  };
}

export function warmupChoices(slot: WarmupSlot): WarmupItem[] {
  if (slot === "pulse") return PULSE;
  if (slot === "care") return CARE;
  if (slot === "mobility") return MOBILITY;
  return Object.values(DRILLS);
}

// the machines you can pick straight from the warm-up, in the order shown
export const PULSE_MACHINES = ["elliptical", "spin-easy", "incline-walk", "rower-easy", "assault-easy", "stairs-easy"];

export function warmupItem(slot: WarmupSlot, id: string): WarmupItem | undefined {
  return findIn(warmupChoices(slot), id);
}

function findIn(list: WarmupItem[], id: string | undefined): WarmupItem | undefined {
  return id ? list.find((i) => i.id === id) : undefined;
}
