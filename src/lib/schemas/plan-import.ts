import { z } from "zod";

const trimmed = z.preprocess(
  (v) => (typeof v === "string" ? v.trim() : v),
  z.string(),
);

const optTrimmed = z.preprocess(
  (v) => {
    if (typeof v !== "string") return v;
    const t = v.trim();
    return t.length === 0 ? undefined : t;
  },
  z.string().optional(),
);

const posInt = z.preprocess(
  (v) => (typeof v === "string" ? Number(v.trim()) : v),
  z.number().int().positive(),
);

const optPosInt = z.preprocess(
  (v) => {
    if (typeof v !== "string") return v;
    const t = v.trim();
    return t.length === 0 ? undefined : Number(t);
  },
  z.number().int().positive().optional(),
);

const optNumber = z.preprocess(
  (v) => {
    if (typeof v !== "string") return v;
    const t = v.trim();
    if (t.length === 0) return undefined;
    const n = Number(t);
    return Number.isFinite(n) ? n : undefined;
  },
  z.number().optional(),
);

export const planImportRowSchema = z.object({
  week: posInt,
  day: posInt,
  day_name: optTrimmed,
  exercise: trimmed.refine((s) => s.length > 0, "exercise is required"),
  sets: posInt,
  reps: trimmed.refine((s) => s.length > 0, "reps is required"),
  weight: optNumber,
  rest_sec: optPosInt,
  notes: optTrimmed,
});

export type PlanImportRow = z.infer<typeof planImportRowSchema>;

export const planImportRequestSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "plan name is required")
      .max(120, "plan name too long"),
    sourceUrl: z.string().trim().optional(),
    csvText: z.string().optional(),
    mode: z.enum(["preview", "commit"]).default("preview"),
    exerciseResolutions: z
      .record(z.string(), z.string().nullable())
      .optional(),
  })
  .refine(
    (v) => (v.sourceUrl && v.sourceUrl.length > 0) || !!v.csvText,
    { message: "provide either a sheet url or pasted csv", path: ["sourceUrl"] },
  );

export type PlanImportRequest = z.infer<typeof planImportRequestSchema>;

export const REQUIRED_COLUMNS = [
  "week",
  "day",
  "day_name",
  "exercise",
  "sets",
  "reps",
  "weight",
  "rest_sec",
  "notes",
] as const;
