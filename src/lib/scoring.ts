import { ymd } from "./date-utils";

export type Task = {
  id: string;
  title: string;
  weightage: number;
  frequency: "daily" | "weekly";
  category_id: string | null;
  archived: boolean;
};

export type Log = {
  task_id: string;
  log_date: string; // yyyy-MM-dd
  completed: boolean;
  notes: string | null;
};

export function scoreFor(tasks: Task[], logs: Log[], dateKey: string): number {
  const dayTasks = tasks.filter((t) => !t.archived && t.frequency === "daily");
  if (!dayTasks.length) return 0;
  const total = dayTasks.reduce((s, t) => s + t.weightage, 0);
  const done = dayTasks.reduce((s, t) => {
    const l = logs.find((x) => x.task_id === t.id && x.log_date === dateKey && x.completed);
    return s + (l ? t.weightage : 0);
  }, 0);
  return total ? Math.round((done / total) * 100) : 0;
}

export function rangeScore(tasks: Task[], logs: Log[], dates: Date[]): number {
  if (!dates.length) return 0;
  const scores = dates.map((d) => scoreFor(tasks, logs, ymd(d)));
  return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
}

/** current consecutive days with score >= threshold (default any completion) */
export function currentStreak(tasks: Task[], logs: Log[]): number {
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < 400; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const s = scoreFor(tasks, logs, ymd(d));
    if (s > 0) streak++;
    else if (i === 0) continue; // allow today not yet logged
    else break;
  }
  return streak;
}

export function longestStreak(tasks: Task[], logs: Log[], days = 180): number {
  let best = 0;
  let cur = 0;
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const s = scoreFor(tasks, logs, ymd(d));
    if (s > 0) {
      cur++;
      best = Math.max(best, cur);
    } else cur = 0;
  }
  return best;
}

export function taskStreak(taskId: string, logs: Log[]): number {
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < 400; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const l = logs.find((x) => x.task_id === taskId && x.log_date === ymd(d) && x.completed);
    if (l) streak++;
    else if (i === 0) continue;
    else break;
  }
  return streak;
}
