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

// "8-10" accepts 8, 9 or 10; "12" or "12/side" only accepts 12
export function repsFitTarget(reps: number, target: string): boolean {
  const range = target.match(/(\d+)\s*(?:-|to)\s*(\d+)/);
  if (range) return reps >= Number(range[1]) && reps <= Number(range[2]);
  const n = firstNumber(target);
  return n != null && reps === n;
}
