"use client";

import { useState, useTransition } from "react";
import { deleteSession } from "@/lib/actions/sessions";

export function DashboardSessionDelete({ sessionId }: { sessionId: string }) {
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  const onTap = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirming) {
      setConfirming(true);
      setTimeout(() => setConfirming(false), 3000);
      return;
    }
    startTransition(async () => {
      await deleteSession(sessionId);
    });
  };

  return (
    <button
      type="button"
      onClick={onTap}
      disabled={pending}
      aria-label={confirming ? "tap again to confirm delete" : "delete session"}
      className={`shrink-0 rounded-md px-2 py-1 text-xs font-medium disabled:opacity-60 ${
        confirming
          ? "bg-red-600 text-white"
          : "text-(--muted) hover:bg-(--border) hover:text-red-600"
      }`}
    >
      {pending ? "…" : confirming ? "tap to confirm" : "✕"}
    </button>
  );
}
