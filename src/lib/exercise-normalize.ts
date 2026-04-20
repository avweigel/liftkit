import { slugify } from "@/lib/fuzzy";
import {
  CANONICAL_LIBRARY,
  type CanonicalExercise,
} from "@/lib/seed/exercise-library";

const ABBREVIATIONS: Array<[RegExp, string]> = [
  [/\bDB\b/gi, "Dumbbell"],
  [/\bBB\b/gi, "Barbell"],
  [/\bKB\b/gi, "Kettlebell"],
  [/\bEZ[-\s]?Bar\b/gi, "EZ-Bar"],
  [/\bRDL\b/gi, "Romanian Deadlift"],
  [/\bDL\b/gi, "Deadlift"],
  [/\bOH\b/gi, "Overhead"],
  [/\bScap\b/gi, "Scapular"],
  [/\bV[-\s]?bar\b/gi, "V-Bar"],
  [/\bP[-\s]?Bar\b/gi, "Parallel Bar"],
];

const SIDE_SUFFIX =
  /\s*(?:\(\s*[lr]\s*\)|-\s*[lr]\b|\s+[lr]$)/i;
const WEIGHT_SUFFIX = /\s*\(\s*\d+[-\d]*\s*#?\s*\)\s*$/;

export function normalizeName(raw: string): string {
  let s = raw.trim();
  s = s.replace(WEIGHT_SUFFIX, "");
  s = s.replace(SIDE_SUFFIX, "");
  for (const [re, to] of ABBREVIATIONS) s = s.replace(re, to);
  s = s.replace(/\s+/g, " ").trim();
  // sentence case most things; lowercase small connectors
  const SMALL = new Set(["of", "the", "and", "to", "with", "a", "on", "in", "or"]);
  s = s
    .split(" ")
    .map((w, i) => {
      const lower = w.toLowerCase();
      if (i > 0 && SMALL.has(lower)) return lower;
      if (w.toUpperCase() === w && w.length <= 3) return w.toUpperCase();
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(" ");
  return s;
}

const ALIAS_MAP = buildAliasMap();

function buildAliasMap(): Map<string, CanonicalExercise> {
  const map = new Map<string, CanonicalExercise>();
  for (const ex of CANONICAL_LIBRARY) {
    const canonical = ex;
    addEntry(map, ex.name, canonical);
    addEntry(map, slugify(ex.name), canonical);
    for (const alias of ex.aliases) {
      addEntry(map, alias, canonical);
      addEntry(map, slugify(alias), canonical);
    }
  }
  return map;
}

function addEntry(
  map: Map<string, CanonicalExercise>,
  key: string,
  value: CanonicalExercise,
) {
  const k = key.toLowerCase().trim();
  if (!k) return;
  if (!map.has(k)) map.set(k, value);
}

export function findCanonical(raw: string): CanonicalExercise | null {
  const candidates = [
    raw,
    raw.trim().toLowerCase(),
    normalizeName(raw),
    normalizeName(raw).toLowerCase(),
    slugify(raw),
    slugify(normalizeName(raw)),
  ];
  for (const c of candidates) {
    const hit = ALIAS_MAP.get(c.toLowerCase().trim());
    if (hit) return hit;
  }
  return null;
}
