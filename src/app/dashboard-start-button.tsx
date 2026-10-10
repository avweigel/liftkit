"use client";

import { useTransition } from "react";
import { startSession } from "@/lib/actions/sessions";

export function StartDayButton({
  dayId,
  label,
  block = false,
  variant = "primary",
}: {
  dayId: string;
  label: string;
  block?: boolean;
  variant?: "primary" | "secondary";
}) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      onClick={() =>
        startTransition(async () => {
          await startSession(dayId);
        })
      }
      disabled={pending}
      className={`btn ${variant === "primary" ? "btn-primary" : "btn-secondary"} ${block ? "btn-block" : ""}`}
    >
      {pending ? "Starting…" : label}
    </button>
  );
}

// kept for older call sites: the main "start today" button
export function StartTodayButton({ dayId }: { dayId: string }) {
  return <StartDayButton dayId={dayId} label="Start workout" block />;
}

export function StartOtherDayButton({
  dayId,
  label,
}: {
  dayId: string;
  label: string;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      onClick={() =>
        startTransition(async () => {
          await startSession(dayId);
        })
      }
      disabled={pending}
      className="btn btn-ghost btn-sm"
    >
      {pending ? "Starting…" : label}
    </button>
  );
}
