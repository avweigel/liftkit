// the server runs in UTC, but "today" and "tonight" mean the lifter's day.
// a 5 am workout and an 11 pm walk both belong to the local calendar date.
export const APP_TIME_ZONE = process.env.APP_TIME_ZONE ?? "Europe/Stockholm";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export type LocalDay = {
  // YYYY-MM-DD in the app time zone
  iso: string;
  // 1 = monday ... 7 = sunday
  weekday: number;
};

export function localToday(now: Date = new Date()): LocalDay {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: APP_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
  }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const weekday = WEEKDAYS.indexOf(get("weekday")) + 1;
  return { iso: `${get("year")}-${get("month")}-${get("day")}`, weekday };
}

export function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function weekStart(day: LocalDay): string {
  return addDays(day.iso, -(day.weekday - 1));
}

export function nextWeekday(weekday: number): number {
  return (weekday % 7) + 1;
}
