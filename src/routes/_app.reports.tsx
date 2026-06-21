import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useTasks, useLogs, useCategories } from "@/lib/data";
import { ymd, lastNDays, weekStart, weekEnd, monthStart, monthEnd, fmt } from "@/lib/date-utils";
import { scoreFor, rangeScore, currentStreak, longestStreak } from "@/lib/scoring";
import { Button } from "@/components/ui/button";
import { Printer, Trophy, TrendingDown, TrendingUp, Flame } from "lucide-react";

export const Route = createFileRoute("/_app/reports")({
  head: () => ({ meta: [{ title: "Reports — Momentum" }] }),
  component: ReportsPage,
});

function ReportsPage() {
  const [tab, setTab] = useState<"weekly" | "monthly">("weekly");
  const { data: tasks = [] } = useTasks();
  const { data: cats = [] } = useCategories();

  const range = tab === "weekly"
    ? { start: weekStart(), end: weekEnd(), label: `Week of ${fmt(weekStart(), "MMM d, yyyy")}` }
    : { start: monthStart(), end: monthEnd(), label: fmt(monthStart(), "MMMM yyyy") };

  const days = useMemo(() => {
    const arr: Date[] = [];
    const d = new Date(range.start);
    while (d <= range.end) { arr.push(new Date(d)); d.setDate(d.getDate() + 1); }
    return arr;
  }, [range.start, range.end]);

  const { data: logs = [] } = useLogs(ymd(range.start), ymd(range.end));
  const { data: logs90 = [] } = useLogs(ymd(lastNDays(90)[0]), ymd(new Date()));

  const periodScore = rangeScore(tasks, logs, days);
  const streak = currentStreak(tasks, logs90);
  const longest = longestStreak(tasks, logs90);

  const catScores = cats.map((c) => {
    const ct = tasks.filter((t) => t.category_id === c.id && t.frequency === "daily");
    if (!ct.length) return { name: c.name, value: 0 };
    const total = days.length * ct.reduce((s, t) => s + t.weightage, 0);
    const done = days.reduce((sum, d) => {
      const key = ymd(d);
      return sum + ct.reduce((s, t) => {
        const l = logs.find((x) => x.task_id === t.id && x.log_date === key && x.completed);
        return s + (l ? t.weightage : 0);
      }, 0);
    }, 0);
    return { name: c.name, value: total ? Math.round((done / total) * 100) : 0 };
  }).filter((c) => c.value !== 0);

  const sortedCats = [...catScores].sort((a, b) => b.value - a.value);
  const best = sortedCats[0];
  const worst = sortedCats[sortedCats.length - 1];

  const achievements = days
    .map((d) => ({ d, s: scoreFor(tasks, logs, ymd(d)) }))
    .filter((x) => x.s >= 80)
    .map((x) => `${fmt(x.d, "EEE MMM d")} — ${x.s}% completion`);

  const notes = logs.filter((l) => l.notes).slice(-8);

  const suggestions: string[] = [];
  if (worst && worst.value < 40) suggestions.push(`Your ${worst.name} category is at ${worst.value}%. Pick ONE small habit there to focus on this week.`);
  if (periodScore < 50) suggestions.push("Score below 50% — try halving your goal list to rebuild momentum.");
  if (streak === 0) suggestions.push("Streak broken. Complete just one task today to restart it.");
  if (periodScore >= 80) suggestions.push("Strong week. Consider raising the weight on your most important habit.");

  return (
    <div className="mx-auto max-w-3xl px-4 pt-6 sm:px-6 sm:pt-10">
      <div className="no-print mb-6 flex items-center justify-between">
        <h1 className="font-display text-3xl font-semibold tracking-tight">Reports</h1>
        <Button variant="outline" onClick={() => window.print()} className="rounded-full">
          <Printer className="h-4 w-4" /> Save as PDF
        </Button>
      </div>

      <div className="no-print mb-6 inline-flex rounded-full border border-border bg-surface p-1">
        {(["weekly", "monthly"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium capitalize transition ${tab === t ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="card-soft p-6 sm:p-8">
        <p className="text-sm text-muted-foreground">{tab === "weekly" ? "Weekly review" : "Monthly report"}</p>
        <h2 className="font-display text-2xl font-semibold tracking-tight">{range.label}</h2>

        <div className="my-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Big label="Completion" value={`${periodScore}%`} />
          <Big label="Current streak" value={`${streak}d`} icon={<Flame className="h-4 w-4 text-warning" />} />
          <Big label="Longest streak" value={`${longest}d`} icon={<Trophy className="h-4 w-4 text-primary" />} />
          <Big label="Days tracked" value={`${days.length}`} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {best && (
            <Block icon={<TrendingUp className="h-4 w-4 text-success" />} title="Best category">
              <p className="text-lg font-semibold">{best.name}</p>
              <p className="text-sm text-muted-foreground">{best.value}% completion</p>
            </Block>
          )}
          {worst && worst.value < (best?.value ?? 100) && (
            <Block icon={<TrendingDown className="h-4 w-4 text-destructive" />} title="Needs attention">
              <p className="text-lg font-semibold">{worst.name}</p>
              <p className="text-sm text-muted-foreground">{worst.value}% completion</p>
            </Block>
          )}
        </div>

        <Heading>Category breakdown</Heading>
        <ul className="space-y-2">
          {catScores.map((c) => (
            <li key={c.name} className="flex items-center gap-3">
              <span className="w-32 shrink-0 text-sm">{c.name}</span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary" style={{ width: `${c.value}%` }} />
              </div>
              <span className="w-12 text-right text-sm tabular-nums">{c.value}%</span>
            </li>
          ))}
        </ul>

        <Heading>Key achievements</Heading>
        {achievements.length === 0 ? (
          <p className="text-sm text-muted-foreground">No 80%+ days yet. Aim for one this week.</p>
        ) : (
          <ul className="space-y-1 text-sm">{achievements.map((a) => <li key={a}>✓ {a}</li>)}</ul>
        )}

        {notes.length > 0 && (
          <>
            <Heading>Recent notes</Heading>
            <ul className="space-y-2">
              {notes.map((n) => {
                const t = tasks.find((x) => x.id === n.task_id);
                return (
                  <li key={`${n.task_id}-${n.log_date}`} className="rounded-lg border border-border bg-surface-2 p-3 text-sm">
                    <p className="text-xs text-muted-foreground">{fmt(new Date(n.log_date), "MMM d")} · {t?.title}</p>
                    <p className="mt-0.5">{n.notes}</p>
                  </li>
                );
              })}
            </ul>
          </>
        )}

        {suggestions.length > 0 && (
          <>
            <Heading>Suggestions</Heading>
            <ul className="space-y-1 text-sm">{suggestions.map((s) => <li key={s}>→ {s}</li>)}</ul>
          </>
        )}
      </div>
    </div>
  );
}

function Heading({ children }: { children: React.ReactNode }) {
  return <h3 className="mt-6 mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{children}</h3>;
}
function Big({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-surface-2 p-3">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{label}</span>{icon}
      </div>
      <p className="mt-1 font-display text-xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}
function Block({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-surface-2 p-4">
      <div className="mb-1 flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">{icon}{title}</div>
      {children}
    </div>
  );
}
