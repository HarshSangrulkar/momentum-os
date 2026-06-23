// Deterministic behavioral analytics. Pure functions, no AI.
// AI is used only to narrate the numbers these functions produce.

import { parseISO } from "date-fns";
import { ymd } from "./date-utils";
import { scoreFor, taskActiveOn, type Task, type Log } from "./scoring";

export type DailyLogRow = {
  log_date: string;
  mood: "excellent" | "good" | "average" | "bad" | null;
  energy: "high" | "medium" | "low" | null;
  sleep_hours: number | null;
  productivity_rating: number | null;
};

const DOW = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function avg(arr: number[]): number {
  if (!arr.length) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

export type Discovery = {
  title: string;
  body: string;
  confidence: "low" | "medium" | "high";
  data: Record<string, any>;
};

/** Run a battery of correlations and return discoveries with real numbers. */
export function computeDiscoveries(
  tasks: Task[],
  logs: Log[],
  dailyLogs: DailyLogRow[],
  windowDates: Date[],
): Discovery[] {
  const out: Discovery[] = [];
  const byDate = new Map(dailyLogs.map((d) => [d.log_date, d]));

  // Per-date score
  const dateScores = windowDates.map((d) => {
    const k = ymd(d);
    return { date: k, score: scoreFor(tasks, logs, k), daily: byDate.get(k) };
  });

  // 1. Sleep vs completion
  const withSleep = dateScores.filter((d) => d.daily?.sleep_hours != null && d.score > 0);
  if (withSleep.length >= 6) {
    const high = withSleep.filter((d) => (d.daily!.sleep_hours as number) >= 7);
    const low = withSleep.filter((d) => (d.daily!.sleep_hours as number) < 6);
    if (high.length >= 3 && low.length >= 3) {
      const hiAvg = Math.round(avg(high.map((d) => d.score)));
      const loAvg = Math.round(avg(low.map((d) => d.score)));
      const delta = hiAvg - loAvg;
      if (Math.abs(delta) >= 8) {
        out.push({
          title: "Sleep drives your completion",
          body: `When you sleep ≥ 7h your completion averages ${hiAvg}%. Below 6h it drops to ${loAvg}%.`,
          confidence: high.length + low.length >= 12 ? "high" : "medium",
          data: { hiAvg, loAvg, hiDays: high.length, loDays: low.length },
        });
      }
    }
  }

  // 2. Day-of-week patterns — worst day
  const byDow: Record<number, number[]> = {};
  dateScores.forEach((d) => {
    if (!d.score) return;
    const dow = parseISO(d.date).getDay();
    (byDow[dow] ||= []).push(d.score);
  });
  const dowAvgs = Object.entries(byDow)
    .filter(([, v]) => v.length >= 2)
    .map(([k, v]) => ({ dow: +k, avg: Math.round(avg(v)), n: v.length }));
  if (dowAvgs.length >= 3) {
    dowAvgs.sort((a, b) => a.avg - b.avg);
    const worst = dowAvgs[0];
    const best = dowAvgs[dowAvgs.length - 1];
    if (best.avg - worst.avg >= 15) {
      out.push({
        title: `${DOW[worst.dow]} is your weakest day`,
        body: `Completion averages ${worst.avg}% on ${DOW[worst.dow]} vs ${best.avg}% on ${DOW[best.dow]}.`,
        confidence: worst.n >= 4 ? "high" : "medium",
        data: { worst, best },
      });
    }
  }

  // 3. Mood vs productivity
  const moodScores: Record<string, number[]> = {};
  dateScores.forEach((d) => {
    if (d.daily?.mood && d.score) (moodScores[d.daily.mood] ||= []).push(d.score);
  });
  if (Object.keys(moodScores).length >= 2) {
    const entries = Object.entries(moodScores)
      .filter(([, v]) => v.length >= 2)
      .map(([k, v]) => ({ mood: k, avg: Math.round(avg(v)), n: v.length }));
    if (entries.length >= 2) {
      entries.sort((a, b) => b.avg - a.avg);
      const top = entries[0];
      const bot = entries[entries.length - 1];
      if (top.avg - bot.avg >= 15) {
        out.push({
          title: "Your mood predicts your day",
          body: `On "${top.mood}" days you hit ${top.avg}%. On "${bot.mood}" days only ${bot.avg}%.`,
          confidence: entries.reduce((s, e) => s + e.n, 0) >= 10 ? "high" : "medium",
          data: { entries },
        });
      }
    }
  }

  // 4. Energy vs completion
  const energyScores: Record<string, number[]> = {};
  dateScores.forEach((d) => {
    if (d.daily?.energy && d.score) (energyScores[d.daily.energy] ||= []).push(d.score);
  });
  if (energyScores.high?.length >= 3 && energyScores.low?.length >= 3) {
    const hi = Math.round(avg(energyScores.high));
    const lo = Math.round(avg(energyScores.low));
    if (hi - lo >= 10) {
      out.push({
        title: "High-energy days outperform",
        body: `High-energy days average ${hi}% completion vs ${lo}% on low-energy days.`,
        confidence: energyScores.high.length + energyScores.low.length >= 12 ? "high" : "medium",
        data: { hi, lo },
      });
    }
  }

  // 5. Per-task most-missed
  const taskStats = tasks
    .filter((t) => t.frequency === "daily" && !t.one_off_date)
    .map((t) => {
      const active = windowDates.filter((d) => taskActiveOn(t, ymd(d)));
      if (active.length < 5) return null;
      const done = active.filter((d) => logs.find((l) => l.task_id === t.id && l.log_date === ymd(d) && l.completed)).length;
      const rate = Math.round((done / active.length) * 100);
      return { title: t.title, rate, n: active.length };
    })
    .filter(Boolean) as { title: string; rate: number; n: number }[];

  if (taskStats.length) {
    taskStats.sort((a, b) => a.rate - b.rate);
    const worst = taskStats[0];
    if (worst.rate <= 60) {
      out.push({
        title: `"${worst.title}" is slipping`,
        body: `Only ${worst.rate}% completion over the last ${worst.n} scheduled days. Worth a re-design or smaller version.`,
        confidence: worst.n >= 14 ? "high" : "medium",
        data: { worst, all: taskStats },
      });
    }
  }

  return out;
}

// ---------- REALITY GAP ----------

export type RealityGap = {
  windowStart: string;
  windowEnd: string;
  plannedCount: number;
  actualCount: number;
  plannedWeight: number;
  actualWeight: number;
  accuracy: number; // 0-100
  byTask: { title: string; planned: number; actual: number; weight: number }[];
  mostOverestimated: { title: string; gap: number } | null;
};

export function computeRealityGap(tasks: Task[], logs: Log[], windowDates: Date[]): RealityGap {
  const byTask: Record<string, { title: string; planned: number; actual: number; weight: number }> = {};
  let plannedW = 0;
  let actualW = 0;
  let plannedCount = 0;
  let actualCount = 0;

  for (const t of tasks) {
    if (t.archived || t.one_off_date) continue;
    let planned = 0;
    let actual = 0;
    if (t.frequency === "daily") {
      for (const d of windowDates) {
        const k = ymd(d);
        if (taskActiveOn(t, k)) {
          planned++;
          if (logs.find((l) => l.task_id === t.id && l.log_date === k && l.completed)) actual++;
        }
      }
    } else {
      // weekly task — one planned per ISO week in window
      const weeks = new Set(
        windowDates.map((d) => {
          const wd = new Date(d);
          const day = wd.getDay() || 7;
          wd.setDate(wd.getDate() - (day - 1));
          return ymd(wd);
        }),
      );
      planned = weeks.size;
      actual = [...weeks].filter((wk) => logs.find((l) => l.task_id === t.id && l.log_date === wk && l.completed)).length;
    }
    if (planned === 0) continue;
    byTask[t.id] = { title: t.title, planned, actual, weight: t.weightage };
    plannedCount += planned;
    actualCount += actual;
    plannedW += planned * t.weightage;
    actualW += actual * t.weightage;
  }
  const accuracy = plannedW ? Math.round((actualW / plannedW) * 100) : 0;
  const arr = Object.values(byTask);
  arr.sort((a, b) => (b.planned - b.actual) * b.weight - (a.planned - a.actual) * a.weight);
  const worst = arr[0];
  const mostOverestimated = worst && worst.planned - worst.actual > 0
    ? { title: worst.title, gap: worst.planned - worst.actual }
    : null;

  return {
    windowStart: ymd(windowDates[0]),
    windowEnd: ymd(windowDates[windowDates.length - 1]),
    plannedCount,
    actualCount,
    plannedWeight: plannedW,
    actualWeight: actualW,
    accuracy: Math.min(100, accuracy),
    byTask: arr,
    mostOverestimated,
  };
}

// ---------- FORECASTS ----------

export type Forecast = {
  goal: string;
  pace: string;
  eta: string;
  ratio: number; // current / target
};

/**
 * Linear projection for a goal with a numeric target metric.
 * target_metric: { target: number, current: number, unit?: string, periodDays?: number }
 */
export function computeForecast(
  goal: { title: string; target_metric: any; target_date: string | null; created_at: string },
): Forecast | null {
  const m = goal.target_metric;
  if (!m || typeof m.target !== "number" || typeof m.current !== "number") return null;
  const unit = m.unit || "units";
  if (m.target <= 0) return null;
  const ratio = m.current / m.target;

  const start = new Date(goal.created_at);
  const elapsedDays = Math.max(1, Math.round((Date.now() - start.getTime()) / 86400000));
  const ratePerDay = m.current / elapsedDays;
  if (ratePerDay <= 0) {
    return { goal: goal.title, pace: `0 ${unit}/day`, eta: "no pace yet", ratio: 0 };
  }
  const remaining = m.target - m.current;
  const daysToGoal = Math.round(remaining / ratePerDay);
  const eta = new Date(Date.now() + daysToGoal * 86400000);

  return {
    goal: goal.title,
    pace: `${(ratePerDay * 30).toFixed(1)} ${unit}/month`,
    eta: daysToGoal > 365 * 5
      ? `${Math.round(daysToGoal / 365)} years at current pace`
      : daysToGoal > 365
      ? `${(daysToGoal / 365).toFixed(1)} years (${eta.toLocaleDateString()})`
      : `${daysToGoal} days (${eta.toLocaleDateString()})`,
    ratio,
  };
}
