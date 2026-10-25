import type { DayProfile } from "@/lib/program/day-profile";
import type { Measurement } from "@/lib/display/units-core";

// the cardio plan, built around one goal: run easy at 6:13/km (10:00/mile)
// with your heart rate still low. most of that comes from easy running,
// one interval session a week lifts the ceiling, and the long run builds the engine.
// four sessions a week, done on whatever day and time fits.

export type SessionId = "intervals" | "long" | "strides" | "easy" | "walk";
export type Machine = "run" | "runwalk" | "bike" | "row" | "elliptical" | "walk" | "outside";

export type RunProfile = { maxHr: number; easyPaceS: number };
export const DEFAULT_RUN_PROFILE: RunProfile = { maxHr: 190, easyPaceS: 466 };
export const GOAL_EASY_PACE_S = 373;

export const WEEKLY: Exclude<SessionId, "walk">[] = ["intervals", "long", "strides", "easy"];

export const SESSION_TITLES: Record<SessionId, string> = {
  intervals: "Hard intervals",
  long: "Long run",
  strides: "Easy run with strides",
  easy: "Easy run",
  walk: "Hill walk",
};

export const SHORT_TITLES: Record<SessionId, string> = {
  intervals: "Intervals",
  long: "Long",
  strides: "Strides",
  easy: "Easy",
  walk: "Walk",
};

export const MACHINE_NAMES: Record<Machine, string> = {
  run: "Treadmill",
  runwalk: "Run/walk",
  bike: "Bike",
  row: "Rower",
  elliptical: "Elliptical",
  walk: "Treadmill walk",
  outside: "Outside",
};

// which versions each session has. the long run stays a run (or outside):
// its point is time on your feet.
export const MACHINES_FOR: Record<SessionId, Machine[]> = {
  intervals: ["run", "bike", "row", "outside"],
  long: ["run", "runwalk", "outside"],
  strides: ["run", "outside"],
  easy: ["run", "runwalk", "elliptical", "bike", "row", "outside"],
  walk: ["walk", "outside"],
};

// what logs as which kind, for the rest of the app
export const KIND_FOR: Record<SessionId, "intervals" | "long" | "easy" | "walk"> = {
  intervals: "intervals",
  long: "long",
  strides: "easy",
  easy: "easy",
  walk: "walk",
};

// ---------- your numbers ----------

export type Zones = {
  easy: [number, number];
  steady: [number, number];
  hard: [number, number];
  recover: number;
};

export function zonesFor(maxHr: number): Zones {
  const at = (p: number) => Math.round(maxHr * p);
  return {
    easy: [at(0.6), at(0.76)],
    steady: [at(0.82), at(0.88)],
    hard: [at(0.85), at(0.93)],
    recover: at(0.72),
  };
}

// treadmill speeds follow from your easy pace, so they move with you
export function speedsFor(easyPaceS: number) {
  const easy = 3600 / easyPaceS;
  const r = (n: number) => Math.round(n * 10) / 10;
  return {
    easy: r(easy),
    warm: r(easy * 0.95),
    recover: r(easy * 0.9),
    steady: r(easy * 1.2),
    hard: r(easy * 1.33),
    stride: r(easy * 1.45),
  };
}

export function formatPace(secondsPerKm: number, m: Measurement): string {
  const s = m === "metric" ? secondsPerKm : secondsPerKm * 1.609344;
  const whole = Math.round(s);
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}${m === "metric" ? "/km" : "/mile"}`;
}

// ---------- long run progression ----------

// starts at 45, adds 5 each time, every fourth one is a shorter 40 to
// absorb the build, tops out at 75
export function nextLongMinutes(previous: number[]): number {
  const n = previous.length;
  if (n === 0) return 45;
  if ((n + 1) % 4 === 0) return 40;
  const lastBuild = [...previous].reverse().find((m) => m > 40) ?? 40;
  return Math.min(75, lastBuild + 5);
}

// ---------- the sessions ----------

export type Step = { label: string; sub: string; seconds: number; level: number };

export type Session = {
  id: SessionId;
  machine: Machine;
  title: string;
  minutes: number;
  goal: string;
  why: string;
  // the structure in one plain sentence
  plain: string;
  steps: Step[];
  // for outside: what to do, in words
  outside: string[];
};

type Effort = "warm" | "easy" | "recover" | "steady" | "hard" | "stride" | "cool";

const LEVEL: Record<Effort, number> = { cool: 2, recover: 2, easy: 3, warm: 3, steady: 6, hard: 9, stride: 8 };

export function buildSession(
  id: SessionId,
  machine: Machine,
  profile: RunProfile,
  opts: { longMinutes: number; measurement: Measurement },
): Session {
  const z = zonesFor(profile.maxHr);
  const v = speedsFor(profile.easyPaceS);
  const hr = (e: Effort) =>
    e === "hard" || e === "stride"
      ? `HR ${z.hard[0]} to ${z.hard[1]}`
      : e === "steady"
        ? `HR ${z.steady[0]} to ${z.steady[1]}`
        : e === "recover"
          ? `HR down toward ${z.recover}`
          : `HR under ${z.easy[1]}`;

  const word: Record<Effort, string> = {
    warm: "Easy",
    easy: "Easy",
    recover: "Recover",
    steady: "Steady",
    hard: "Hard",
    stride: "Quick",
    cool: "Easy",
  };
  const detail: Record<Effort, string> = {
    warm: "warming up",
    easy: "you could talk",
    recover: "jog or walk it off",
    steady: "a few words at a time",
    hard: "9 of 10, no talking",
    stride: "quick and relaxed, not a sprint",
    cool: "bring it down",
  };
  const bySpeed = machine === "run" || machine === "runwalk" || machine === "row";

  // the big number on the timer: a speed when the machine shows one,
  // otherwise the effort itself
  const label = (e: Effort): string => {
    if (machine === "run" || machine === "runwalk") {
      const kmh = { warm: v.warm, easy: v.easy, recover: v.recover, steady: v.steady, hard: v.hard, stride: v.stride, cool: v.recover }[e];
      return `${kmh} km/h`;
    }
    if (machine === "row") {
      const spm = { warm: 18, easy: 20, recover: 18, steady: 22, hard: 26, stride: 28, cool: 18 }[e];
      return `${spm} spm`;
    }
    return word[e];
  };
  // the effort word goes in the line below only when the big label is a number
  const feel = (e: Effort) => (bySpeed ? `${word[e]}, ${detail[e]}` : detail[e][0].toUpperCase() + detail[e].slice(1));
  const step = (e: Effort, minutes: number): Step => ({
    label: label(e),
    sub: `${feel(e)}. ${hr(e)}`,
    seconds: Math.round(minutes * 60),
    level: LEVEL[e],
  });
  const pace = (s: number) => formatPace(s, opts.measurement);
  const easyPace = pace(profile.easyPaceS);
  const steadyPace = pace(profile.easyPaceS / 1.2);
  const hardPace = pace(profile.easyPaceS / 1.33);

  if (id === "intervals") {
    const steps = [step("warm", 10)];
    for (let i = 0; i < 4; i++) {
      steps.push(step("hard", 4));
      steps.push(i < 3 ? step("recover", 3) : step("cool", 5));
    }
    return {
      id,
      machine,
      title: SESSION_TITLES.intervals,
      minutes: 40,
      goal: "VO2 max",
      plain: "10 min easy, then 4 hard efforts of 4 min each with 3 min easy between, then 5 min easy.",
      why: "Four hard 4 minute reps raise the ceiling on how much oxygen you can use. A higher ceiling makes every easier pace feel easier.",
      steps,
      outside: [
        `10 min easy (${easyPace}, HR under ${z.easy[1]}).`,
        `4 hard efforts of 4 min, around ${hardPace}. Let heart rate decide: ${z.hard[0]} to ${z.hard[1]} by the end of each rep.`,
        `3 min easy jog or walk between, until HR drops toward ${z.recover}.`,
        "5 min easy to finish. A gentle hill for the hard reps works well too.",
      ],
    };
  }

  // run/walk: the same easy work in 3 min runs with 1 min walks between.
  // the walks keep the heart rate honest, which is the point of easy running.
  if (machine === "runwalk" && (id === "easy" || id === "long")) {
    const total = id === "long" ? opts.longMinutes : 35;
    const walkStep = (minutes: number): Step => ({
      // a flat recovery walk, no incline
      label: "4.5 km/h",
      sub: `Walk. ${hr("easy")}`,
      seconds: Math.round(minutes * 60),
      level: 2,
    });
    const runStep = (e: Effort, minutes: number): Step => ({
      label: label(e),
      sub: `Run, ${detail[e]}. ${hr(e)}`,
      seconds: Math.round(minutes * 60),
      level: LEVEL[e],
    });
    const steps: Step[] = [walkStep(3)];
    let used = 3;
    // the long run finishes with steady runs, the easy run stays easy
    const steadyFrom = id === "long" ? total - 10 : Infinity;
    while (used < total) {
      const run = Math.min(3, total - used);
      steps.push(runStep(used >= steadyFrom ? "steady" : "easy", run));
      used += run;
      if (used < total) {
        const walk = Math.min(1, total - used);
        steps.push(walkStep(walk));
        used += walk;
      }
    }
    const cycles = Math.round((total - 3) / 4);
    return {
      id,
      machine,
      title: id === "long" ? `Long run/walk, ${total} min` : "Easy run/walk",
      minutes: total,
      goal: id === "long" ? "Aerobic engine" : "Aerobic base",
      plain: `3 min walk, then ${cycles} rounds of 3 min running and 1 min walking.${id === "long" ? " The last runs are steady." : ""}`,
      why:
        id === "long"
          ? "Same time on your feet as the long run, with walk breaks that keep the effort easy the whole way. A steady finish still teaches you to run tired."
          : "Walk breaks are the easiest way to keep easy running easy. Your heart rate stays in range, and the total running time still builds your base.",
      steps,
      outside: [
        `3 min walk, then run 3 min at ${easyPace} and walk 1 min, over and over, for ${total} min.`,
        `Heart rate under ${z.easy[1]} on the runs. If it creeps up, walk a little longer.`,
        ...(id === "long" ? [`Last 10 min: run segments at ${steadyPace}, HR ${z.steady[0]} to ${z.steady[1]}.`] : []),
      ],
    };
  }

  if (id === "long") {
    const total = opts.longMinutes;
    return {
      id,
      machine,
      title: `${SESSION_TITLES.long}, ${total} min`,
      minutes: total,
      goal: "Aerobic engine",
      plain: `${total - 10} min easy, then the last 10 min steady.`,
      why: "Time on your feet at an easy effort is what moves your easy pace toward 6:13/km. The steady last 10 minutes teaches you to run well when you're tired.",
      steps: [step("easy", total - 10), step("steady", 10)],
      outside: [
        `${total - 10} min easy at ${easyPace} or slower. If HR goes over ${z.easy[1]}, slow down or walk a few steps. That is the whole trick.`,
        `Last 10 min steady, around ${steadyPace}, HR ${z.steady[0]} to ${z.steady[1]}.`,
        "Flat or rolling route. Bring water if it's over an hour.",
      ],
    };
  }

  if (id === "strides") {
    const steps = [step("easy", 25)];
    for (let i = 0; i < 6; i++) {
      steps.push(step("stride", 1 / 3));
      steps.push(step("recover", 2 / 3));
    }
    steps.push(step("easy", 4));
    return {
      id,
      machine,
      title: SESSION_TITLES.strides,
      minutes: 35,
      goal: "Aerobic base, running form",
      plain: "25 min easy, then 6 quick 20 second bursts with easy jogging between, then 4 min easy.",
      why: "Mostly easy running for your base. The six short strides at the end teach your legs a quicker, smoother stride without tiring you out.",
      steps,
      outside: [
        `25 min easy at ${easyPace}, HR under ${z.easy[1]}.`,
        "6 x 20 s strides: build to quick and smooth, tall, light feet. Walk or jog 40 s between.",
        "4 min easy to finish.",
      ],
    };
  }

  if (id === "easy") {
    return {
      id,
      machine,
      title: machine === "run" || machine === "outside" ? SESSION_TITLES.easy : `Easy ${MACHINE_NAMES[machine].toLowerCase()}`,
      minutes: 35,
      goal: "Aerobic base",
      plain: "5 min warm-up, then 30 min easy. Nothing hard.",
      why:
        machine === "run" || machine === "outside"
          ? "Easy running is where most running fitness comes from. Keep it truly easy and it adds up fast."
          : "Same easy aerobic work without the impact, for days your legs need a break.",
      steps: [step("warm", 5), step("easy", 30)],
      outside: [
        `35 min at ${easyPace} or slower. Keep HR under ${z.easy[1]}, even if that means walking up hills.`,
        "You should be able to talk in full sentences the whole way.",
      ],
    };
  }

  // walk: the incline pattern you liked, effort only
  const walk: Array<[string, number, number]> = [
    ["3%", 3, 3], ["5%", 3, 5], ["7%", 3, 7], ["9%", 3, 9], ["11%", 4, 11], ["12%", 6, 12], ["10%", 4, 10], ["8%", 3, 8], ["5%", 3, 5], ["3%", 4, 3],
  ];
  return {
    id,
    machine,
    title: SESSION_TITLES.walk,
    minutes: 36,
    goal: "Recovery, glutes",
    plain: "A brisk walk that climbs slowly to 12% incline, holds, then comes back down.",
    why: "Moving without adding fatigue. A hill walk still counts toward your 30 minutes.",
    steps: walk.map(([l, m, lvl]) => ({ label: l, sub: `About 4.5 km/h. ${hr("easy")}`, seconds: m * 60, level: lvl })),
    outside: ["30 to 40 min brisk walk, hills if you have them.", "No pace goal."],
  };
}

// ---------- which session suits today ----------

export type DayContext = {
  today: DayProfile | null;
  tomorrow: DayProfile | null;
  // 1 = monday ... 7 = sunday
  weekday: number;
  // hard cardio or a metcon yesterday
  hardYesterday: boolean;
  // hard cardio already logged today
  hardToday: boolean;
};

export type Fit = { ok: boolean; note: string; machine: Machine };

function legWord(p: DayProfile): string {
  if (p.kind === "hinge") return "deadlift day";
  if (p.kind === "squat") return "squat day";
  return "a leg day";
}

export function fitFor(id: SessionId, ctx: DayContext): Fit {
  const { today, tomorrow } = ctx;
  const metconToday = today?.kind === "metcon";
  const legsToday = !!today?.heavyLegs;
  const legsTomorrow = !!tomorrow?.heavyLegs;

  if (id === "intervals") {
    if (metconToday) return { ok: false, note: "This morning's metcon was today's hard session.", machine: "bike" };
    if (ctx.hardToday) return { ok: false, note: "You've already gone hard today.", machine: "bike" };
    if (legsTomorrow) return { ok: false, note: `Tomorrow is ${legWord(tomorrow!)}. A hard session today costs you there.`, machine: "bike" };
    if (tomorrow?.kind === "metcon") return { ok: false, note: "Tomorrow's metcon is hard too. Two in a row is a lot.", machine: "bike" };
    if (ctx.hardYesterday) return { ok: false, note: "You went hard yesterday. Give it a day.", machine: "bike" };
    if (legsToday)
      return { ok: true, note: `On the bike or rower after this morning's ${today!.kind === "squat" ? "squats" : "deadlifts"}. Run it if your legs feel fresh.`, machine: "bike" };
    return { ok: true, note: "Your legs are free and it's been a couple of days since you went hard.", machine: "run" };
  }

  if (id === "long") {
    if (metconToday || legsToday) return { ok: false, note: "Your legs worked hard this morning. Save the long run for a fresh day.", machine: "run" };
    if (legsTomorrow) return { ok: false, note: `Tomorrow is ${legWord(tomorrow!)}. A long run today costs you there.`, machine: "run" };
    const weekend = ctx.weekday >= 6;
    return { ok: true, note: weekend ? "A free weekend day is made for it." : "Fits today if you have the time.", machine: "run" };
  }

  if (id === "strides" || id === "easy") {
    if (metconToday) return { ok: true, note: "Keep it gentle after the metcon. The elliptical or bike is kinder.", machine: "elliptical" };
    if (legsToday) {
      return id === "strides"
        ? { ok: false, note: "Strides want fresh legs. Better on a day without leg lifting.", machine: "run" }
        : { ok: true, note: "No impact after this morning's legs, same easy work.", machine: "elliptical" };
    }
    return { ok: true, note: legsTomorrow ? "Easy keeps your legs fresh for tomorrow." : "Easy running builds your base.", machine: "run" };
  }

  return { ok: true, note: "Always fine. Movement without fatigue.", machine: "walk" };
}

// the week's open sessions in the order today should try them
export function pickForToday(
  done: SessionId[],
  ctx: DayContext,
): { pick: SessionId; fit: Fit; options: Array<{ id: SessionId; fit: Fit }> } {
  const remaining: SessionId[] = WEEKLY.filter((id) => !done.includes(id));
  // the long run leads at the weekend, when there's time for it. on
  // weekdays the intervals lead, since it has the fewest days it fits.
  const order: SessionId[] =
    ctx.weekday >= 6 ? ["long", "intervals", "strides", "easy"] : ["intervals", "strides", "easy", "long"];
  const ranked = order.filter((id) => remaining.includes(id));
  const options = [...ranked, "walk" as SessionId].map((id) => ({ id, fit: fitFor(id, ctx) }));

  // a metcon morning was the day's hard work: a walk is the suggestion,
  // easy stays on the list
  const pick: SessionId =
    ctx.today?.kind === "metcon" ? "walk" : (options.find((o) => o.fit.ok && o.id !== "walk")?.id ?? "walk");
  return { pick, fit: fitFor(pick, ctx), options };
}
