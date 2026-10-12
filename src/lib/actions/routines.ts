"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { localToday } from "@/lib/local-date";

const kindSchema = z.enum(["warmup", "cooldown"]);
const markSchema = z.object({
  kind: kindSchema,
  status: z.enum(["done", "skipped"]).default("done"),
  details: z.record(z.string(), z.unknown()).default({}),
});

// one row per kind per day: finishing twice just updates it
export async function markRoutine(input: z.input<typeof markSchema>) {
  const { kind, status, details } = markSchema.parse(input);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("not signed in");
  const { error } = await supabase.from("routine_logs").upsert(
    {
      user_id: user.id,
      logged_on: localToday().iso,
      kind,
      status,
      details,
    },
    { onConflict: "user_id,logged_on,kind" },
  );
  if (error) throw new Error(error.message);
  revalidatePath("/");
}

export async function unmarkRoutine(kind: z.input<typeof kindSchema>) {
  const parsed = kindSchema.parse(kind);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("not signed in");
  const { error } = await supabase
    .from("routine_logs")
    .delete()
    .eq("user_id", user.id)
    .eq("logged_on", localToday().iso)
    .eq("kind", parsed);
  if (error) throw new Error(error.message);
  revalidatePath("/");
}
