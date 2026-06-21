import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { useTasks, useLogs, useCategories } from "@/lib/data";
import { ymd, lastNDays, fmt } from "@/lib/date-utils";
import { scoreFor, rangeScore, currentStreak, longestStreak } from "@/lib/scoring";
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, PieChart, Pie, Cell, Legend } from "recharts";
import { Flame, Trophy } from "lucide-react";

export const Route = createFileRoute("/_app/analytics")({
  head: () => ({ meta: [{ title: "Analytics — Momentum" }] }),
  component: AnalyticsPage,
});

const HEATMAP_DAYS = 84; // 12 weeks

function AnalyticsPage() {
  const { data: tasks = [] } = useTasks();
  const { data: cats = [] } = useCategories();
  const days90 = useMemo(() => lastNDays(90), []);
  const heatDays = useMemo(() => lastNDays(HEATMAP_DAYS), []);
  const fromKey = ymd(days90[0]);
  const toKey = ymd(new Date());
  const { data: logs = [] } = useLogs(fromKey, toKey);

  const lineData = useMemo(
    () => lastNDays(30).map((d) => ({ date: fmt(d, "MMM d"), score: scoreFor(tasks, logs, ymd(d)) })),
    [tasks, logs],
  );

  const weekData = useMemo(() => {
    // last 8 weeks
    const out: { week: string; score: number }[] = [];
    for (let i = 7; i >= 0; i--) {
      const end = new Date();
      end.setDate(end.getDate() - i * 7);
      const days = Array.from({ length: 7 }, (_, j) => {
        const d = new Date(end);
        d.setDate(end.getDate() - j);
        return d;
      });
      out.push({ week: fmt(end, "MMM d"), score: rangeScore(tasks, logs, days) });
    }
    return out;
  }, [tasks, logs]);

  const catPerf = useMemo(() => {
    return cats.map((c) => {
      const catTasks = tasks.filter((t) => t.category_id === c.id && t.frequency === "daily");
      if (!catTasks.length) return { name: c.name, value: 0, color: c.color };
      const totals = days90.length * catTasks.reduce((s, t) => s + t.weightage, 0);
      const done = days90.reduce((sum, d) => {
        const key = ymd(d);
        return sum + catTasks.reduce((s, t) => {
          const l = logs.find((x) => x.task_id === t.id && x.log_date === key && x.completed);
          return s + (l ? t.weightage : 0);
        }, 0);
      }, 0);
      return { name: c.name, value: totals ? Math.round((done / totals) * 100) : 0, color: c.color };
    }).filter((c) => c.value > 0);
  }, [cats, tasks, logs, days90]);

  const radarData = catPerf.map((c) => ({ category: c.name, score: c.value }));

  const streak = currentStreak(tasks, logs);
  const longest = longestStreak(tasks, logs);

  return (
    <div className="mx-auto max-w-5xl px-4 pt-6 sm:px-6 sm:pt-10">
      <h1 className="font-display text-3xl font-semibold tracking-tight">Analytics</h1>
      <p className="text-sm text-muted-foreground">90-day view of your momentum.</p>

      <div className="mt-6 grid gap-3 sm:grid-cols-4">
        <Stat label="Current streak" value={`${streak} days`} icon={<Flame className="h-4 w-4 text-warning" />} />
        <Stat label="Longest streak" value={`${longest} days`} icon={<Trophy className="h-4 w-4 text-primary" />} />
        <Stat label="Today" value={`${scoreFor(tasks, logs, ymd(new Date()))}%`} />
        <Stat label="30-day avg" value={`${rangeScore(tasks, logs, lastNDays(30))}%`} />
      </div>

      <Card title="Daily completion · last 30 days">
        <div className="h-60">
          <ResponsiveContainer>
            <LineChart data={lineData}>
              <XAxis dataKey="date" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} interval={4} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={28} />
              <Tooltip contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12 }} />
              <Line type="monotone" dataKey="score" stroke="var(--primary)" strokeWidth={2.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card title="Weekly trend · last 8 weeks">
        <div className="h-56">
          <ResponsiveContainer>
            <LineChart data={weekData}>
              <XAxis dataKey="week" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={28} />
              <Tooltip contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12 }} />
              <Line type="monotone" dataKey="score" stroke="var(--chart-2)" strokeWidth={2.5} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card title="Category performance">
          {catPerf.length === 0 ? <Empty /> : (
            <div className="h-64">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={catPerf} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90} paddingAngle={2}>
                    {catPerf.map((c, i) => <Cell key={i} fill={c.color} />)}
                  </Pie>
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Tooltip contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        <Card title="Category balance">
          {radarData.length === 0 ? <Empty /> : (
            <div className="h-64">
              <ResponsiveContainer>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="var(--border)" />
                  <PolarAngleAxis dataKey="category" tick={{ fontSize: 11 }} />
                  <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 10 }} angle={90} />
                  <Radar dataKey="score" stroke="var(--primary)" fill="var(--primary)" fillOpacity={0.35} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
      </div>

      <Card title={`Habit heatmap · last ${HEATMAP_DAYS} days`}>
        <Heatmap days={heatDays} tasks={tasks} logs={logs} />
      </Card>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="card-soft mt-4 p-4 sm:p-5">
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</h2>
      {children}
    </section>
  );
}

function Stat({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="card-soft p-4">
      <div className="mb-1 flex items-center justify-between">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
        {icon}
      </div>
      <p className="font-display text-2xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function Empty() {
  return <div className="grid h-48 place-items-center text-sm text-muted-foreground">Need more data — keep logging.</div>;
}

function Heatmap({ days, tasks, logs }: { days: Date[]; tasks: any[]; logs: any[] }) {
  // 12 weeks × 7 days grid
  const cols: Date[][] = [];
  for (let i = 0; i < days.length; i += 7) cols.push(days.slice(i, i + 7));
  const color = (v: number) => {
    if (v === 0) return "var(--muted)";
    if (v < 30) return "color-mix(in oklab, var(--primary) 25%, var(--muted))";
    if (v < 60) return "color-mix(in oklab, var(--primary) 55%, var(--muted))";
    if (v < 85) return "color-mix(in oklab, var(--primary) 80%, transparent)";
    return "var(--primary)";
  };
  return (
    <div className="flex gap-1 overflow-x-auto pb-1">
      {cols.map((week, i) => (
        <div key={i} className="flex flex-col gap-1">
          {week.map((d) => {
            const s = scoreFor(tasks as any, logs as any, ymd(d));
            return (
              <div
                key={d.toISOString()}
                title={`${fmt(d, "MMM d")} · ${s}%`}
                className="h-4 w-4 rounded"
                style={{ background: color(s) }}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}
