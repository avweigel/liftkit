"use client";

import { useState, useTransition } from "react";
import { updateSession } from "@/lib/actions/sessions";

type Props = {
  sessionId: string;
  startedAt: string;
  finishedAt: string | null;
};

export function SessionStartedAt({ sessionId, startedAt, finishedAt }: Props) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(toLocalInput(startedAt));
  const [pending, startTransition] = useTransition();

  const save = () => {
    startTransition(async () => {
      await updateSession(sessionId, {
        started_at: new Date(value).toISOString(),
      });
      setEditing(false);
    });
  };

  if (editing) {
    return (
      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-(--muted)">
        <input
          type="datetime-local"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="rounded border border-(--border) bg-(--background) px-2 py-1"
        />
        <button
          type="button"
          onClick={save}
          disabled={pending}
          className="rounded bg-(--foreground) px-2 py-1 text-xs font-semibold text-(--background) disabled:opacity-60"
        >
          {pending ? "…" : "save"}
        </button>
        <button
          type="button"
          onClick={() => {
            setEditing(false);
            setValue(toLocalInput(startedAt));
          }}
          className="text-xs"
        >
          cancel
        </button>
      </div>
    );
  }

  return (
    <p className="mt-1 text-xs text-(--muted)">
      started {format(startedAt)}
      {finishedAt ? ` · finished ${format(finishedAt)}` : ""}
      {"  "}
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="ml-1 underline hover:text-(--foreground)"
      >
        edit
      </button>
    </p>
  );
}

function format(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function toLocalInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
