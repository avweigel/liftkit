import Papa from "papaparse";
import {
  planImportRowSchema,
  type PlanImportRow,
  REQUIRED_COLUMNS,
} from "@/lib/schemas/plan-import";
import { similarity, slugify } from "@/lib/fuzzy";

export type ParsedRow = PlanImportRow & { row_index: number };

export type RowError = {
  row_index: number;
  message: string;
};

export function parseCsv(csvText: string): {
  rows: ParsedRow[];
  errors: RowError[];
} {
  const parsed = Papa.parse<Record<string, string>>(csvText.trim(), {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim().toLowerCase().replace(/\s+/g, "_"),
  });

  const headers = parsed.meta.fields ?? [];
  const missing = REQUIRED_COLUMNS.filter((c) => !headers.includes(c));
  if (missing.length > 0) {
    throw new Error(
      `csv is missing required columns: ${missing.join(", ")}. expected: ${REQUIRED_COLUMNS.join(", ")}`,
    );
  }

  const rows: ParsedRow[] = [];
  const errors: RowError[] = [];

  parsed.data.forEach((raw, i) => {
    const result = planImportRowSchema.safeParse(raw);
    if (!result.success) {
      errors.push({
        row_index: i,
        message: result.error.issues
          .map((iss) => `${iss.path.join(".")}: ${iss.message}`)
          .join("; "),
      });
      return;
    }
    rows.push({ ...result.data, row_index: i });
  });

  return { rows, errors };
}

export type ExerciseRef = { id: string; name: string; slug: string };

export type ExerciseMatch = {
  raw_name: string;
  slug: string;
  matched: ExerciseRef | null;
  score: number;
  suggestions: Array<ExerciseRef & { score: number }>;
};

const MATCH_THRESHOLD = 0.8;

export function matchExercises(
  rawNames: string[],
  library: ExerciseRef[],
): Map<string, ExerciseMatch> {
  const out = new Map<string, ExerciseMatch>();
  const uniqueNames = [...new Set(rawNames.map((n) => n.trim()))];

  for (const name of uniqueNames) {
    const slug = slugify(name);
    let best: { ref: ExerciseRef; score: number } | null = null;
    const scored: Array<ExerciseRef & { score: number }> = [];

    for (const ex of library) {
      const s = Math.max(similarity(slug, ex.slug), similarity(name.toLowerCase(), ex.name.toLowerCase()));
      scored.push({ ...ex, score: s });
      if (!best || s > best.score) best = { ref: ex, score: s };
    }

    scored.sort((a, b) => b.score - a.score);
    const top3 = scored.slice(0, 3);

    out.set(name, {
      raw_name: name,
      slug,
      matched: best && best.score >= MATCH_THRESHOLD ? best.ref : null,
      score: best?.score ?? 0,
      suggestions: top3,
    });
  }

  return out;
}

export type PreviewDay = {
  day_number: number;
  name: string | null;
  notes: string | null;
  exercises: Array<{
    row_index: number;
    raw_name: string;
    matched_exercise_id: string | null;
    matched_exercise_name: string | null;
    score: number;
    suggestions: Array<{ id: string; name: string; score: number }>;
    order_index: number;
    prescribed_sets: number;
    prescribed_reps: string;
    prescribed_weight: number | null;
    rest_seconds: number | null;
    notes: string | null;
  }>;
};

export type PreviewWeek = {
  week_number: number;
  name: string | null;
  days: PreviewDay[];
};

export function buildPreview(
  rows: ParsedRow[],
  matches: Map<string, ExerciseMatch>,
  resolutions: Record<string, string | null> = {},
): { weeks: PreviewWeek[]; unmatchedNames: string[] } {
  const weekMap = new Map<number, PreviewWeek>();
  const dayOrder = new Map<string, number>();
  const unmatched = new Set<string>();

  for (const row of rows) {
    let week = weekMap.get(row.week);
    if (!week) {
      week = { week_number: row.week, name: null, days: [] };
      weekMap.set(row.week, week);
    }
    const dayKey = `${row.week}/${row.day}`;
    let day = week.days.find((d) => d.day_number === row.day);
    if (!day) {
      day = {
        day_number: row.day,
        name: row.day_name ?? null,
        notes: null,
        exercises: [],
      };
      week.days.push(day);
      dayOrder.set(dayKey, 0);
    }

    const order = dayOrder.get(dayKey) ?? 0;
    dayOrder.set(dayKey, order + 1);

    const match = matches.get(row.exercise);
    const resolved =
      row.exercise in resolutions ? resolutions[row.exercise] : match?.matched?.id ?? null;

    if (!resolved) unmatched.add(row.exercise);

    day.exercises.push({
      row_index: row.row_index,
      raw_name: row.exercise,
      matched_exercise_id: resolved,
      matched_exercise_name: match?.matched?.name ?? null,
      score: match?.score ?? 0,
      suggestions:
        match?.suggestions.map((s) => ({
          id: s.id,
          name: s.name,
          score: s.score,
        })) ?? [],
      order_index: order,
      prescribed_sets: row.sets,
      prescribed_reps: row.reps,
      prescribed_weight: row.weight ?? null,
      rest_seconds: row.rest_sec ?? null,
      notes: row.notes ?? null,
    });
  }

  const weeks = [...weekMap.values()].sort(
    (a, b) => a.week_number - b.week_number,
  );
  for (const w of weeks) w.days.sort((a, b) => a.day_number - b.day_number);

  return { weeks, unmatchedNames: [...unmatched] };
}
