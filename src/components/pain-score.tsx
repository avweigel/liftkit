"use client";

import { useEffect, useState, useTransition } from "react";
import { logPain, recentPain, type PainEntry } from "@/lib/actions/pain";
import { addDays, localToday } from "@/lib/local-date";

const WORDS = ["None", "Mild", "Real", "Bad"];
const DAYS = 28;

// a 0 to 3 pain score for today, with the last four weeks drawn beside it.
// the trend is the point: one day says nothing, a month says whether the
// routine is working.
export function PainScore({ context, label }: { context: string; label: string }) {
  const [history, setHistory] = useState<PainEntry[] | null>(null);
  const [pending, startTransition] = useTransition();
  const today = localToday().iso;

  useEffect(() => {
    let alive = true;
    recentPain(context, DAYS)
      .then((h) => {
        if (alive) setHistory(h);
      })
      .catch(() => {
        if (alive) setHistory([]);
      });
    return () => {
      alive = false;
    };
  }, [context]);

  const score = history?.find((h) => h.logged_on === today)?.score ?? null;
  const pick = (s: number) => {
    setHistory((h) => [...(h ?? []).filter((x) => x.logged_on !== today), { logged_on: today, score: s }]);
    startTransition(async () => {
      try {
        await logPain({ context, score: s });
      } catch {}
    });
  };

  const days = Array.from({ length: DAYS }, (_, i) => addDays(today, i - (DAYS - 1)));
  const byDay = new Map((history ?? []).map((h) => [h.logged_on, h.score]));
  const scored = (history ?? []).filter((h) => h.logged_on !== today);
  const recent = scored.slice(-7);
  const earlier = scored.slice(-14, -7);
  const avg = (xs: PainEntry[]) => (xs.length ? xs.reduce((t, x) => t + x.score, 0) / xs.length : null);
  const a = avg(recent);
  const b = avg(earlier);
  const trend =
    a == null || b == null ? null : a < b - 0.2 ? "Trending down" : a > b + 0.2 ? "Trending up" : "Holding steady";

  return (
    <div className="space-y-2 rounded-xl bg-(--surface-2) p-3">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[14px] font-semibold">{label}</span>
        {trend && <span className="text-[12px] text-(--muted)">{trend}, last two weeks</span>}
      </div>
      <div className="grid grid-cols-4 gap-1.5" role="radiogroup" aria-label={label}>
        {WORDS.map((w, s) => {
          const on = score === s;
          return (
            <button
              key={w}
              type="button"
              role="radio"
              aria-checked={on}
              disabled={pending}
              onClick={() => pick(s)}
              className={`flex h-11 flex-col items-center justify-center rounded-lg text-[13px] font-semibold leading-none transition-colors ${
                on ? "bg-(--accent) text-(--accent-contrast)" : "bg-(--surface) text-(--muted)"
              }`}
            >
              <span className="num text-[16px]">{s}</span>
              <span className="mt-0.5 text-[11px]">{w}</span>
            </button>
          );
        })}
      </div>
      <div className="flex h-6 items-end gap-px" aria-hidden>
        {days.map((d) => {
          const s = byDay.get(d);
          const h = s == null ? 2 : 4 + s * 6;
          return (
            <div
              key={d}
              className={`flex-1 rounded-sm ${s == null ? "bg-(--border)" : s === 0 ? "bg-(--ok)" : s === 1 ? "bg-(--accent)" : "bg-(--danger)"}`}
              style={{ height: h }}
              title={`${d}: ${s ?? "not scored"}`}
            />
          );
        })}
      </div>
      <p className="text-[12px] text-(--muted)">
        {score == null ? "Score it after the hold. 0 is nothing, 3 is a flare you'll feel tomorrow." : `Today: ${score}, ${WORDS[score].toLowerCase()}. Four weeks shown.`}
      </p>
    </div>
  );
}
