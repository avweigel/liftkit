const DAY_ALIASES: Record<string, string> = {
  // chest/triceps
  "c/t": "Chest & Triceps",
  "ct": "Chest & Triceps",
  // back/biceps
  "b/b": "Back & Biceps",
  "bb": "Back & Biceps",
  // hamstrings/glutes
  "h/g": "Hamstrings & Glutes",
  "hg": "Hamstrings & Glutes",
  // shoulders/triceps
  "s/t": "Shoulders & Triceps",
  "st": "Shoulders & Triceps",
  // shoulders/arms
  "s/a": "Shoulders & Arms",
  "sa": "Shoulders & Arms",
  // quads/glutes
  "q/g": "Quads & Glutes",
  "qg": "Quads & Glutes",
  // chest/back (phase 3 mixed split)
  "c/b": "Chest & Back",
  "cb": "Chest & Back",
  // phase 11 ian-king-style
  "h": "Horizontal",
  "v": "Vertical",
  "a": "Arms",
  "m": "Metcon",
};

const NUMBERED = /^(L|Leg|Push|Pull|Upper|Lower|Full|Metcon)\s*(\d+)$/i;

const NUMBERED_MAP: Record<string, string> = {
  l: "Leg",
  leg: "Leg",
  push: "Push",
  pull: "Pull",
  upper: "Upper",
  lower: "Lower",
  full: "Full",
  metcon: "Metcon",
};

export function normalizeDayName(raw: string): string {
  const trimmed = raw.trim().replace(/\s+/g, " ");
  if (!trimmed) return trimmed;

  const normalizedSlash = trimmed.replace(/\s*\/\s*/g, "/");

  // "<abbrev> <number>" e.g. "C/B 1" → "Chest & Back 1"
  const abbrevNumbered = normalizedSlash.match(/^([A-Za-z]+(?:\/[A-Za-z]+)?)\s+(\d+)$/);
  if (abbrevNumbered) {
    const key = abbrevNumbered[1].toLowerCase();
    const expanded = DAY_ALIASES[key];
    if (expanded) return `${expanded} ${abbrevNumbered[2]}`;
  }

  // Plain abbreviation
  const key = normalizedSlash.toLowerCase().replace(/\s+/g, "");
  const spaced = trimmed.toLowerCase().replace(/\s+/g, " ");
  if (DAY_ALIASES[key]) return DAY_ALIASES[key];
  if (DAY_ALIASES[spaced]) return DAY_ALIASES[spaced];

  // numbered patterns like "L 1", "Leg 2", "Push 1", "Metcon 2"
  const numbered = trimmed.match(NUMBERED);
  if (numbered) {
    const base = NUMBERED_MAP[numbered[1].toLowerCase()];
    if (base) return `${base} ${numbered[2]}`;
  }

  return trimmed;
}
