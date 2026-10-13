"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const schema = z.array(z.enum(["strength", "core", "cardio"])).length(3);

export async function setDayOrder(input: unknown) {
  const order = schema.parse(input);
  if (new Set(order).size !== 3) throw new Error("each block once");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("not signed in");
  const { error } = await supabase.from("profiles").update({ day_order: order }).eq("id", user.id);
  if (error) throw new Error(error.message);
  revalidatePath("/");
}
