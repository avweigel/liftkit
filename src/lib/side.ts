export type Side = "L" | "R";

// matches "(L)", "- L", "-R", a trailing " L", and the spelled-out forms.
// a bare letter only counts at the very end, so names like "L-Lateral Raise"
// or "Romanian DL - Single Leg - R" keep their middle intact.
const SIDE_RE =
  /\s*(?:\(\s*(l|r|left|right)\s*\)|-\s*(l|r|left|right)\b|\s+(l|r|left|right)$)/i;

export function splitSide(name: string): { base: string; side: Side | null } {
  const m = name.match(SIDE_RE);
  if (!m) return { base: name.trim(), side: null };
  const token = (m[1] || m[2] || m[3]).toLowerCase();
  const side: Side = token.startsWith("l") ? "L" : "R";
  const at = m.index ?? 0;
  const base = (name.slice(0, at) + name.slice(at + m[0].length))
    .replace(/\s+/g, " ")
    .trim();
  return { base, side };
}

export function sideKey(name: string): string {
  return splitSide(name).base.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

export type SidePartner = {
  // plan row id of the side done first (its weight carries over)
  leaderId: string;
  followerId: string;
};

// pairs left/right rows of the same movement. whichever side is listed first
// in the day leads, since that's the side you pick the weight on.
export function pairSides<T extends { id: string; name: string; order_index: number }>(
  rows: T[],
): Map<string, SidePartner> {
  const sorted = rows.slice().sort((a, b) => a.order_index - b.order_index);
  const open = new Map<string, { id: string; side: Side }>();
  const out = new Map<string, SidePartner>();
  for (const row of sorted) {
    const { side } = splitSide(row.name);
    if (!side) continue;
    const key = sideKey(row.name);
    const waiting = open.get(key);
    if (waiting && waiting.side !== side) {
      const pair = { leaderId: waiting.id, followerId: row.id };
      out.set(waiting.id, pair);
      out.set(row.id, pair);
      open.delete(key);
    } else {
      open.set(key, { id: row.id, side });
    }
  }
  return out;
}
