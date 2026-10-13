"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setDayOrder } from "@/lib/actions/day-order";
import { BLOCK_DETAIL, BLOCK_NAMES, DEFAULT_ORDER, type DayBlock } from "@/lib/program/day-order";

export function DayOrderControl({ order }: { order: DayBlock[] }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(order);
  const [failed, setFailed] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= draft.length) return;
    const next = [...draft];
    [next[i], next[j]] = [next[j], next[i]];
    setDraft(next);
  };

  const save = () => {
    setFailed(false);
    startTransition(async () => {
      try {
        await setDayOrder(draft);
        router.refresh();
        setOpen(false);
      } catch {
        setFailed(true);
      }
    });
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => {
          setDraft(order);
          setOpen(true);
        }}
        className="flex h-9 items-center gap-1.5 rounded-lg px-2 text-[13px] font-semibold text-(--muted) hover:text-(--foreground)"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M7 4v16M3 8l4-4 4 4M17 20V4M13 16l4 4 4-4" />
        </svg>
        Change order
      </button>
    );
  }

  const isDefault = draft.join() === DEFAULT_ORDER.join();
  return (
    <section className="card w-full space-y-3 p-4">
      <div>
        <h2 className="display text-[20px]">Order of your day</h2>
        <p className="text-[13px] text-(--muted)">Warm-up, workout and cooldown move as one.</p>
      </div>
      <ol className="space-y-1.5">
        {draft.map((b, i) => (
          <li key={b} className="flex min-h-14 items-center gap-3 rounded-xl bg-(--surface-2) pl-3 pr-1.5">
            <span className="num w-5 text-[15px] text-(--muted)">{i + 1}</span>
            <span className="min-w-0 flex-1">
              <span className="block font-semibold">{BLOCK_NAMES[b]}</span>
              {BLOCK_DETAIL[b] && <span className="block text-[13px] text-(--muted)">{BLOCK_DETAIL[b]}</span>}
            </span>
            <button
              type="button"
              onClick={() => move(i, -1)}
              disabled={i === 0}
              aria-label={`Move ${BLOCK_NAMES[b]} earlier`}
              className="flex h-11 w-11 items-center justify-center rounded-lg text-(--foreground) disabled:opacity-25"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M6 15l6-6 6 6" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => move(i, 1)}
              disabled={i === draft.length - 1}
              aria-label={`Move ${BLOCK_NAMES[b]} later`}
              className="flex h-11 w-11 items-center justify-center rounded-lg text-(--foreground) disabled:opacity-25"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>
          </li>
        ))}
      </ol>
      {failed && <p className="text-[13px] text-(--danger)">Couldn&rsquo;t save. Check your connection and try again.</p>}
      <div className="flex gap-2">
        <button type="button" onClick={() => setOpen(false)} className="btn btn-secondary flex-1">
          Cancel
        </button>
        <button type="button" onClick={save} disabled={pending} className="btn btn-primary flex-[2]">
          {pending ? "Saving…" : "Save order"}
        </button>
      </div>
      {!isDefault && (
        <button
          type="button"
          onClick={() => setDraft(DEFAULT_ORDER)}
          className="text-[13px] font-semibold text-(--muted) underline underline-offset-2"
        >
          Back to strength, core, cardio
        </button>
      )}
    </section>
  );
}
