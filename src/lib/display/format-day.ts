import { normalizeDayName } from "@/lib/day-name-normalize";

const SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
const LONG = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

export function weekdayFor(dayNumber: number): { short: string; long: string } {
  const idx = Math.max(0, Math.min(6, dayNumber - 1));
  return { short: SHORT[idx], long: LONG[idx] };
}

export type DayLabel = {
  weekday: string;
  weekdayShort: string;
  name: string;
  combined: string;
};

export function formatDayLabel(
  dayNumber: number,
  dayName: string | null | undefined,
): DayLabel {
  const clean = normalizeDayName((dayName ?? "").trim());
  const { short, long } = weekdayFor(dayNumber);
  const name = clean || `Day ${dayNumber}`;
  return {
    weekday: long,
    weekdayShort: short,
    name,
    combined: `${long} · ${name}`,
  };
}
