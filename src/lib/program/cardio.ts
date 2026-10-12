import type { DayProfile } from "@/lib/program/day-profile";

export type CardioKind = "easy" | "intervals" | "tempo" | "walk";

export const HARD_KINDS: CardioKind[] = ["intervals", "tempo"];
export const MAX_HARD_PER_WEEK = 3;

export const CARDIO_TYPES: Record<
  CardioKind,
  { title: string; minutes: number; what: string; outside: string; gym: string }
> = {
  easy: {
    title: "Easy aerobic",
    minutes: 35,
    what: "30 to 45 min at a pace where you can talk in full sentences.",
    outside: "Easy run",
    gym: "Elliptical, spin bike, rower or incline walk",
  },
  intervals: {
    title: "Intervals",
    minutes: 35,
    what: "VO2 max work: 4 x 4 min hard with 3 min easy between.",
    outside: "Run the hard parts",
    gym: "Treadmill, rower or bike 4 x 4, or assault bike sprints",
  },
  tempo: {
    title: "Tempo or long",
    minutes: 40,
    what: "10 min easy, 20 min comfortably hard, 10 min easy. Or 45 min easy and long.",
    outside: "Run",
    gym: "Treadmill or rower",
  },
  walk: {
    title: "Reset walk",
    minutes: 35,
    what: "30 to 45 min walk, no pace goal.",
    outside: "Walk outside",
    gym: "Incline walk",
  },
};

export type CardioContext = {
  // what you trained this morning (or planned to); null = nothing
  today: DayProfile | null;
  // what's planned for tomorrow morning; null = rest day
  tomorrow: DayProfile | null;
  // hard cardio sessions already logged this week (monday start)
  hardThisWeek: number;
  // 1 = monday ... 7 = sunday
  weekday: number;
  // days since the last high heart rate session (hard cardio or a metcon
  // morning); null = none in the last week
  daysSinceHigh: number | null;
};

export type CardioSuggestion = {
  kind: CardioKind;
  recommended: boolean;
  blocked: boolean;
  reason: string;
  // the plan to put first on the machine page
  plan?: string;
};

// the aim: become a stronger runner and get your heart rate high every
// second day or so, without stealing recovery from the lifting.
//
// - high heart rate (4 x 4 or tempo) when it's been 2+ days and the legs
//   are free: not after a heavy leg morning, not before one, not on a
//   metcon day (that was the high heart rate)
// - running is the default machine, because running gets you better at
//   running. after a heavy leg morning the easy option moves to no impact
// - weekends get the tempo or long run, weekdays the 4 x 4
export function suggestCardio(ctx: CardioContext): CardioSuggestion[] {
  const { today, tomorrow, hardThisWeek, weekday, daysSinceHigh } = ctx;
  const weekend = weekday >= 6;
  const legsTired = !!today?.heavyLegs;

  let hardBlock: string | null = null;
  if (today?.kind === "metcon") {
    hardBlock = "The metcon this morning was today's high heart rate work.";
  } else if (tomorrow?.heavyLegs) {
    hardBlock = `Tomorrow is ${legWord(tomorrow)}. Hard running tonight would cost you there.`;
  } else if (legsTired) {
    hardBlock = `You did ${legWord(today!)} this morning. Your legs need tonight to recover.`;
  } else if (daysSinceHigh === 0 || daysSinceHigh === 1) {
    hardBlock = "You went hard in the last day. Easy tonight lets you go hard again soon.";
  } else if (hardThisWeek >= MAX_HARD_PER_WEEK) {
    hardBlock = `${hardThisWeek} hard sessions this week already. That's plenty next to lifting.`;
  }

  const hardKind: CardioKind = weekend ? "tempo" : "intervals";
  const otherHard: CardioKind = weekend ? "intervals" : "tempo";
  const hardPlan = weekend ? "tempo-run-progression" : "int-run";
  const otherHardPlan = weekend ? "int-run" : "tempo-run";

  const since =
    daysSinceHigh == null ? "It's been a while since your heart rate was really up." : `${daysSinceHigh} days since your last high heart rate session.`;
  const hardReason = weekend
    ? `${since} A progression run builds threshold and finishing strength.`
    : `${since} The 4 x 4 run is the best single session for VO2 max and running fitness.`;

  // easy: run when the legs are fresh, no impact when they aren't
  const easyPlan = legsTired ? "easy-elliptical" : "easy-run";
  const easyReason = legsTired
    ? "Easy aerobic with no impact. It flushes your legs and still builds your base."
    : tomorrow?.heavyLegs
      ? "An easy run builds your running base and leaves your legs fresh for tomorrow."
      : "Easy running is where most running fitness comes from.";
  const walkReason =
    legsTired || today?.kind === "metcon"
      ? "The gentlest option after a big morning. Recovery is training too."
      : "Low energy? A hill walk still counts.";

  if (hardBlock) {
    const walkFirst = legsTired || today?.kind === "metcon";
    const easy: CardioSuggestion = { kind: "easy", recommended: !walkFirst, blocked: false, reason: easyReason, plan: easyPlan };
    const walk: CardioSuggestion = { kind: "walk", recommended: walkFirst, blocked: false, reason: walkReason, plan: "walk-hill" };
    return [
      ...(walkFirst ? [walk, easy] : [easy, walk]),
      { kind: hardKind, recommended: false, blocked: true, reason: hardBlock, plan: hardPlan },
      { kind: otherHard, recommended: false, blocked: true, reason: hardBlock, plan: otherHardPlan },
    ];
  }

  // free legs but a high session only a couple of days ago is still fine:
  // recommend hard from day 2 on
  return [
    { kind: hardKind, recommended: true, blocked: false, reason: hardReason, plan: hardPlan },
    { kind: "easy", recommended: false, blocked: false, reason: easyReason, plan: easyPlan },
    {
      kind: otherHard,
      recommended: false,
      blocked: false,
      reason: weekend ? "The 4 x 4 works too if you'd rather go short and sharp." : "Tempo works too if you'd rather settle into one long hard block.",
      plan: otherHardPlan,
    },
    { kind: "walk", recommended: false, blocked: false, reason: walkReason, plan: "walk-hill" },
  ];
}

function legWord(p: DayProfile): string {
  if (p.kind === "hinge") return "deadlift day";
  if (p.kind === "squat") return "squat day";
  return "a heavy leg day";
}
