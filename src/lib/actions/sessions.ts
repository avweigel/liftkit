"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { setInputSchema } from "@/lib/schemas/session";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("not signed in");
  return { supabase, user };
}

export async function startSession(
  planDayId: string | null,
  startedAtIso?: string,
) {
  const { supabase, user } = await requireUser();
  const started = coerceIso(startedAtIso) ?? new Date().toISOString();
  const { data: session, error } = await supabase
    .from("workout_sessions")
    .insert({
      user_id: user.id,
      plan_day_id: planDayId,
      started_at: started,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  revalidatePath("/");
  redirect(`/log/${session.id}`);
}

export async function finishSession(sessionId: string, notes?: string) {
  const { supabase } = await requireUser();
  const trimmed = (notes ?? "").trim();
  const { error } = await supabase
    .from("workout_sessions")
    .update({
      finished_at: new Date().toISOString(),
      notes: trimmed.length > 0 ? trimmed : null,
    })
    .eq("id", sessionId);
  if (error) throw new Error(error.message);
  revalidatePath("/");
  revalidatePath(`/log/${sessionId}`);
  redirect("/");
}

export async function updateSession(
  sessionId: string,
  patch: {
    started_at?: string | null;
    finished_at?: string | null;
    notes?: string | null;
  },
) {
  const { supabase } = await requireUser();
  const update: Record<string, string | null> = {};
  if ("started_at" in patch) {
    const iso = coerceIso(patch.started_at ?? undefined);
    if (!iso) throw new Error("invalid start time");
    update.started_at = iso;
  }
  if ("finished_at" in patch) {
    update.finished_at = patch.finished_at
      ? coerceIso(patch.finished_at) ?? null
      : null;
  }
  if ("notes" in patch) {
    const trimmed = (patch.notes ?? "").trim();
    update.notes = trimmed.length > 0 ? trimmed : null;
  }
  if (Object.keys(update).length === 0) return;
  const { error } = await supabase
    .from("workout_sessions")
    .update(update)
    .eq("id", sessionId);
  if (error) throw new Error(error.message);
  revalidatePath(`/log/${sessionId}`);
  revalidatePath("/");
}

export async function upsertSessionSet(
  sessionId: string,
  setId: string | null,
  input: unknown,
) {
  const parsed = setInputSchema.parse(input);
  const { supabase } = await requireUser();

  if (setId) {
    const { error } = await supabase
      .from("session_sets")
      .update({
        weight: parsed.weight ?? null,
        reps: parsed.reps,
        rpe: parsed.rpe ?? null,
        is_warmup: parsed.is_warmup,
        notes: parsed.notes ?? null,
      })
      .eq("id", setId);
    if (error) throw new Error(error.message);
    revalidatePath(`/log/${sessionId}`);
    return { id: setId };
  }

  const { data, error } = await supabase
    .from("session_sets")
    .insert({
      session_id: sessionId,
      exercise_id: parsed.exercise_id,
      set_number: parsed.set_number,
      weight: parsed.weight ?? null,
      reps: parsed.reps,
      rpe: parsed.rpe ?? null,
      is_warmup: parsed.is_warmup,
      notes: parsed.notes ?? null,
      logged_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  revalidatePath(`/log/${sessionId}`);
  return { id: data.id };
}

export async function deleteSessionSet(sessionId: string, setId: string) {
  const { supabase } = await requireUser();
  const { error } = await supabase
    .from("session_sets")
    .delete()
    .eq("id", setId);
  if (error) throw new Error(error.message);
  revalidatePath(`/log/${sessionId}`);
}

function coerceIso(v: string | undefined): string | null {
  if (!v) return null;
  const d = new Date(v);
  if (isNaN(d.getTime())) return null;
  return d.toISOString();
}
