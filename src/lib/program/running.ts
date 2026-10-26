import type { DayProfile } from "@/lib/program/day-profile";
import type { Measurement } from "@/lib/display/units-core";

// the cardio plan, built around one goal: run easy at 6:13/km (10:00/mile)
// with your heart rate still low. most of that comes from easy running,
// one interval session a week lifts the ceiling, and the long run builds the engine.
// four sessions a week, done on whatever day and time fits.

export type SessionId = "intervals" | "long" | "strides" | "easy" | "walk";
export type Machine =
  | "run"
  | "runwalk"
  | "creep"
  | "pyramid"
  | "ratio21"
  | "ratio61"
  | "ratio52"
  | "hills"
  | "fartlek"
  | "negsplit"
  | "bike"
  | "row"
  | "elliptical"
  | "walk"
  | "outside";

// the formats that run on a treadmill by speed
export const TREADMILL: Machine[] = ["run", "runwalk", "creep", "pyramid", "ratio21", "ratio61", "ratio52", "hills", "fartlek", "negsplit"];
export const isTreadmill = (m: Machine) => TREADMILL.includes(m);

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
  creep: "Creeping ladder",
  pyramid: "Pyramid",
  ratio21: "2:1 run/walk",
  ratio61: "6:1 run/walk",
  ratio52: "5:2 hard",
  hills: "Hill climbs",
  fartlek: "Fartlek",
  negsplit: "Negative split",
  bike: "Bike",
  row: "Rower",
  elliptical: "Elliptical",
  walk: "Treadmill walk",
  outside: "Outside",
};

// which versions each session has. the long run stays a run (or outside):
// its point is time on your feet.
export const MACHINES_FOR: Record<SessionId, Machine[]> = {
  intervals: ["run", "runwalk", "creep", "pyramid", "ratio52", "hills", "fartlek", "bike", "row", "outside"],
  long: ["run", "runwalk", "negsplit", "outside"],
  strides: ["run", "outside"],
  easy: ["run", "runwalk", "ratio21", "ratio61", "elliptical", "bike", "row", "outside"],
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

// every run covers at least 5 km. distance comes from the speeds on the
// steps, so a session that comes up short gets more of its easy running.
export const MIN_RUN_KM = 5;

export function sessionKm(steps: Array<{ label: string; seconds: number }>): number {
  return steps.reduce((km, st) => {
    const m = st.label.match(/^([\d.]+)\s*km\/h/);
    return km + (m ? (Number(m[1]) * st.seconds) / 3600 : 0);
  }, 0);
}

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
  const bySpeed = isTreadmill(machine) || machine === "row";

  // the big number on the timer: a speed when the machine shows one,
  // otherwise the effort itself
  const label = (e: Effort): string => {
    if (isTreadmill(machine)) {
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

  const r1 = (n: number) => Math.round(n * 10) / 10;
  const easyKmh = 3600 / profile.easyPaceS;
  const walkStep = (minutes: number, sub = `Walk it off. ${hr("recover")}`): Step => ({
    label: "4.5 km/h",
    sub,
    seconds: Math.round(minutes * 60),
    level: 2,
  });
  const runAt = (kmh: number, minutes: number, sub: string, level: number): Step => ({
    label: `${r1(kmh)} km/h`,
    sub,
    seconds: Math.round(minutes * 60),
    level,
  });
  const km = (steps: Step[]) => r1(sessionKm(steps));

  // ----- easy run/walk ratios: steady easy pace, walks at a fixed ratio -----
  if (id === "easy" && (machine === "ratio21" || machine === "ratio61")) {
    const run = machine === "ratio21" ? 2 : 6;
    const steps: Step[] = [walkStep(3, `Warm-up walk. ${hr("easy")}`)];
    let rounds = 0;
    while (sessionKm(steps) < MIN_RUN_KM || rounds < 4) {
      rounds++;
      steps.push(runAt(easyKmh, run, `Run ${rounds}. Easy, ${hr("easy")}`, 3));
      steps.push(walkStep(1, `Walk. ${hr("easy")}`));
    }
    return {
      id,
      machine,
      title: `${run}:1 run/walk`,
      minutes: Math.round(steps.reduce((n, st) => n + st.seconds, 0) / 60),
      goal: "Aerobic base",
      plain: `3 min walk, then ${rounds} rounds of run ${run} min at ${r1(easyKmh)} km/h, walk 1 min. About ${km(steps)} km.`,
      why:
        run === 2
          ? "Short runs, lots of walks. The gentlest way to get 5 km of easy running in, good for a tired day."
          : "Long runs with a short reset. Close to a steady easy run, with just enough walking to keep the heart rate honest.",
      steps,
      outside: [`Run ${run} min at ${easyPace}, walk 1 min, repeat for 5 km.`, `Heart rate under ${z.easy[1]} on the runs.`],
    };
  }

  // ----- pyramid: runs of 1 to 5 min and back down, quicker toward the peak -----
  if (id === "intervals" && machine === "pyramid") {
    const lengths = [1, 2, 3, 4, 5, 4, 3, 2, 1];
    const steps: Step[] = [walkStep(3, `Warm-up walk. ${hr("easy")}`)];
    lengths.forEach((len, i) => {
      // speed rises with the run length: 1 min runs are quick, the 5 is a push you can hold
      const kmh = easyKmh * (1.12 + 0.05 * (5 - len));
      steps.push(runAt(kmh, len, `Run ${i + 1} of 9, ${len} min. ${len >= 4 ? hr("steady") : hr("hard")}`, 5 + (6 - len)));
      steps.push(walkStep(i < lengths.length - 1 ? 1 : 3, i < lengths.length - 1 ? `Walk. ${hr("recover")}` : "Cool-down walk"));
    });
    return {
      id,
      machine,
      title: "Pyramid",
      minutes: Math.round(steps.reduce((n, st) => n + st.seconds, 0) / 60),
      goal: "VO2 max, pacing",
      plain: `3 min walk, then runs of 1, 2, 3, 4, 5, 4, 3, 2, 1 min with 1 min walks. Short runs quick, long runs steady. About ${km(steps)} km.`,
      why: "Every run is a different length and speed, so you never settle in. Climbing to the 5 and back down teaches pacing.",
      steps,
      outside: ["Runs of 1, 2, 3, 4, 5, 4, 3, 2, 1 min with 1 min walks.", `Short runs quick (HR ${z.hard[0]} to ${z.hard[1]}), the 4 and 5 steady (${z.steady[0]} to ${z.steady[1]}).`],
    };
  }

  // ----- 5:2 hard: four 5 min efforts at a pace you can just hold -----
  if (id === "intervals" && machine === "ratio52") {
    const steps: Step[] = [walkStep(2, `Warm-up walk. ${hr("easy")}`), runAt(easyKmh, 3, `Easy. ${hr("easy")}`, 3)];
    for (let i = 0; i < 4; i++) {
      steps.push(runAt(easyKmh * 1.25, 5, `Run ${i + 1} of 4. Hard but steady, ${hr("hard")}`, 8));
      steps.push(walkStep(2, `Walk. ${hr("recover")}`));
    }
    // an easy jog to round it up to 5 km, then a walk to finish
    const short = MIN_RUN_KM - sessionKm(steps);
    if (short > 0) steps.push(runAt(easyKmh, Math.ceil((short / easyKmh) * 60), `Easy jog to finish. ${hr("easy")}`, 3));
    steps.push(walkStep(2, "Cool-down walk"));
    return {
      id,
      machine,
      title: "5:2 hard",
      minutes: Math.round(steps.reduce((n, st) => n + st.seconds, 0) / 60),
      goal: "Threshold",
      plain: `2 min walk, 3 min easy, then 4 rounds of run 5 min at ${r1(easyKmh * 1.25)} km/h, walk 2 min, then an easy jog to 5 km. About ${km(steps)} km.`,
      why: "Longer efforts at one honest pace. This is the one that moves your 5 km time.",
      steps,
      outside: [`4 x 5 min at about ${pace(profile.easyPaceS / 1.25)}, 2 min walks between.`, `HR ${z.hard[0]} to ${z.hard[1]} by the end of each.`],
    };
  }

  // ----- hills: incline climbs at easy speed -----
  if (id === "intervals" && machine === "hills") {
    const steps: Step[] = [walkStep(3, `Warm-up walk. ${hr("easy")}`)];
    const climbs = [4, 6, 8, 8, 6, 4];
    climbs.forEach((inc, i) => {
      steps.push({
        label: `${r1(easyKmh)} km/h, ${inc}%`,
        sub: `Climb ${i + 1} of 6 at ${inc}% incline. Short steps, ribs down. ${hr(inc >= 8 ? "hard" : "steady")}`,
        seconds: 240,
        level: 4 + inc / 2,
      });
      if (i < climbs.length - 1) steps.push({ label: `${r1(easyKmh)} km/h, 0%`, sub: `Flat and easy. ${hr("recover")}`, seconds: 120, level: 3 });
    });
    steps.push({ label: "4.5 km/h, 0%", sub: "Cool-down walk, flat", seconds: 180, level: 2 });
    return {
      id,
      machine,
      title: "Hill climbs",
      minutes: Math.round(steps.reduce((n, st) => n + st.seconds, 0) / 60),
      goal: "Strength, VO2 max",
      plain: `3 min walk, then 6 climbs of 4 min at ${r1(easyKmh)} km/h on 4, 6, 8, 8, 6 and 4% incline, with 2 min flat jogs between. About ${km(steps)} km.`,
      why: "Hills get the heart rate up at an easy speed, so the legs take less pounding than fast running. Good the day after lifting.",
      steps,
      outside: ["Find a hill that takes 3 to 4 min to climb. 6 climbs, jog down between.", `HR ${z.hard[0]} to ${z.hard[1]} at the top of each.`],
    };
  }

  // ----- fartlek: run lengths and speeds drawn fresh each day -----
  if (id === "intervals" && machine === "fartlek") {
    // seeded by the date so a reload mid-run doesn't reshuffle it
    let seed = Number(new Date().toISOString().slice(0, 10).replace(/-/g, "")) % 100000;
    const rand = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };
    const steps: Step[] = [walkStep(3, `Warm-up walk. ${hr("easy")}`)];
    let i = 0;
    while (sessionKm(steps) < MIN_RUN_KM || i < 6) {
      i++;
      const len = [1, 1.5, 2, 3, 4][Math.floor(rand() * 5)];
      const factor = 1.05 + rand() * 0.35;
      const walk = [1, 1, 1.5, 2][Math.floor(rand() * 4)];
      steps.push(runAt(easyKmh * factor, len, `Run ${i}, ${len} min. ${factor > 1.25 ? hr("hard") : hr("steady")}`, Math.round(3 + factor * 4)));
      steps.push(walkStep(walk, `Walk ${walk} min. ${hr("recover")}`));
    }
    return {
      id,
      machine,
      title: "Fartlek",
      minutes: Math.round(steps.reduce((n, st) => n + st.seconds, 0) / 60),
      goal: "VO2 max, fun",
      plain: `3 min walk, then ${i} runs of random length (1 to 4 min) and random speed (${r1(easyKmh * 1.05)} to ${r1(easyKmh * 1.4)} km/h) with short walks. New draw every day. About ${km(steps)} km.`,
      why: "You don't know what's coming, so you can't pace it. That's the point. Run what the timer says and see what happens.",
      steps,
      outside: ["Pick landmarks: run hard to the next lamp post, jog to the corner, sprint the hill. No plan, keep it moving for 5 km."],
    };
  }

  // ----- negative split: the second half quicker than the first -----
  if (id === "long" && machine === "negsplit") {
    const total = opts.longMinutes;
    const half = Math.round(total / 2);
    const steps: Step[] = [
      runAt(easyKmh * 0.95, half, `First half, easy. ${hr("easy")}`, 3),
      runAt(easyKmh * 1.08, total - half - 5, `Second half, a little quicker. ${hr("steady")}`, 5),
      runAt(easyKmh * 1.2, 5, `Last 5 min, strong finish. ${hr("steady")}`, 7),
    ];
    return {
      id,
      machine,
      title: `Negative split, ${total} min`,
      minutes: total,
      goal: "Aerobic engine, pacing",
      plain: `${half} min easy at ${r1(easyKmh * 0.95)} km/h, then ${total - half - 5} min at ${r1(easyKmh * 1.08)}, then 5 min at ${r1(easyKmh * 1.2)}. About ${km(steps)} km.`,
      why: "Starting slower than feels natural and finishing quicker is how long runs are meant to go. It trains patience and a strong finish.",
      steps,
      outside: [`First half at ${easyPace} or slower. Second half quicker, last 5 min around ${steadyPace}.`],
    };
  }

  // run/walk intervals: 4 min runs that climb every minute, 3 min walks.
  // "runwalk" restarts the climb each round and goes up in big steps.
  // "creep" keeps climbing in small steps across the whole session.
  if (id === "intervals" && (machine === "runwalk" || machine === "creep")) {
    const start = r1(easyKmh * 1.12);
    // one round is about 0.9 km. five rounds, or more until it's 5 km
    const perRound = (4 * (start + 1.2) + 3 * 4.5) / 60;
    const rounds = Math.max(5, Math.ceil((MIN_RUN_KM - (2 * 4.5) / 60) / perRound));
    const speedAt = (round: number, minute: number) =>
      machine === "runwalk" ? r1(start + 0.8 * minute) : r1(start + 0.16 * (round * 4 + minute));
    const steps: Step[] = [{ label: "4.5 km/h", sub: `Warm-up walk. ${hr("easy")}`, seconds: 120, level: 2 }];
    for (let round = 0; round < rounds; round++) {
      for (let minute = 0; minute < 4; minute++) {
        const kmh = speedAt(round, minute);
        const last = minute === 3;
        steps.push({
          label: `${kmh} km/h`,
          sub: `Run ${round + 1} of ${rounds}, minute ${minute + 1}.${last ? ` Top step. ${hr("hard")}` : ""}`,
          seconds: 60,
          level: 5 + minute + (machine === "creep" ? Math.round(round / 2) : 0),
        });
      }
      steps.push({
        label: "4.5 km/h",
        sub: round < rounds - 1 ? `Walk it off. ${hr("recover")}` : "Cool-down walk",
        seconds: 180,
        level: 2,
      });
    }
    const top = speedAt(rounds - 1, 3);
    return {
      id,
      machine,
      title: machine === "runwalk" ? "Climbing 4s" : "Creeping ladder",
      minutes: 2 + rounds * 7,
      goal: "VO2 max, speed",
      plain:
        machine === "runwalk"
          ? `2 min walk, then ${rounds} rounds: run 4 min stepping up each minute (${start} to ${speedAt(0, 3)} km/h), walk 3 min. About ${r1(sessionKm(steps))} km.`
          : `2 min walk, then ${rounds} rounds of run 4 min, walk 3 min. Every running minute is 0.1 mph (0.16 km/h) quicker than the last, ${start} to ${top} km/h. About ${r1(sessionKm(steps))} km.`,
      why:
        machine === "runwalk"
          ? "Each run climbs to a hard top minute, then the walk resets you. Five climbs is a real interval session with a target every single minute."
          : "The speed never stops creeping up, so the last round is well past what you'd pick on your own. The walks make it possible.",
      steps,
      outside: [
        `2 min walk, then ${rounds} rounds of run 4 min, walk 3 min.`,
        machine === "runwalk"
          ? `Each run starts easy and gets quicker every minute, finishing hard (HR ${z.hard[0]} to ${z.hard[1]}).`
          : `Make every running minute a touch quicker than the one before, through all 5 rounds. The last round should be hard (HR ${z.hard[0]} to ${z.hard[1]}).`,
      ],
    };
  }

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
    const baseTotal = id === "long" ? opts.longMinutes : 35;
    const baseRounds = Math.round((baseTotal - 3) / 4);
    // about 0.6 km a round. more rounds until it's 5 km

    // the ladder's average speed is about easy pace, so each round is
    // about 3 min of running plus a walk. add rounds until it's 5 km
    let rounds = baseRounds;

    // every run a notch quicker: from a bit under easy pace to a push at
    // the end. the walks keep it honest, the ladder gives you something
    // to chase. the top of the ladder is about the goal easy pace.
    const ramp = (i: number) => r1(easyKmh * (0.92 + (0.26 * i) / Math.max(1, rounds - 1)));
    const pushFrom = () => rounds - 2;
    const walkStep = (minutes: number): Step => ({
      label: "4.5 km/h",
      sub: `Walk it off. ${hr("easy")}`,
      seconds: Math.round(minutes * 60),
      level: 2,
    });
    const runStep = (i: number, minutes: number): Step => {
      const push = i >= pushFrom();
      return {
        label: `${ramp(i)} km/h`,
        sub: push ? `Run ${i + 1} of ${rounds}. Push, ${hr("steady")}` : `Run ${i + 1} of ${rounds}. Easy, ${hr("easy")}`,
        seconds: Math.round(minutes * 60),
        level: push ? 6 : 3 + Math.round((2 * i) / Math.max(1, rounds - 1)),
      };
    };
    const steps: Step[] = [walkStep(3)];
    let used = 3;
    for (let i = 0; i < rounds; i++) {
      steps.push(runStep(i, 3));
      used += 3;
      if (i < rounds - 1) {
        steps.push(walkStep(1));
        used += 1;
      }
    }
    // not 5 km yet? another round, with the ladder stretched over it
    while (sessionKm(steps) < MIN_RUN_KM && rounds < 20) {
      rounds++;
      steps.length = 0;
      steps.push(walkStep(3));
      used = 3;
      for (let i = 0; i < rounds; i++) {
        steps.push(runStep(i, 3));
        used += 3;
        if (i < rounds - 1) {
          steps.push(walkStep(1));
          used += 1;
        }
      }
    }
    const low = ramp(0);
    const high = ramp(rounds - 1);
    const total = used;
    return {
      id,
      machine,
      title: id === "long" ? `Long run/walk, ${total} min` : "Run/walk ladder",
      minutes: total,
      goal: id === "long" ? "Aerobic engine" : "Aerobic base",
      plain: `3 min walk, then ${rounds} rounds of 3 min running and 1 min walking. Each run a notch quicker, ${low} to ${high} km/h, with the last two as a push. About ${r1(sessionKm(steps))} km.`,
      why:
        id === "long"
          ? "Same time on your feet as the long run, with walk breaks so the effort stays easy. The speed ladder means the finish is a real push."
          : "Walk breaks keep easy running easy, and the ladder gives each run a target. The last two runs are at the pace you're working toward.",
      steps,
      outside: [
        `3 min walk, then ${rounds} rounds of run 3 min, walk 1 min.`,
        `Start the runs slower than ${easyPace} and make each one a little quicker. Heart rate under ${z.easy[1]} until the last two runs.`,
        `Last two runs: a push, around ${steadyPace}, HR ${z.steady[0]} to ${z.steady[1]}.`,
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
    // 25 min easy, or more if that's what 5 km takes
    const easyMinutes = Math.max(25, Math.ceil(((MIN_RUN_KM - (6 * (v.stride / 3 + (2 * v.recover) / 3)) / 60 - (4 * v.easy) / 60) * 60) / v.easy));
    const steps = [step("easy", easyMinutes)];
    for (let i = 0; i < 6; i++) {
      steps.push(step("stride", 1 / 3));
      steps.push(step("recover", 2 / 3));
    }
    steps.push(step("easy", 4));
    return {
      id,
      machine,
      title: SESSION_TITLES.strides,
      minutes: easyMinutes + 10,
      goal: "Aerobic base, running form",
      plain: `${easyMinutes} min easy, then 6 quick 20 second bursts with easy jogging between, then 4 min easy.${machine === "run" ? ` About ${Math.round(sessionKm(steps) * 10) / 10} km.` : ""}`,
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
    const easyMinutes = machine === "run" ? Math.max(30, Math.ceil(((MIN_RUN_KM - (v.warm * 5) / 60) * 60) / v.easy)) : 30;
    const easySteps = [step("warm", 5), step("easy", easyMinutes)];
    return {
      id,
      machine,
      title: machine === "run" || machine === "outside" ? SESSION_TITLES.easy : `Easy ${MACHINE_NAMES[machine].toLowerCase()}`,
      minutes: easyMinutes + 5,
      goal: "Aerobic base",
      plain: `5 min warm-up, then ${easyMinutes} min easy. Nothing hard.${machine === "run" ? ` About ${Math.round(sessionKm(easySteps) * 10) / 10} km.` : ""}`,
      why:
        machine === "run" || machine === "outside"
          ? "Easy running is where most running fitness comes from. Keep it truly easy and it adds up fast."
          : "Same easy aerobic work without the impact, for days your legs need a break.",
      steps: easySteps,
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
