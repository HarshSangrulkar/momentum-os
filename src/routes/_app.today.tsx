import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useTasks, useLogs, useCategories, useToggleTaskLog, useUpsertNote } from "@/lib/data";
import { ymd, lastNDays, weekStart, weekEnd, fmt } from "@/lib/date-utils";
import { scoreFor, rangeScore, currentStreak } from "@/lib/scoring";
import { Check, Flame, NotebookPen, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/today")({
  head: () => ({ meta: [{ title: "Today — Momentum" }] }),
  component: TodayPage,
});

function TodayPage() {
  const today = new Date();
  const todayKey = ymd(today);
  const wkStart = weekStart();
  const wkEnd = weekEnd();
  const last30 = lastNDays(30);

  const { data: tasks = [] } = useTasks();
  const { data: cats = [] } = useCategories();
  const { data: logs = [] } = useLogs(ymd(last30[0]), todayKey);

  const dailyTasks = useMemo(() => tasks.filter((t) => t.frequency === "daily"), [tasks]);
  const weeklyTasks = useMemo(() => tasks.filter((t) => t.frequency === "weekly"), [tasks]);

  const dayScore = scoreFor(tasks, logs, todayKey);
  const weekScoreVal = rangeScore(
    tasks,
    logs,
    Array.from({ length: 7 }, (_, i) => {
      const d = new Date(wkStart);
      d.setDate(wkStart.getDate() + i);
      return d;
    }),
  );
  const monthScore = rangeScore(tasks, logs, last30);
  const streak = currentStreak(tasks, logs);

  const toggle = useToggleTaskLog();
  const upsertNote = useUpsertNote();

  const [noteFor, setNoteFor] = useState<{ id: string; title: string; date: string; current: string } | null>(null);
  const [noteDraft, setNoteDraft] = useState("");

  const onToggle = (taskId: string, date: string, current: boolean) => {
    toggle.mutate(
      { task_id: taskId, date, completed: !current },
      { onError: (e: any) => toast.error(e.message) },
    );
  };

  const catFor = (id: string | null) => cats.find((c) => c.id === id);

  return (
    <div className="mx-auto max-w-3xl px-4 pt-6 sm:px-6 sm:pt-10">
      <header className="mb-6">
        <p className="text-sm text-muted-foreground">{fmt(today, "EEEE, MMMM d")}</p>
        <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
          {greet()}
        </h1>
      </header>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <ScoreCard label="Today" value={dayScore} highlight />
        <ScoreCard label="This week" value={weekScoreVal} />
        <ScoreCard label="30 days" value={monthScore} />
        <StreakCard streak={streak} />
      </div>

      <Section title="Daily habits">
        {dailyTasks.length === 0 ? (
          <EmptyState text="No daily habits yet. Add some from Goals." />
        ) : (
          <ul className="space-y-2">
            {dailyTasks.map((t) => {
              const log = logs.find((l) => l.task_id === t.id && l.log_date === todayKey);
              const done = !!log?.completed;
              const cat = catFor(t.category_id);
              return (
                <TaskRow
                  key={t.id}
                  title={t.title}
                  weightage={t.weightage}
                  done={done}
                  catColor={cat?.color}
                  catName={cat?.name}
                  hasNote={!!log?.notes}
                  onToggle={() => onToggle(t.id, todayKey, done)}
                  onNote={() => {
                    setNoteFor({ id: t.id, title: t.title, date: todayKey, current: log?.notes ?? "" });
                    setNoteDraft(log?.notes ?? "");
                  }}
                />
              );
            })}
          </ul>
        )}
      </Section>

      <Section title={`This week · ${fmt(wkStart, "MMM d")} – ${fmt(wkEnd, "MMM d")}`}>
        {weeklyTasks.length === 0 ? (
          <EmptyState text="No weekly goals yet." />
        ) : (
          <ul className="space-y-2">
            {weeklyTasks.map((t) => {
              const weekKey = ymd(wkStart);
              const log = logs.find((l) => l.task_id === t.id && l.log_date === weekKey);
              const done = !!log?.completed;
              const cat = catFor(t.category_id);
              return (
                <TaskRow
                  key={t.id}
                  title={t.title}
                  weightage={t.weightage}
                  done={done}
                  catColor={cat?.color}
                  catName={cat?.name}
                  hasNote={!!log?.notes}
                  onToggle={() => onToggle(t.id, weekKey, done)}
                  onNote={() => {
                    setNoteFor({ id: t.id, title: t.title, date: weekKey, current: log?.notes ?? "" });
                    setNoteDraft(log?.notes ?? "");
                  }}
                />
              );
            })}
          </ul>
        )}
      </Section>

      <Dialog open={!!noteFor} onOpenChange={(o) => !o && setNoteFor(null)}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-display">{noteFor?.title}</DialogTitle>
          </DialogHeader>
          <Textarea
            autoFocus
            placeholder="Evidence, reps, notes…"
            value={noteDraft}
            onChange={(e) => setNoteDraft(e.target.value)}
            className="min-h-32"
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setNoteFor(null)}>Cancel</Button>
            <Button
              onClick={() => {
                if (!noteFor) return;
                upsertNote.mutate(
                  { task_id: noteFor.id, date: noteFor.date, notes: noteDraft },
                  {
                    onSuccess: () => {
                      toast.success("Note saved");
                      setNoteFor(null);
                    },
                    onError: (e: any) => toast.error(e.message),
                  },
                );
              }}
            >
              Save note
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function greet() {
  const h = new Date().getHours();
  if (h < 5) return "Late night?";
  if (h < 12) return "Good morning.";
  if (h < 17) return "Good afternoon.";
  return "Good evening.";
}

function ScoreCard({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div className={`card-soft p-4 ${highlight ? "bg-gradient-to-br from-primary/10 to-transparent" : ""}`}>
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-3xl font-semibold tabular-nums">{value}%</p>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function StreakCard({ streak }: { streak: number }) {
  return (
    <div className="card-soft p-4">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">Streak</p>
      <div className="mt-1 flex items-baseline gap-1">
        <span className="font-display text-3xl font-semibold tabular-nums">{streak}</span>
        <span className="text-sm text-muted-foreground">days</span>
      </div>
      <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-warning/15 px-2 py-0.5 text-xs text-warning">
        <Flame className="h-3 w-3" /> on fire
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</h2>
      {children}
    </section>
  );
}

function EmptyState({ text }: { text: string }) {
  return <div className="card-soft p-6 text-center text-sm text-muted-foreground">{text}</div>;
}

function TaskRow({
  title,
  weightage,
  done,
  catColor,
  catName,
  hasNote,
  onToggle,
  onNote,
}: {
  title: string;
  weightage: number;
  done: boolean;
  catColor?: string;
  catName?: string;
  hasNote: boolean;
  onToggle: () => void;
  onNote: () => void;
}) {
  return (
    <li className={`card-soft group flex items-center gap-3 p-3.5 transition ${done ? "bg-success/5 border-success/30" : ""}`}>
      <button
        onClick={onToggle}
        aria-label={done ? "Mark incomplete" : "Mark complete"}
        className={`grid h-7 w-7 shrink-0 place-items-center rounded-full border-2 transition ${
          done ? "border-success bg-success text-success-foreground" : "border-border hover:border-primary"
        }`}
      >
        {done ? <Check className="h-4 w-4" strokeWidth={3} /> : null}
      </button>
      <div className="min-w-0 flex-1">
        <p className={`truncate font-medium ${done ? "text-muted-foreground line-through" : ""}`}>{title}</p>
        <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {catName && (
            <span className="inline-flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: catColor }} /> {catName}
            </span>
          )}
          <span>· weight {weightage}</span>
          {hasNote && <span className="inline-flex items-center gap-1 text-primary">· <NotebookPen className="h-3 w-3" /> note</span>}
        </div>
      </div>
      <button onClick={onNote} className="rounded-lg p-2 text-muted-foreground hover:bg-surface-2 hover:text-foreground">
        <NotebookPen className="h-4 w-4" />
      </button>
    </li>
  );
}
