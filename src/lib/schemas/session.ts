import { z } from "zod";

export const setInputSchema = z.object({
  exercise_id: z.string().uuid(),
  set_number: z.number().int().positive(),
  weight: z.number().finite().nonnegative().nullable().optional(),
  reps: z.number().int().nonnegative(),
  rpe: z.number().min(1).max(10).nullable().optional(),
  is_warmup: z.boolean().default(false),
  notes: z.string().trim().max(500).nullable().optional(),
});

export type SetInput = z.infer<typeof setInputSchema>;

export const planDayExerciseInputSchema = z.object({
  prescribed_sets: z.number().int().positive().max(50),
  prescribed_reps: z.string().trim().min(1).max(50),
  prescribed_weight: z.number().finite().nonnegative().nullable().optional(),
  rest_seconds: z.number().int().nonnegative().max(3600).nullable().optional(),
  notes: z.string().trim().max(500).nullable().optional(),
});

export type PlanDayExerciseInput = z.infer<typeof planDayExerciseInputSchema>;
