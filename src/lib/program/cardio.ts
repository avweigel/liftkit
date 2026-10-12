import type { DayProfile } from "@/lib/program/day-profile";

export type CardioKind = "easy" | "intervals" | "tempo" | "walk";

export const HARD_KINDS: CardioKind[] = ["intervals", "tempo"];
export const MAX_HARD_PER_WEEK = 2;

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
};

export type CardioSuggestion = {
  kind: CardioKind;
  recommended: boolean;
  blocked: boolean;
  reason: string;
};

// ranked suggestions for tonight. the order is the recommendation; blocked
// sessions stay in the list (greyed out) so the reason is visible.
export function suggestCardio(ctx: CardioContext): CardioSuggestion[] {
  const { today, tomorrow, hardThisWeek, weekday } = ctx;

  let hardBlock: string | null = null;
  if (tomorrow?.heavyLegs) {
    hardBlock = `Tomorrow is ${legWord(tomorrow)}. Keep tonight easy so your legs are fresh.`;
  } else if (hardThisWeek >= MAX_HARD_PER_WEEK) {
    hardBlock = `You've done ${hardThisWeek} hard sessions this week already.`;
  } else if (today?.heavyLegs) {
    hardBlock = `You did ${legWord(today)} this morning. Let your legs recover.`;
  } else if (today?.kind === "metcon") {
    hardBlock = "You already did conditioning this morning.";
  }

  const weekend = weekday >= 6;
  const hardKind: CardioKind = weekend ? "tempo" : "intervals";
  const otherHard: CardioKind = weekend ? "intervals" : "tempo";

  const hardReason = tomorrow?.kind === "metcon"
    ? "Good night for it. If your legs are heavy tomorrow, do the metcon's easy version."
    : "Good night for a hard session: nothing heavy for your legs tomorrow.";

  const easyReason = tomorrow?.heavyLegs
    ? "Keeps blood moving without tiring your legs for tomorrow."
    : today?.heavyLegs
      ? "Easy movement helps your legs recover from this morning."
      : "Builds your aerobic base and helps recovery.";

  const walkReason = today?.hard || tomorrow?.heavyLegs
    ? "The gentlest option after a big day."
    : "Low energy? This counts, and it's always fine.";

  if (hardBlock) {
    const walkFirst = !!today?.heavyLegs || today?.kind === "metcon";
    const easyFirst: CardioSuggestion[] = walkFirst
      ? [
          { kind: "walk", recommended: true, blocked: false, reason: walkReason },
          { kind: "easy", recommended: false, blocked: false, reason: easyReason },
        ]
      : [
          { kind: "easy", recommended: true, blocked: false, reason: easyReason },
          { kind: "walk", recommended: false, blocked: false, reason: walkReason },
        ];
    return [
      ...easyFirst,
      { kind: hardKind, recommended: false, blocked: true, reason: hardBlock },
      { kind: otherHard, recommended: false, blocked: true, reason: hardBlock },
    ];
  }

  return [
    { kind: hardKind, recommended: true, blocked: false, reason: hardReason },
    { kind: "easy", recommended: false, blocked: false, reason: easyReason },
    { kind: "walk", recommended: false, blocked: false, reason: walkReason },
    {
      kind: otherHard,
      recommended: false,
      blocked: false,
      reason: weekend
        ? "Fine too, but tempo or long suits the weekend."
        : "Fine too, but save tempo or long for Sunday.",
    },
  ];
}

function legWord(p: DayProfile): string {
  if (p.kind === "hinge") return "deadlift day";
  if (p.kind === "squat") return "squat day";
  return "a heavy leg day";
}
