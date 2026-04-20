import { z } from "zod";

const upperLetter = z.preprocess(
  (v) => {
    if (typeof v !== "string") return v;
    const t = v.trim();
    return t.length === 0 ? null : t.toUpperCase();
  },
  z.string().max(4).nullable(),
);

export const sessionExtraInputSchema = z.object({
  exercise_id: z.string().uuid(),
  superset_code: upperLetter.optional().default(null),
  prescribed_sets: z.number().int().positive().max(50).default(3),
  prescribed_reps: z.string().trim().min(1).max(50).default("8-12"),
  prescribed_weight: z.number().finite().nonnegative().nullable().optional(),
  rest_seconds: z.number().int().nonnegative().max(3600).nullable().optional(),
  notes: z.string().trim().max(500).nullable().optional(),
});

export type SessionExtraInput = z.infer<typeof sessionExtraInputSchema>;

export const sessionExtraPatchSchema = sessionExtraInputSchema.partial();
export type SessionExtraPatch = z.infer<typeof sessionExtraPatchSchema>;
