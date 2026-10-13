"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const schema = z.enum(["metric", "imperial"]);

export async function setMeasurement(input: unknown) {
  const measurement = schema.parse(input);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("not signed in");
  const { error } = await supabase.from("profiles").update({ measurement }).eq("id", user.id);
  if (error) throw new Error(error.message);
  revalidatePath("/", "layout");
}
