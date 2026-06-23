import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useTasks, useLogs, useCategories } from "@/lib/data";
import { useDailyLogs, useLongTermGoals, useInsights, useDismissInsight } from "@/lib/intel-data";
import { ymd, lastNDays, weekStart, weekEnd, fmt } from "@/lib/date-utils";
import { scoreFor, rangeScore, currentStreak } from "@/lib/scoring";
import { computeForecast } from "@/lib/behavioral";
import { Carousel, CarouselContent, CarouselItem, type CarouselApi } from "@/components/ui/carousel";
import { Sparkles, Flame, Target, TrendingUp, ArrowRight, X, Calendar, FlaskConical, Lightbulb } from "lucide-react";

export const Route = createFileRoute("/_app/dashboard")({
  head: () => ({ meta: [{ title: "Home — Momentum" }] }),
  component: DashboardPage,
});

function DashboardPage() {
  const today = new Date();
  const todayKey = ymd(today);
  const last7 = lastNDays(7);
  const last30 = lastNDays(30);
  const wkStart = weekStart();
  const wkEnd = weekEnd();

  const { data: tasks = [] } = useTasks();
  const { data: cats = [] } = useCategories();
  const { data: logs = [] } = useLogs(ymd(last30[0]), todayKey);
  const { data: dailyLogs = [] } = useDailyLogs(ymd(last30[0]), todayKey);
  const { data: goals = [] } = useLongTermGoals();
  const { data: insights = [] } = useInsights();
  const dismiss = useDismissInsight();

  const dayScore = scoreFor(tasks, logs, todayKey);
  const weekScoreVal = rangeScore(tasks, logs, last7);
  const streak = currentStreak(tasks, logs);

  const topInsight = insights[0];
  const todayCheck = dailyLogs.find((d) => d.log_date === todayKey);

  const sparkline = useMemo(() => last7.map((d) => scoreFor(tasks, logs, ymd(d))), [tasks, logs, last7]);

  const activeGoals = goals.filter((g) => g.status === "active");
  const topGoal = activeGoals[0];
  const forecasts = activeGoals.map((g) => computeForecast(g)).filter(Boolean);

  return (
    <div className="mx-auto max-w-3xl px-4 pt-6 sm:px-6 sm:pt-10">
      <header className="mb-6 flex items-baseline justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{fmt(today, "EEEE, MMMM d")}</p>
          <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">Your life, at a glance.</h1>
        </div>
      </header>

      {/* Top score row */}
      <div className="mb-4 grid grid-cols-3 gap-3">
        <div className="card-soft bg-gradient-to-br from-primary/15 via-primary/5 to-transparent p-4">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Today</p>
          <p className="mt-1 font-display text-4xl font-semibold tabular-nums">{dayScore}%</p>
          <Link to="/today" className="mt-2 inline-flex items-center gap-1 text-xs text-primary">Open <ArrowRight className="h-3 w-3" /></Link>
        </div>
        <div className="card-soft p-4">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Streak</p>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="font-display text-4xl font-semibold tabular-nums">{streak}</span>
            <span className="text-xs text-muted-foreground">d</span>
          </div>
          <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-warning/15 px-2 py-0.5 text-[10px] text-warning"><Flame className="h-3 w-3" /> alive</div>
        </div>
        <div className="card-soft p-4">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Week</p>
          <p className="mt-1 font-display text-4xl font-semibold tabular-nums">{weekScoreVal}%</p>
          <Sparkline values={sparkline} className="mt-1 h-6 w-full text-primary" />
        </div>
      </div>

      {/* AI Insight of the day */}
      <section className="card-soft mb-4 overflow-hidden p-0">
        <div className="flex items-start gap-3 bg-gradient-to-br from-accent/40 to-transparent p-4">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary/15">
            <Lightbulb className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Insight of the day</p>
            {topInsight ? (
              <>
                <p className="mt-1 font-display text-base font-semibold tracking-tight">{topInsight.title}</p>
                <p className="mt-1 line-clamp-3 text-sm text-muted-foreground">{topInsight.body}</p>
                <Link to="/lab" className="mt-2 inline-flex items-center gap-1 text-xs text-primary">See all insights <ArrowRight className="h-3 w-3" /></Link>
              </>
            ) : (
              <>
                <p className="mt-1 text-sm text-muted-foreground">No discoveries yet. Log a few daily check-ins, then generate insights in the Performance Lab.</p>
                <Link to="/lab" className="mt-2 inline-flex items-center gap-1 text-xs text-primary"><FlaskConical className="h-3 w-3" /> Open Lab</Link>
              </>
            )}
          </div>
          {topInsight && (
            <button
              aria-label="Dismiss"
              onClick={() => dismiss.mutate(topInsight.id)}
              className="rounded-lg p-1.5 text-muted-foreground hover:bg-surface-2"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </section>

      {/* Today check-in prompt */}
      {!todayCheck && (
        <Link to="/today" className="card-soft mb-4 flex items-center justify-between p-4 hover:bg-surface-2">
          <div>
            <p className="font-display text-sm font-semibold">Daily check-in pending</p>
            <p className="text-xs text-muted-foreground">Mood · energy · sleep — 10 seconds, big payoff for your AI coach.</p>
          </div>
          <ArrowRight className="h-5 w-5 text-primary" />
        </Link>
      )}

      {/* Top long-term goal */}
      <section className="mb-4">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Long-term focus</h2>
          <Link to="/longterm" className="text-xs text-primary">Manage</Link>
        </div>
        {topGoal ? (
          <Link to="/longterm" className="card-soft block p-4 hover:bg-surface-2">
            <div className="flex items-center gap-3">
              <Target className="h-5 w-5 text-primary" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-display text-base font-semibold">{topGoal.title}</p>
                {topGoal.target_metric?.target ? (
                  <>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${Math.min(100, Math.round(((topGoal.target_metric.current ?? 0) / (topGoal.target_metric.target as number)) * 100))}%` }}
                      />
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {topGoal.target_metric.current ?? 0} / {topGoal.target_metric.target} {topGoal.target_metric.unit ?? ""}
                    </p>
                  </>
                ) : (
                  <p className="text-xs text-muted-foreground">No target metric set</p>
                )}
              </div>
            </div>
          </Link>
        ) : (
          <Link to="/longterm" className="card-soft flex items-center justify-between p-4 text-sm text-muted-foreground hover:bg-surface-2">
            <span>Define a long-term goal so the AI can break it into a real plan.</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        )}
      </section>

      {/* Forecasts */}
      {forecasts.length > 0 && (
        <section className="mb-4">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Future-self forecast</h2>
          <div className="space-y-2">
            {forecasts.slice(0, 3).map((f, i) => (
              <div key={i} className="card-soft flex items-center gap-3 p-3.5">
                <TrendingUp className="h-4 w-4 text-primary" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{f!.goal}</p>
                  <p className="text-xs text-muted-foreground">Pace: {f!.pace} · ETA: {f!.eta}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Quick-jump tiles */}
      <section className="mb-8 grid grid-cols-2 gap-3">
        <Link to="/today" className="card-soft flex flex-col gap-2 p-4 hover:bg-surface-2">
          <Calendar className="h-5 w-5 text-primary" />
          <span className="font-display text-sm font-semibold">Today's habits</span>
          <span className="text-xs text-muted-foreground">Check off · note · log activity</span>
        </Link>
        <Link to="/lab" className="card-soft flex flex-col gap-2 p-4 hover:bg-surface-2">
          <FlaskConical className="h-5 w-5 text-primary" />
          <span className="font-display text-sm font-semibold">Performance Lab</span>
          <span className="text-xs text-muted-foreground">Discoveries · reality gap · experiments</span>
        </Link>
        <Link to="/coach" className="card-soft flex flex-col gap-2 p-4 hover:bg-surface-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <span className="font-display text-sm font-semibold">AI Coach</span>
          <span className="text-xs text-muted-foreground">Honest, contextual, accountable</span>
        </Link>
        <Link to="/reports" className="card-soft flex flex-col gap-2 p-4 hover:bg-surface-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          <span className="font-display text-sm font-semibold">Reports</span>
          <span className="text-xs text-muted-foreground">Weekly · monthly · printable</span>
        </Link>
      </section>

      {/* Notifications inbox */}
      {insights.filter((i) => i.kind === "notification").length > 0 && (
        <section className="mb-8">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Smart nudges</h2>
          <ul className="space-y-2">
            {insights.filter((i) => i.kind === "notification").slice(0, 5).map((n) => (
              <li key={n.id} className="card-soft p-3 text-sm">{n.body}</li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function Sparkline({ values, className }: { values: number[]; className?: string }) {
  if (!values.length) return null;
  const w = 100;
  const h = 30;
  const max = Math.max(100, ...values);
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * w},${h - (v / max) * h}`).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className={className} preserveAspectRatio="none">
      <polyline points={pts} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
