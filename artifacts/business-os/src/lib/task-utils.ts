import type { TaskRecurrence } from "./domain";

export function nextTaskDueDate(dueDate: string | undefined, recurrence: TaskRecurrence, nowIso: string): string | undefined {
  if (recurrence === "none") return undefined;
  const base = dueDate && /^\d{4}-\d{2}-\d{2}$/.test(dueDate) ? dueDate : nowIso.slice(0, 10);
  const [year, month, day] = base.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day, 12));
  if (recurrence === "daily") date.setUTCDate(date.getUTCDate() + 1);
  if (recurrence === "weekly") date.setUTCDate(date.getUTCDate() + 7);
  if (recurrence === "monthly") {
    const targetMonth = date.getUTCMonth() + 1;
    const lastDay = new Date(Date.UTC(date.getUTCFullYear(), targetMonth + 1, 0)).getUTCDate();
    date.setUTCDate(Math.min(day, lastDay));
    date.setUTCMonth(targetMonth);
  }
  return date.toISOString().slice(0, 10);
}