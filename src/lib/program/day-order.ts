export type DayBlock = "strength" | "core" | "cardio";

export const DEFAULT_ORDER: DayBlock[] = ["strength", "core", "cardio"];

export const BLOCK_NAMES: Record<DayBlock, string> = {
  strength: "Strength",
  core: "Core",
  cardio: "Cardio",
};

export const BLOCK_DETAIL: Partial<Record<DayBlock, string>> = {
  strength: "Warm-up, lift, cooldown",
};

// a saved order missing a block (or with junk in it) still shows all three
export function normalizeOrder(saved: readonly string[] | null | undefined): DayBlock[] {
  const known = (saved ?? []).filter((b): b is DayBlock =>
    (DEFAULT_ORDER as string[]).includes(b),
  );
  const unique = [...new Set(known)];
  return [...unique, ...DEFAULT_ORDER.filter((b) => !unique.includes(b))];
}
