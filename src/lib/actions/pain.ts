"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { addDays, localToday } from "@/lib/local-date";

// a 0 to 3 pain score for something that provokes the wrist nerve: the
// daily handstand, or a named exercise. one score per thing per day.
const logSchema = z.object({
  context: z.string().min(1).max(80),
  score: z.number().int().min(0).max(3),
});

export type PainEntry = { logged_on: string; score: number };

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("not signed in");
  return { supabase, user };
}

export async function logPain(input: z.input<typeof logSchema>) {
  const parsed = logSchema.parse(input);
  const { supabase, user } = await requireUser();
  const { error } = await supabase.from("pain_logs").upsert(
    {
      user_id: user.id,
      logged_on: localToday().iso,
      context: parsed.context,
      score: parsed.score,
    },
    { onConflict: "user_id,logged_on,context" },
  );
  if (error) throw new Error(error.message);
  revalidatePath("/");
}

export async function recentPain(context: string, days = 28): Promise<PainEntry[]> {
  const { supabase, user } = await requireUser();
  const since = addDays(localToday().iso, -(days - 1));
  const { data } = await supabase
    .from("pain_logs")
    .select("logged_on, score")
    .eq("user_id", user.id)
    .eq("context", context)
    .gte("logged_on", since)
    .order("logged_on", { ascending: true });
  return (data ?? []) as PainEntry[];
}
