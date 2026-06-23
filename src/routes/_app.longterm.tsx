import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  useLongTermGoals,
  useCreateLongTermGoal,
  useUpdateLongTermGoal,
  useDeleteLongTermGoal,
  useGoalMilestones,
  useToggleMilestone,
} from "@/lib/intel-data";
import { useCategories } from "@/lib/data";
import { decomposeGoal } from "@/lib/goals.functions";
import { computeForecast } from "@/lib/behavioral";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Sparkles, Loader2, Trash2, Target, ChevronRight, ChevronDown, Check } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/longterm")({
  head: () => ({ meta: [{ title: "Long-term goals — Momentum" }] }),
  component: LongTermPage,
});

function LongTermPage() {
  const { data: goals = [] } = useLongTermGoals();
  const { data: cats = [] } = useCategories();
  const create = useCreateLongTermGoal();

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [target, setTarget] = useState("");
  const [unit, setUnit] = useState("");
  const [date, setDate] = useState("");
  const [cat, setCat] = useState("");

  const submit = () => {
    if (!title.trim()) return toast.error("Title required");
    const targetNum = target ? Number(target) : undefined;
    create.mutate(
      {
        title: title.trim(),
        description: desc.trim() || null,
        category_id: cat || null,
        target_date: date || null,
        target_metric: targetNum ? { target: targetNum, current: 0, unit: unit || "units" } : null,
      },
      {
        onSuccess: () => {
          toast.success("Goal created");
          setOpen(false);
          setTitle(""); setDesc(""); setTarget(""); setUnit(""); setDate(""); setCat("");
        },
        onError: (e: any) => toast.error(e.message),
      },
    );
  };

  return (
    <div className="mx-auto max-w-3xl px-4 pt-6 sm:px-6 sm:pt-10">
      <header className="mb-6 flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">Where you're really going</p>
          <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">Long-term goals</h1>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-full"><Plus className="h-4 w-4" /> New</Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto rounded-2xl">
            <DialogHeader><DialogTitle className="font-display">New long-term goal</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <Label className="text-xs">Title</Label>
                <Input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1" placeholder="e.g. Become AI Engineer" />
              </div>
              <div>
                <Label className="text-xs">Description</Label>
                <Textarea value={desc} onChange={(e) => setDesc(e.target.value)} className="mt-1 min-h-20" placeholder="Context for the AI plan" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Target #</Label>
                  <Input type="number" value={target} onChange={(e) => setTarget(e.target.value)} className="mt-1" placeholder="24" />
                </div>
                <div>
                  <Label className="text-xs">Unit</Label>
                  <Input value={unit} onChange={(e) => setUnit(e.target.value)} className="mt-1" placeholder="books" />
                </div>
              </div>
              <div>
                <Label className="text-xs">Target date</Label>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">Category</Label>
                <select value={cat} onChange={(e) => setCat(e.target.value)} className="mt-1 h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm">
                  <option value="">None</option>
                  {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <Button onClick={submit} disabled={create.isPending} className="w-full">Create</Button>
            </div>
          </DialogContent>
        </Dialog>
      </header>

      {goals.length === 0 ? (
        <div className="card-soft p-8 text-center">
          <Target className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">
            Add your first long-term goal. The AI will break it into months, weeks, and daily actions.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {goals.map((g) => <GoalCard key={g.id} goal={g} />)}
        </div>
      )}
    </div>
  );
}

function GoalCard({ goal }: { goal: any }) {
  const [open, setOpen] = useState(false);
  const update = useUpdateLongTermGoal();
  const del = useDeleteLongTermGoal();
  const decompose = useServerFn(decomposeGoal);
  const { data: milestones = [], refetch } = useGoalMilestones(open ? goal.id : null);
  const toggle = useToggleMilestone();
  const [busy, setBusy] = useState(false);

  const forecast = computeForecast(goal);
  const pct = goal.target_metric?.target
    ? Math.min(100, Math.round(((goal.target_metric.current ?? 0) / goal.target_metric.target) * 100))
    : 0;

  const run = async () => {
    setBusy(true);
    try {
      await decompose({ data: { goal_id: goal.id, title: goal.title, description: goal.description, target_date: goal.target_date } });
      toast.success("Plan drafted");
      refetch();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed");
    } finally {
      setBusy(false);
    }
  };

  const updateProgress = (delta: number) => {
    if (!goal.target_metric) return;
    const cur = (goal.target_metric.current ?? 0) + delta;
    update.mutate({ id: goal.id, patch: { target_metric: { ...goal.target_metric, current: Math.max(0, cur) } } });
  };

  const months = milestones.filter((m) => m.period === "month");

  return (
    <div className="card-soft">
      <button onClick={() => setOpen((v) => !v)} className="flex w-full items-start gap-3 p-4 text-left">
        {open ? <ChevronDown className="mt-0.5 h-4 w-4 text-muted-foreground" /> : <ChevronRight className="mt-0.5 h-4 w-4 text-muted-foreground" />}
        <div className="min-w-0 flex-1">
          <p className="font-display text-base font-semibold tracking-tight">{goal.title}</p>
          {goal.description && <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">{goal.description}</p>}
          {goal.target_metric?.target && (
            <>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {goal.target_metric.current ?? 0} / {goal.target_metric.target} {goal.target_metric.unit ?? ""}
                {goal.target_date && ` · target ${goal.target_date}`}
              </p>
            </>
          )}
          {forecast && (
            <p className="mt-1 text-xs text-primary">Forecast: {forecast.eta} · {forecast.pace}</p>
          )}
        </div>
      </button>

      {open && (
        <div className="border-t border-border p-4">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Button size="sm" onClick={run} disabled={busy} className="rounded-full">
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
              {milestones.length ? "Re-draft plan" : "Draft plan with AI"}
            </Button>
            {goal.target_metric?.target && (
              <>
                <Button size="sm" variant="outline" onClick={() => updateProgress(1)} className="rounded-full">+1</Button>
                <Button size="sm" variant="outline" onClick={() => updateProgress(-1)} className="rounded-full">-1</Button>
              </>
            )}
            <Button size="sm" variant="ghost" onClick={() => { if (confirm("Delete this goal?")) del.mutate(goal.id); }} className="ml-auto rounded-full text-destructive">
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>

          {months.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No plan yet. Tap "Draft plan with AI" to break this into months, weeks, and days.
            </p>
          ) : (
            <ol className="space-y-3">
              {months.map((m, mi) => {
                const weeks = milestones.filter((x) => x.parent_id === m.id && x.period === "week");
                return (
                  <li key={m.id}>
                    <div className="flex items-center gap-2">
                      <span className="grid h-6 w-6 place-items-center rounded-full bg-primary/15 text-[11px] font-semibold text-primary tabular-nums">{mi + 1}</span>
                      <p className="font-display text-sm font-semibold">{m.title}</p>
                    </div>
                    {weeks.length > 0 && (
                      <ul className="ml-3 mt-2 space-y-2 border-l border-border pl-4">
                        {weeks.map((w) => {
                          const days = milestones.filter((x) => x.parent_id === w.id);
                          return (
                            <li key={w.id}>
                              <p className="text-sm font-medium">{w.title}</p>
                              {days.length > 0 && (
                                <ul className="mt-1 space-y-1">
                                  {days.map((d) => (
                                    <li key={d.id} className="flex items-start gap-2 text-xs text-muted-foreground">
                                      <button
                                        onClick={() => toggle.mutate({ id: d.id, status: d.status === "done" ? "pending" : "done" })}
                                        className={`mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded border ${d.status === "done" ? "border-success bg-success text-success-foreground" : "border-border"}`}
                                      >
                                        {d.status === "done" && <Check className="h-3 w-3" strokeWidth={3} />}
                                      </button>
                                      <span className={d.status === "done" ? "line-through" : ""}>{d.title}</span>
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      )}
    </div>
  );
}
