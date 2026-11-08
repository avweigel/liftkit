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

export type WarmupSlot = "pulse" | "open";

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

// the warm-up after the walk in: one guided sequence, ordered by where
// you stand so there's no wandering. stall bars first, then standing,
// then the wall, then the mat, then light dumbbells next to the rack,
// then the bar. the wrist and nerve chain runs every day, because the
// nerve is compressed somewhere between the neck and the thumb and the
// whole line (pecs, shoulders, triceps, forearm, wrist) wants opening
// before anything is loaded.
type Seq = Array<{ label: string; seconds: number; sub?: string }>;

const barsChain: Seq = [
  { label: "Pec minor opener", sub: "At the stall bars, facing away. Hands on a bar above the shoulders, step forward, chest open, ribs down", seconds: 60 },
  { label: "Shoulder opener, hanging lean", sub: "Face the bars, grip a high rung, hips back, let the chest sink through. Lats and the long head of the triceps", seconds: 45 },
  { label: "Side bend, left", sub: "Grip high with the right hand, lean the hips left", seconds: 30 },
  { label: "Side bend, right", seconds: 30 },
];

const standingChain: Seq = [
  { label: "Radial nerve glide, left", sub: "Arm out and slightly back, palm facing behind you, fingers down. Tilt the head away to add, toward to release. Mild, never a zing", seconds: 45 },
  { label: "Radial nerve glide, right", sub: "Same, lighter", seconds: 30 },
  { label: "Scalene release, left", sub: "Hand behind the back, ear toward the opposite shoulder, chin slightly up. Gentle", seconds: 30 },
  { label: "Scalene release, right", seconds: 30 },
  { label: "Overhead tricep stretch, left", sub: "Elbow up by the ear, hand down the back, other hand eases the elbow. Ribs down", seconds: 30 },
  { label: "Overhead tricep stretch, right", seconds: 30 },
  { label: "Wrist circles and finger spreads", sub: "20 each way, then fingers wide 20 times", seconds: 30 },
  { label: "Thenar and forearm release, left", sub: "Ball into the pad under the thumb, then up the thumb side of the forearm. Slow", seconds: 60 },
  { label: "Thenar and forearm release, right", sub: "Lighter", seconds: 30 },
];

const wallChain: Seq = [
  { label: "Serratus wall slides", sub: "Forearms on the wall, slide up, push the wall away at the top. About 10", seconds: 45 },
  { label: "Wall angels", sub: "Back and ribs against the wall, arms slide up and down. Ribs stay down", seconds: 45 },
];

const matUpper: Seq = [
  { label: "Cat-cow", sub: "Slow, 10", seconds: 45 },
  { label: "Thread the needle, left", seconds: 30 },
  { label: "Thread the needle, right", seconds: 30 },
  { label: "Sun salutations", sub: "Three, slow. Knees down on the chaturanga", seconds: 90 },
];

const matLower: Seq = [
  { label: "Sun salutations", sub: "Three, slow. Knees down on the chaturanga", seconds: 90 },
  { label: "Cat-cow", sub: "Slow, 8", seconds: 30 },
  { label: "90/90 switches", sub: "Seated, knees swing side to side, 10 slow", seconds: 60 },
  { label: "Side lunges", sub: "5 per side, slow, hips back", seconds: 60 },
  { label: "Cossack squats", sub: "4 per side, bodyweight, pause at the bottom", seconds: 60 },
  { label: "Glute bridges", sub: "10, 2 s squeeze at the top", seconds: 45 },
  { label: "Slow bodyweight squats", sub: "10, 3 s down, full depth", seconds: 45 },
];

const dumbbellChain: Seq = [
  { label: "Radial deviation, left", sub: "Light dumbbell, thumb-up grip, arm at the side, lift the thumb end. 2 x 12", seconds: 45 },
  { label: "Radial deviation, right", seconds: 45 },
  { label: "Trap-3 raise, light", sub: "Chest on a bench or bent over, arms in a Y, thumbs up. 2 x 10", seconds: 60 },
];

const sum = (seq: Seq) => seq.reduce((t, st) => t + st.seconds, 0);
const minutes = (seq: Seq) => `${Math.round(sum(seq) / 60)} min`;

const open = (id: string, name: string, detail: string, tags: string, steps: Seq): WarmupItem => ({
  id,
  name,
  dose: minutes(steps),
  detail,
  tags,
  seconds: sum(steps),
  steps,
});

const OPEN: WarmupItem[] = [
  open(
    "open-upper",
    "Open up, upper day",
    "Stall bars, then standing, the wall, the mat, light dumbbells. The whole line from pec to thumb, then ramp sets.",
    "upper shoulders chest wrist nerve pull push",
    [...barsChain, ...standingChain, ...wallChain, ...matUpper, ...dumbbellChain],
  ),
  open(
    "open-lower",
    "Open up, lower day",
    "Stall bars and the nerve chain, shorter, then hips and ankles on the mat, then ramp sets.",
    "lower hips legs squat hinge wrist nerve",
    [
      ...barsChain.slice(0, 2),
      ...standingChain.filter((st) => !/tricep|thenar/.test(st.label)),
      ...matLower,
    ],
  ),
  open(
    "open-short",
    "Open up, the short version",
    "Pec opener, shoulder opener, nerve glides, tricep stretch, wall slides, two sun salutations. For a rushed morning.",
    "short quick rushed",
    [
      { label: "Pec minor opener", sub: "Stall bars, facing away, ribs down", seconds: 45 },
      { label: "Shoulder opener, hanging lean", sub: "Face the bars, hips back, chest sinks", seconds: 45 },
      { label: "Radial nerve glide, left", sub: "Move the head, not the wrist", seconds: 40 },
      { label: "Radial nerve glide, right", seconds: 25 },
      { label: "Overhead tricep stretch, left", seconds: 25 },
      { label: "Overhead tricep stretch, right", seconds: 25 },
      { label: "Serratus wall slides", sub: "About 10", seconds: 40 },
      { label: "Sun salutations", sub: "Two, slow", seconds: 60 },
    ],
  ),
  open(
    "open-chain",
    "The nerve chain only",
    "Stall bars and standing. For mobility day, where the floor sweep follows, and for core on its own.",
    "mobility core chain nerve",
    [...barsChain, ...standingChain],
  ),
];

export type WarmupPlan = {
  pulse: WarmupItem;
  open: WarmupItem;
};

const LOWER: DayKind[] = ["squat", "hinge"];

export function defaultWarmup(kind: DayKind): WarmupPlan {
  const pulse = kind === "mobility" ? PULSE.find((p) => p.id === "machine-10")! : PULSE[0];
  const openId =
    kind === "mobility" || kind === "core" ? "open-chain" : LOWER.includes(kind) ? "open-lower" : "open-upper";
  return { pulse, open: OPEN.find((o) => o.id === openId)! };
}

export function warmupChoices(slot: WarmupSlot): WarmupItem[] {
  if (slot === "pulse") return PULSE;
  return OPEN;
}

// the machines you can pick straight from the warm-up, in the order shown
export const PULSE_MACHINES = ["elliptical", "spin-easy", "incline-walk", "rower-easy", "assault-easy", "stairs-easy"];

export function warmupItem(slot: WarmupSlot, id: string): WarmupItem | undefined {
  return findIn(warmupChoices(slot), id);
}

function findIn(list: WarmupItem[], id: string | undefined): WarmupItem | undefined {
  return id ? list.find((i) => i.id === id) : undefined;
}
