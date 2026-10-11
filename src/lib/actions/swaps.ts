"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const swapSchema = z.object({
  sessionId: z.string().uuid(),
  planDayExerciseId: z.string().uuid(),
  exerciseId: z.string().uuid(),
  updatePlan: z.boolean().default(false),
});

const undoSchema = z.object({
  sessionId: z.string().uuid(),
  planDayExerciseId: z.string().uuid(),
});

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("not signed in");
  return supabase;
}

// a swap is for this workout unless you ask to change the plan. a plan
// change needs no swap record: the plan itself now says the new exercise.
export async function swapExercise(input: unknown) {
  const { sessionId, planDayExerciseId, exerciseId, updatePlan } = swapSchema.parse(input);
  const supabase = await requireUser();

  if (updatePlan) {
    const { error } = await supabase
      .from("plan_day_exercises")
      .update({ exercise_id: exerciseId })
      .eq("id", planDayExerciseId);
    if (error) throw new Error(error.message);
    await supabase
      .from("session_swaps")
      .delete()
      .eq("session_id", sessionId)
      .eq("plan_day_exercise_id", planDayExerciseId);
  } else {
    const { error } = await supabase.from("session_swaps").upsert(
      {
        session_id: sessionId,
        plan_day_exercise_id: planDayExerciseId,
        exercise_id: exerciseId,
      },
      { onConflict: "session_id,plan_day_exercise_id" },
    );
    if (error) throw new Error(error.message);
  }
  revalidatePath(`/log/${sessionId}`);
}

export async function undoSwap(input: unknown) {
  const { sessionId, planDayExerciseId } = undoSchema.parse(input);
  const supabase = await requireUser();
  const { error } = await supabase
    .from("session_swaps")
    .delete()
    .eq("session_id", sessionId)
    .eq("plan_day_exercise_id", planDayExerciseId);
  if (error) throw new Error(error.message);
  revalidatePath(`/log/${sessionId}`);
}
