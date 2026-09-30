export const BUG_CAPS = {High: 4, Medium: 6, Low: 10} as const;
export const AUDIT_MAJOR_TARGET = 1;
export const AUDIT_MINOR_TARGET = 3;

export const TASK_SIZES = [
  { label: "Minor", range: "1–3 pts", max: 3 },
  { label: "Medium", range: "4–7 pts", max: 7 },
  { label: "Major", range: "8–13 pts", max: Infinity },
] as const;

export function taskSize(points: number | null) {
  if (!points) return "Unpointed";
  return TASK_SIZES.find((s) => points <= s.max)!.label;
}
