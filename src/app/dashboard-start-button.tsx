"use client";

import { useTransition } from "react";
import { startSession } from "@/lib/actions/sessions";

export function StartTodayButton({ dayId }: { dayId: string }) {
  const [pending, startTransition] = useTransition();
  const onClick = () => {
    startTransition(async () => {
      await startSession(dayId);
    });
  };
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      className="mt-4 h-12 w-full rounded-xl bg-(--accent) text-base font-bold text-(--accent-contrast) shadow-sm active:scale-[0.99] disabled:opacity-60"
    >
      {pending ? "starting…" : "start today's workout →"}
    </button>
  );
}

export function StartOtherDayButton({
  dayId,
  label,
}: {
  dayId: string;
  label: string;
}) {
  const [pending, startTransition] = useTransition();
  const onClick = () => {
    startTransition(async () => {
      await startSession(dayId);
    });
  };
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      className="text-xs font-semibold text-(--accent) disabled:opacity-60"
    >
      {pending ? "…" : label}
    </button>
  );
}
