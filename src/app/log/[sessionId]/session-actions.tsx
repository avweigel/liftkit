"use client";

import { useState, useTransition } from "react";
import { deleteSession, reopenSession } from "@/lib/actions/sessions";

type Props = {
  sessionId: string;
  finished: boolean;
};

export function SessionActions({ sessionId, finished }: Props) {
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);

  const onReopen = () => {
    startTransition(async () => {
      await reopenSession(sessionId);
    });
  };

  const onDelete = () => {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    startTransition(async () => {
      await deleteSession(sessionId);
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {finished && (
        <>
          <span className="inline-flex items-center rounded-full bg-(--ok)/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-(--ok)">
            finished
          </span>
          <button
            type="button"
            onClick={onReopen}
            disabled={pending}
            className="h-8 rounded-md border border-(--border) bg-(--background) px-3 text-xs font-medium text-(--muted) disabled:opacity-60"
          >
            {pending ? "…" : "reopen"}
          </button>
        </>
      )}
      <button
        type="button"
        onClick={onDelete}
        disabled={pending}
        className={`h-8 rounded-md px-3 text-xs font-medium disabled:opacity-60 ${
          confirming
            ? "bg-red-600 text-white"
            : "border border-red-300 text-red-600 dark:border-red-900 dark:text-red-400"
        }`}
      >
        {pending ? "deleting…" : confirming ? "tap to confirm" : "delete"}
      </button>
      {confirming && !pending && (
        <button
          type="button"
          onClick={() => setConfirming(false)}
          className="text-xs text-(--muted) underline"
        >
          cancel
        </button>
      )}
    </div>
  );
}
