"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({
  maxHr: z.number().int().min(120).max(230),
  easyPaceS: z.number().int().min(180).max(1200),
});

export async function setRunProfile(input: unknown) {
  const { maxHr, easyPaceS } = schema.parse(input);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("not signed in");
  const { error } = await supabase
    .from("profiles")
    .update({ max_hr: maxHr, easy_pace_s: easyPaceS })
    .eq("id", user.id);
  if (error) throw new Error(error.message);
  revalidatePath("/", "layout");
}
