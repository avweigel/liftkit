export type RepTarget = {
  text: string;
  value: number | null;
  perSet: boolean;
  targets: string[];
};

export function parseRepTargets(prescribed: string): string[] {
  const raw = prescribed.trim();
  if (!raw) return [];
  if (raw.includes(",")) {
    return raw
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean);
  }
  return [raw];
}

export function repTargetForSet(
  prescribed: string,
  setNumber: number,
): RepTarget {
  const targets = parseRepTargets(prescribed);
  if (targets.length === 0) {
    return { text: "", value: null, perSet: false, targets: [] };
  }
  const perSet = targets.length > 1;
  const idx = Math.min(Math.max(0, setNumber - 1), targets.length - 1);
  const text = targets[idx];
  return {
    text,
    value: firstNumber(text),
    perSet,
    targets,
  };
}

export function formatRxReps(prescribed: string): string {
  const targets = parseRepTargets(prescribed);
  if (targets.length === 0) return "";
  if (targets.length === 1) return targets[0];
  return targets.join(" / ");
}

function firstNumber(s: string): number | null {
  const m = s.match(/(\d+)/);
  return m ? Number(m[1]) : null;
}
