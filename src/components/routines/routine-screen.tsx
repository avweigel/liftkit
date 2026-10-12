"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { DayKind } from "@/lib/program/day-profile";
import { markRoutine, unmarkRoutine } from "@/lib/actions/routines";

// both cards keep this phone's picks in browser storage, so they only
// render in the browser
const WarmupCard = dynamic(() => import("@/app/log/[sessionId]/warmup-card"), { ssr: false });
const CooldownCard = dynamic(() => import("@/app/log/[sessionId]/cooldown-card"), { ssr: false });

export function RoutineScreen({
  routine,
  kind,
  dayKey,
  status,
}: {
  routine: "warmup" | "cooldown";
  kind: DayKind;
  dayKey: string;
  status: "done" | "skipped" | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const save = (next: "done" | "skipped" | null) => {
    setError(null);
    startTransition(async () => {
      try {
        if (next) await markRoutine({ kind: routine, status: next });
        else await unmarkRoutine(routine);
        if (next) router.push("/");
        else router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Couldn't save. Try again.");
      }
    });
  };

  const label = routine === "warmup" ? "warm-up" : "cooldown";

  return (
    <div className="space-y-5">
      {status && (
        <div className="flex items-center gap-3 rounded-xl bg-(--ok-soft) px-4 py-3">
          <span className="min-w-0 flex-1 text-[15px] font-semibold">
            {status === "done" ? `Done for today` : `Skipped today`}
          </span>
          <button type="button" onClick={() => save(null)} disabled={pending} className="btn btn-ghost btn-sm">
            Undo
          </button>
        </div>
      )}

      {routine === "warmup" ? (
        <WarmupCard kind={kind} sessionId={dayKey} standalone />
      ) : (
        <CooldownCard
          kind={kind}
          sessionId={dayKey}
          standalone
          onDone={() => save("done")}
          onSkip={() => save("skipped")}
        />
      )}

      {routine === "warmup" && (
        <div className="space-y-2">
          <button type="button" onClick={() => save("done")} disabled={pending} className="btn btn-primary btn-block">
            {pending ? "Saving…" : `Finish ${label}`}
          </button>
          <button type="button" onClick={() => save("skipped")} disabled={pending} className="btn btn-ghost btn-block">
            Skip today
          </button>
        </div>
      )}
      {error && <p className="text-[13px] text-(--danger)">{error}</p>}
    </div>
  );
}
