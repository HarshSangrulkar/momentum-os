import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useTasks, useLogs, useCategories, useToggleTaskLog, useUpsertNote, useCreateTask } from "@/lib/data";
import { useDailyLogs, useUpsertDailyLog } from "@/lib/intel-data";
import { ymd, lastNDays, weekStart, weekEnd, fmt, addD } from "@/lib/date-utils";
import { scoreFor, rangeScore, currentStreak, taskActiveOn } from "@/lib/scoring";
import { Check, Flame, NotebookPen, Clock, ChevronLeft, ChevronRight, Plus, Smile, Battery, Moon as MoonIcon, Star } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Carousel, CarouselContent, CarouselItem, type CarouselApi } from "@/components/ui/carousel";
import { toast } from "sonner";
import { formatRange } from "./_app.goals";
import { isSameDay } from "date-fns";

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

  // 7-day window centered on today (3 past, today, 3 future)
  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addD(today, i - 3)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [todayKey],
  );
  const todayIndex = 3;

  const { data: tasks = [] } = useTasks();
  const { data: cats = [] } = useCategories();
  // Fetch logs covering carousel + 30d analytics range
  const { data: logs = [] } = useLogs(ymd(last30[0]), ymd(addD(today, 3)));
  const { data: dailyLogs = [] } = useDailyLogs(todayKey, todayKey);
  const todayCheckIn = dailyLogs[0];
  const upsertCheck = useUpsertDailyLog();

  const sortDaily = (list: typeof tasks) =>
    list.slice().sort((a, b) => {
      if (a.start_time && b.start_time) return a.start_time.localeCompare(b.start_time);
      if (a.start_time) return -1;
      if (b.start_time) return 1;
      return 0;
    });

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
  const createTask = useCreateTask();

  const [noteFor, setNoteFor] = useState<{ id: string; title: string; date: string; current: string } | null>(null);
  const [noteDraft, setNoteDraft] = useState("");

  const [activityFor, setActivityFor] = useState<string | null>(null);
  const [activityTitle, setActivityTitle] = useState("");
  const [activityCat, setActivityCat] = useState("");
  const [activityNotes, setActivityNotes] = useState("");

  const [api, setApi] = useState<CarouselApi>();
  const [selected, setSelected] = useState(todayIndex);

  useEffect(() => {
    if (!api) return;
    const onSelect = () => setSelected(api.selectedScrollSnap());
    onSelect();
    api.on("select", onSelect);
    return () => {
      api.off("select", onSelect);
    };
  }, [api]);

  const onToggle = (taskId: string, date: string, current: boolean) => {
    toggle.mutate(
      { task_id: taskId, date, completed: !current },
      { onError: (e: any) => toast.error(e.message) },
    );
  };

  const catFor = (id: string | null) => cats.find((c) => c.id === id);
  const activeDay = days[selected] ?? today;

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

      <CheckInCard
        value={todayCheckIn}
        onChange={(patch) => upsertCheck.mutate({ log_date: todayKey, ...patch })}
      />


      <section className="mb-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Daily habits</h2>
          <div className="flex items-center gap-1">
            <button
              onClick={() => api?.scrollPrev()}
              className="rounded-full p-1.5 text-muted-foreground hover:bg-surface-2 hover:text-foreground disabled:opacity-30"
              disabled={selected === 0}
              aria-label="Previous day"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => api?.scrollTo(todayIndex)}
              className="rounded-full px-2.5 py-1 text-xs text-muted-foreground hover:bg-surface-2 hover:text-foreground"
            >
              Today
            </button>
            <button
              onClick={() => api?.scrollNext()}
              className="rounded-full p-1.5 text-muted-foreground hover:bg-surface-2 hover:text-foreground disabled:opacity-30"
              disabled={selected === days.length - 1}
              aria-label="Next day"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Day dots */}
        <div className="mb-3 flex items-center justify-between gap-1">
          {days.map((d, i) => {
            const isToday = isSameDay(d, today);
            const isActive = i === selected;
            return (
              <button
                key={i}
                onClick={() => api?.scrollTo(i)}
                className={`flex flex-1 flex-col items-center rounded-xl py-2 transition ${
                  isActive ? "bg-primary/10 text-foreground" : "text-muted-foreground hover:bg-surface-2"
                }`}
              >
                <span className="text-[10px] font-medium uppercase tracking-wider">{fmt(d, "EEE")}</span>
                <span className={`mt-0.5 font-display text-base font-semibold tabular-nums ${isToday ? "text-primary" : ""}`}>
                  {fmt(d, "d")}
                </span>
              </button>
            );
          })}
        </div>

        <Carousel opts={{ startIndex: todayIndex, align: "start" }} setApi={setApi}>
          <CarouselContent className="-ml-0">
            {days.map((d) => {
              const dKey = ymd(d);
              const isFuture = d > today && !isSameDay(d, today);
              const isTodayCard = isSameDay(d, today);
              const dayTasks = sortDaily(tasks.filter((t) => taskActiveOn(t, dKey)));
              return (
                <CarouselItem key={dKey} className="basis-full pl-0">
                  <div className="card-soft p-3 sm:p-4">
                    <div className="mb-3 flex items-baseline justify-between">
                      <p className="font-display text-lg font-semibold tracking-tight">
                        {isTodayCard ? "Today" : fmt(d, "EEEE")}
                      </p>
                      <p className="text-xs text-muted-foreground">{fmt(d, "MMM d")}</p>
                    </div>

                    {dayTasks.length === 0 ? (
                      <p className="py-6 text-center text-sm text-muted-foreground">
                        Nothing scheduled for {fmt(d, "EEEE")}.
                      </p>
                    ) : (
                      <ul className="space-y-2">
                        {dayTasks.map((t) => {
                          const log = logs.find((l) => l.task_id === t.id && l.log_date === dKey);
                          const done = !!log?.completed;
                          const cat = catFor(t.category_id);
                          const timeLabel = formatRange(t.start_time, t.end_time);
                          return (
                            <TaskRow
                              key={t.id}
                              title={t.title}
                              weightage={t.weightage}
                              done={done}
                              disabled={isFuture}
                              catColor={cat?.color}
                              catName={cat?.name}
                              timeLabel={timeLabel}
                              isOneOff={!!t.one_off_date}
                              hasNote={!!log?.notes}
                              onToggle={() => !isFuture && onToggle(t.id, dKey, done)}
                              onNote={() => {
                                setNoteFor({ id: t.id, title: t.title, date: dKey, current: log?.notes ?? "" });
                                setNoteDraft(log?.notes ?? "");
                              }}
                            />
                          );
                        })}
                      </ul>
                    )}

                    {!isFuture && (
                      <button
                        onClick={() => setActivityFor(dKey)}
                        className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-border py-2.5 text-xs font-medium text-muted-foreground transition hover:border-primary/60 hover:bg-primary/5 hover:text-primary"
                      >
                        <Plus className="h-3.5 w-3.5" /> Add activity for {isTodayCard ? "today" : fmt(d, "EEE")}
                      </button>
                    )}
                  </div>
                </CarouselItem>
              );
            })}
          </CarouselContent>
        </Carousel>

        <p className="mt-2 text-center text-[11px] text-muted-foreground">
          Swipe across days · viewing {fmt(activeDay, "EEEE, MMM d")}
        </p>
      </section>

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

      <Dialog
        open={!!activityFor}
        onOpenChange={(o) => {
          if (!o) {
            setActivityFor(null);
            setActivityTitle("");
            setActivityCat("");
            setActivityNotes("");
          }
        }}
      >
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-display">
              Log an activity {activityFor && `· ${fmt(new Date(activityFor + "T00:00:00"), "EEE, MMM d")}`}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-xs">What did you do?</Label>
              <Input
                autoFocus
                value={activityTitle}
                onChange={(e) => setActivityTitle(e.target.value)}
                placeholder="e.g. played badminton"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">Category (optional)</Label>
              <Select value={activityCat} onValueChange={setActivityCat}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Choose" /></SelectTrigger>
                <SelectContent>
                  {cats.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      <span className="inline-flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full" style={{ background: c.color }} />{c.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Notes (optional)</Label>
              <Textarea
                value={activityNotes}
                onChange={(e) => setActivityNotes(e.target.value)}
                placeholder="How it went, duration, reps…"
                className="mt-1 min-h-20"
              />
            </div>
            <p className="text-[11px] text-muted-foreground">
              This won't repeat — it'll be recorded just for this day so your AI coach sees it.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setActivityFor(null)}>Cancel</Button>
              <Button
                disabled={createTask.isPending}
                onClick={() => {
                  if (!activityFor) return;
                  if (!activityTitle.trim()) return toast.error("Give it a title");
                  const date = activityFor;
                  createTask.mutate(
                    {
                      title: activityTitle.trim(),
                      category_id: activityCat || null,
                      weightage: 1,
                      frequency: "daily",
                      one_off_date: date,
                      days_of_week: null,
                    },
                    {
                      onSuccess: (res) => {
                        toggle.mutate(
                          { task_id: res.id, date, completed: true, notes: activityNotes || null },
                          {
                            onSuccess: () => {
                              toast.success("Activity recorded");
                              setActivityFor(null);
                              setActivityTitle("");
                              setActivityCat("");
                              setActivityNotes("");
                            },
                            onError: (e: any) => toast.error(e.message),
                          },
                        );
                      },
                      onError: (e: any) => toast.error(e.message),
                    },
                  );
                }}
              >
                Record
              </Button>
            </div>
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
  disabled,
  catColor,
  catName,
  timeLabel,
  isOneOff,
  hasNote,
  onToggle,
  onNote,
}: {
  title: string;
  weightage: number;
  done: boolean;
  disabled?: boolean;
  catColor?: string;
  catName?: string;
  timeLabel?: string;
  isOneOff?: boolean;
  hasNote: boolean;
  onToggle: () => void;
  onNote: () => void;
}) {
  return (
    <li className={`card-soft group flex items-center gap-3 p-3.5 transition ${done ? "bg-success/5 border-success/30" : ""} ${disabled ? "opacity-60" : ""}`}>
      <button
        onClick={onToggle}
        disabled={disabled}
        aria-label={done ? "Mark incomplete" : "Mark complete"}
        className={`grid h-7 w-7 shrink-0 place-items-center rounded-full border-2 transition ${
          done ? "border-success bg-success text-success-foreground" : "border-border hover:border-primary"
        } ${disabled ? "cursor-not-allowed" : ""}`}
      >
        {done ? <Check className="h-4 w-4" strokeWidth={3} /> : null}
      </button>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          {timeLabel && (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-primary/10 px-1.5 py-0.5 font-mono text-[11px] tabular-nums text-primary">
              <Clock className="h-3 w-3" />
              {timeLabel}
            </span>
          )}
          {isOneOff && (
            <span className="shrink-0 rounded-md bg-accent/40 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-accent-foreground">
              Activity
            </span>
          )}
          <p className={`truncate font-medium ${done ? "text-muted-foreground line-through" : ""}`}>{title}</p>
        </div>
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

const MOOD_OPTS: { key: "excellent" | "good" | "average" | "bad"; emoji: string; label: string }[] = [
  { key: "excellent", emoji: "😄", label: "Great" },
  { key: "good", emoji: "🙂", label: "Good" },
  { key: "average", emoji: "😐", label: "Meh" },
  { key: "bad", emoji: "😞", label: "Bad" },
];

const ENERGY_OPTS: { key: "high" | "medium" | "low"; dots: number; label: string }[] = [
  { key: "high", dots: 3, label: "High" },
  { key: "medium", dots: 2, label: "Medium" },
  { key: "low", dots: 1, label: "Low" },
];

function CheckInCard({
  value,
  onChange,
}: {
  value: { mood: any; energy: any; sleep_hours: number | null; productivity_rating: number | null; note: string | null } | undefined;
  onChange: (patch: { mood?: any; energy?: any; sleep_hours?: number | null; productivity_rating?: number | null; note?: string | null }) => void;
}) {
  const [openNote, setOpenNote] = useState(false);
  const [noteDraft, setNoteDraft] = useState(value?.note ?? "");
  useEffect(() => { setNoteDraft(value?.note ?? ""); }, [value?.note]);
  const sleepVal = value?.sleep_hours ?? "";
  const rating = value?.productivity_rating ?? 0;

  return (
    <section className="card-soft mb-6 bg-gradient-to-br from-accent/30 to-transparent p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Daily check-in</p>
        <p className="text-[10px] text-muted-foreground">{value ? "Saved" : "Takes 10 seconds"}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div>
          <div className="mb-1 flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground"><Smile className="h-3 w-3" /> Mood</div>
          <div className="flex gap-1">
            {MOOD_OPTS.map((m) => (
              <button
                key={m.key}
                onClick={() => onChange({ mood: m.key })}
                title={m.label}
                className={`grid h-9 w-9 place-items-center rounded-full text-base transition ${value?.mood === m.key ? "bg-primary text-primary-foreground" : "bg-surface-2 hover:bg-accent"}`}
              >
                {m.emoji}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="mb-1 flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground"><Battery className="h-3 w-3" /> Energy</div>
          <div className="flex gap-1">
            {ENERGY_OPTS.map((e) => (
              <button
                key={e.key}
                onClick={() => onChange({ energy: e.key })}
                title={e.label}
                className={`h-9 flex-1 rounded-full text-[10px] font-medium transition ${value?.energy === e.key ? "bg-primary text-primary-foreground" : "bg-surface-2 hover:bg-accent"}`}
              >
                {e.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="mb-1 flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground"><MoonIcon className="h-3 w-3" /> Sleep (h)</div>
          <input
            type="number"
            step="0.5"
            min={0}
            max={14}
            value={sleepVal}
            onChange={(e) => onChange({ sleep_hours: e.target.value === "" ? null : Number(e.target.value) })}
            placeholder="7.5"
            className="h-9 w-full rounded-full border border-border bg-surface-2 px-3 text-center text-sm outline-none focus:border-primary"
          />
        </div>

        <div>
          <div className="mb-1 flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground"><Star className="h-3 w-3" /> Productivity</div>
          <div className="flex gap-0.5">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                onClick={() => onChange({ productivity_rating: n })}
                aria-label={`${n} stars`}
                className="p-1"
              >
                <Star className={`h-5 w-5 ${rating >= n ? "fill-primary text-primary" : "text-muted-foreground"}`} />
              </button>
            ))}
          </div>
        </div>
      </div>

      <button
        onClick={() => setOpenNote(true)}
        className="mt-3 flex w-full items-center gap-2 rounded-xl border border-dashed border-border px-3 py-2 text-left text-xs text-muted-foreground hover:border-primary/60 hover:text-primary"
      >
        <NotebookPen className="h-3.5 w-3.5" />
        {value?.note ? <span className="truncate">{value.note}</span> : <span>How did today actually feel?</span>}
      </button>

      <Dialog open={openNote} onOpenChange={setOpenNote}>
        <DialogContent className="rounded-2xl">
          <DialogHeader><DialogTitle className="font-display">Today's note</DialogTitle></DialogHeader>
          <Textarea autoFocus value={noteDraft} onChange={(e) => setNoteDraft(e.target.value)} className="min-h-32" placeholder="What's on your mind?" />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setOpenNote(false)}>Cancel</Button>
            <Button onClick={() => { onChange({ note: noteDraft }); setOpenNote(false); toast.success("Saved"); }}>Save</Button>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
