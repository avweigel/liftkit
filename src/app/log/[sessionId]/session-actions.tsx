"use client";

import { useState, useTransition } from "react";
import { deleteSession, reopenSession } from "@/lib/actions/sessions";

type Props = {
  sessionId: string;
  finished: boolean;
};

// lives at the bottom of the workout, away from the sets you tap
export function SessionActions({ sessionId, finished }: Props) {
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);

  return (
    <section className="space-y-2 pt-2">
      {finished && (
        <button
          type="button"
          onClick={() =>
            startTransition(async () => {
              await reopenSession(sessionId);
            })
          }
          disabled={pending}
          className="btn btn-secondary btn-block"
        >
          Reopen to keep logging
        </button>
      )}
      <button
        type="button"
        onClick={() => {
          if (!confirming) {
            setConfirming(true);
            setTimeout(() => setConfirming(false), 4000);
            return;
          }
          startTransition(async () => {
            await deleteSession(sessionId);
          });
        }}
        disabled={pending}
        className={`btn btn-block ${confirming ? "" : "btn-danger"}`}
        style={confirming ? { background: "var(--danger)", color: "#fff" } : undefined}
      >
        {pending && confirming
          ? "Deleting…"
          : confirming
            ? "Tap again to delete this workout"
            : "Delete workout"}
      </button>
    </section>
  );
}
