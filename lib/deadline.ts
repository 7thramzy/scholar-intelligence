export type DeadlineStatus = "unknown" | "closed" | "closing-soon" | "upcoming";

export interface DeadlineEvaluation {
  status: DeadlineStatus;
  daysRemaining: number | null;
}

function parseDateOnly(value: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return date.getTime();
}

export function evaluateDeadline(
  deadline: string,
  today = new Date().toISOString().slice(0, 10),
  closingSoonDays = 30
): DeadlineEvaluation {
  const deadlineTime = parseDateOnly(deadline);
  const todayTime = parseDateOnly(today);
  if (deadlineTime === null || todayTime === null || !Number.isInteger(closingSoonDays) || closingSoonDays < 0) {
    return { status: "unknown", daysRemaining: null };
  }
  const daysRemaining = Math.round((deadlineTime - todayTime) / 86_400_000);
  if (daysRemaining < 0) return { status: "closed", daysRemaining };
  if (daysRemaining <= closingSoonDays) return { status: "closing-soon", daysRemaining };
  return { status: "upcoming", daysRemaining };
}
