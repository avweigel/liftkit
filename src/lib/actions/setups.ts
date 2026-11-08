"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

// how a machine or station is set for you: seat position, box height, pin
// height. one line per exercise, remembered until you change it.
const schema = z.object({
  exerciseId: z.string().uuid(),
  setup: z.string().trim().max(120),
  sessionId: z.string().uuid().optional(),
});

export async function saveSetup(input: z.input<typeof schema>) {
  const { exerciseId, setup, sessionId } = schema.parse(input);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("not signed in");
  if (setup.length === 0) {
    const { error } = await supabase.from("exercise_setups").delete().eq("user_id", user.id).eq("exercise_id", exerciseId);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase
      .from("exercise_setups")
      .upsert({ user_id: user.id, exercise_id: exerciseId, setup, updated_at: new Date().toISOString() }, { onConflict: "user_id,exercise_id" });
    if (error) throw new Error(error.message);
  }
  if (sessionId) revalidatePath(`/log/${sessionId}`);
}
