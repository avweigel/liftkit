"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { localToday } from "@/lib/local-date";

const logSchema = z.object({
  kind: z.enum(["easy", "intervals", "tempo", "walk"]),
  minutes: z.number().int().min(1).max(600).nullable(),
  place: z.enum(["outside", "gym"]).nullable(),
  plan_id: z.string().max(60).nullable().optional(),
});

export async function logCardio(input: z.input<typeof logSchema>) {
  const parsed = logSchema.parse(input);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("not signed in");
  const { error } = await supabase.from("cardio_logs").insert({
    user_id: user.id,
    logged_on: localToday().iso,
    kind: parsed.kind,
    minutes: parsed.minutes,
    place: parsed.place,
    plan_id: parsed.place === "gym" ? (parsed.plan_id ?? null) : null,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/");
}

export async function deleteCardio(id: string) {
  const parsed = z.string().uuid().parse(id);
  const supabase = await createClient();
  const { error } = await supabase.from("cardio_logs").delete().eq("id", parsed);
  if (error) throw new Error(error.message);
  revalidatePath("/");
}
