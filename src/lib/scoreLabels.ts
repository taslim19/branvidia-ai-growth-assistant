// Score labels shared by the report page and dashboard cards.

export function scoreLabel(score: number): string {
  if (score >= 80) return "Strong";
  if (score >= 60) return "Good progress";
  if (score >= 40) return "Needs attention";
  return "Critical";
}

export type ScoreTone = "success" | "warning" | "danger";

export function scoreTone(score: number): ScoreTone {
  if (score >= 60) return "success";
  if (score >= 40) return "warning";
  return "danger";
}
