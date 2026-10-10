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
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <input
          type="datetime-local"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          aria-label="Start time"
          className="h-11 rounded-xl bg-(--surface-2) px-3 text-[16px] outline-none focus:ring-2 focus:ring-(--accent-line)"
        />
        <button type="button" onClick={save} disabled={pending} className="btn btn-primary btn-sm">
          {pending ? "Saving…" : "Save"}
        </button>
        <button
          type="button"
          onClick={() => {
            setEditing(false);
            setValue(toLocalInput(startedAt));
          }}
          className="btn btn-ghost btn-sm text-(--muted)"
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <p className="text-[14px] text-(--muted)">
      {finishedAt ? (
        <>
          <span className="num text-[16px] text-(--foreground)">{time(startedAt)}</span> to{" "}
          <span className="num text-[16px] text-(--foreground)">{time(finishedAt)}</span>, {day(startedAt)}
          <span className="ml-2 inline-flex">
            <span className="chip chip-ok">
              <span className="num text-[13px]">{minutesBetween(startedAt, finishedAt)}</span> min
            </span>
          </span>
        </>
      ) : (
        <>
          Started <span className="num text-[16px] text-(--foreground)">{time(startedAt)}</span>, {day(startedAt)}
        </>
      )}
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="ml-2 font-semibold text-(--accent)"
      >
        Change
      </button>
    </p>
  );
}

function time(iso: string) {
  return new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

function day(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function minutesBetween(a: string, b: string) {
  return Math.max(1, Math.round((Date.parse(b) - Date.parse(a)) / 60000));
}

function toLocalInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
