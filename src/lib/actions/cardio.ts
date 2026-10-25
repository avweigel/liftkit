"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { localToday } from "@/lib/local-date";
import { KIND_FOR } from "@/lib/program/running";

const logSchema = z.object({
  session: z.enum(["intervals", "long", "strides", "easy", "walk"]),
  machine: z.enum(["run", "runwalk", "creep", "bike", "row", "elliptical", "walk", "outside"]),
  minutes: z.number().int().min(1).max(600).nullable(),
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
    kind: KIND_FOR[parsed.session],
    session: parsed.session,
    machine: parsed.machine,
    minutes: parsed.minutes,
    place: parsed.machine === "outside" ? "outside" : "gym",
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
