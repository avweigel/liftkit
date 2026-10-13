import { createClient } from "@/lib/supabase/server";
import { DEFAULT_RUN_PROFILE, nextLongMinutes, type RunProfile, type SessionId } from "@/lib/program/running";

export type CardioLog = {
  id: string;
  logged_on: string;
  kind: string;
  session: SessionId | null;
  machine: string | null;
  minutes: number | null;
};

// logs from before the running plan only have a kind
export function sessionOf(log: Pick<CardioLog, "kind" | "session">): SessionId {
  if (log.session) return log.session;
  if (log.kind === "intervals") return "intervals";
  if (log.kind === "tempo" || log.kind === "long") return "long";
  if (log.kind === "walk") return "walk";
  return "easy";
}

export async function loadRunProfile(userId: string): Promise<RunProfile> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("max_hr, easy_pace_s")
    .eq("id", userId)
    .maybeSingle<{ max_hr: number | null; easy_pace_s: number | null }>();
  return {
    maxHr: data?.max_hr ?? DEFAULT_RUN_PROFILE.maxHr,
    easyPaceS: data?.easy_pace_s ?? DEFAULT_RUN_PROFILE.easyPaceS,
  };
}

export async function loadLongMinutes(userId: string): Promise<number> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("cardio_logs")
    .select("minutes")
    .eq("user_id", userId)
    .eq("session", "long")
    .order("logged_on", { ascending: true })
    .returns<Array<{ minutes: number | null }>>();
  return nextLongMinutes((data ?? []).map((r) => r.minutes ?? 0).filter((m) => m > 0));
}
