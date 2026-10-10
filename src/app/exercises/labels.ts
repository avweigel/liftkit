// enum values like "full_body" read as "Full body". "other" carries no
// information, so callers get null and leave it out.
export function enumLabel(value: string | null | undefined): string | null {
  if (!value || value === "other") return null;
  const text = value.replace(/_/g, " ");
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function formatSet(weight: number | null, reps: number): string {
  return weight && weight > 0 ? `${weight} × ${reps}` : `${reps} reps`;
}

export function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}
