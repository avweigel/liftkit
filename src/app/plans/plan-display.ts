import { formatDayLabel } from "@/lib/display/format-day";

// core routines are done daily as alternating A/B sessions, so weekday
// labels would be wrong for them.
export function isCorePlan(name: string): boolean {
  return /^core/i.test(name.trim());
}

export function isOldPhase(name: string): boolean {
  return /^Phase \d+/i.test(name.trim());
}

export type DayHeading = {
  weekday: string | null;
  weekdayShort: string | null;
  name: string;
};

export function dayHeading(
  dayNumber: number,
  dayName: string | null | undefined,
  core: boolean,
): DayHeading {
  if (core) {
    // skip normalizeDayName here: it expands "A" to "Arms"
    const raw = (dayName ?? "").trim();
    const name = /^[a-z]$/i.test(raw)
      ? `Core ${raw.toUpperCase()}`
      : raw || `Day ${dayNumber}`;
    return { weekday: null, weekdayShort: null, name };
  }
  const label = formatDayLabel(dayNumber, dayName);
  return {
    weekday: label.weekday,
    weekdayShort: label.weekdayShort,
    name: label.name,
  };
}

export function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}
