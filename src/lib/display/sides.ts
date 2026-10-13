import { splitSide, type Side } from "@/lib/side";

// moves that trade sides every rep (or every step) stay one row: stopping
// to log a side mid-rep would get in the way
const ALTERNATING =
  /dead ?bug|bird ?dog|walking lunge|alternat|\balt\b|march|leg swing|skater|mountain climber|bicycle/i;
const PER_SIDE_REPS = /\/\s*(side|arm|leg)\b|\b(per|each) (side|arm|leg)\b/i;
const ONE_LIMB = /\b(single|one)[\s-]?(arm|leg)\b|\bleft then right\b|\bl then r\b/i;
const TIMED = /^\s*\d+\s*(s|sec|secs|seconds|min)\b/i;

// one side done fully, then the other: those get a row per side so each
// side's weight and reps are logged on purpose
export function logsEachSide(name: string, reps: string, notes: string | null): boolean {
  if (splitSide(name).side) return false;
  if (ALTERNATING.test(name) || /alternat/i.test(notes ?? "")) return false;
  // holds keep their own timer, which already runs both sides
  if (TIMED.test(reps)) return false;
  return PER_SIDE_REPS.test(reps) || ONE_LIMB.test(name) || ONE_LIMB.test(notes ?? "");
}

// a one-sided exercise uses two set numbers per round: odd is left, even is right
export const roundOf = (n: number) => Math.ceil(n / 2);
export const sideOf = (n: number): Side => (n % 2 === 1 ? "L" : "R");
export const sideWord = (s: Side) => (s === "L" ? "Left" : "Right");

export function slotLabel(n: number, sided: boolean): string {
  return sided ? `${roundOf(n)}${sideOf(n)}` : String(n);
}
