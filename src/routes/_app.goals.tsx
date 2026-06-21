import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useTasks, useCategories, useCreateTask, useArchiveTask } from "@/lib/data";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/goals")({
  head: () => ({ meta: [{ title: "Goals — Momentum" }] }),
  component: GoalsPage,
});

function GoalsPage() {
  const { data: tasks = [] } = useTasks();
  const { data: cats = [] } = useCategories();
  const archive = useArchiveTask();

  const daily = tasks.filter((t) => t.frequency === "daily");
  const weekly = tasks.filter((t) => t.frequency === "weekly");

  return (
    <div className="mx-auto max-w-3xl px-4 pt-6 sm:px-6 sm:pt-10">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">Goals</h1>
          <p className="text-sm text-muted-foreground">The habits and weekly targets that build your score.</p>
        </div>
        <NewGoalDialog />
      </div>

      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Daily</h2>
      <ul className="mb-6 space-y-2">
        {daily.length === 0 && <Empty msg="Create your first daily habit — Gym, Steps, Water, anything you can repeat." />}
        {daily.map((t) => {
          const c = cats.find((x) => x.id === t.category_id);
          const time = formatRange(t.start_time, t.end_time);
          return (
            <li key={t.id} className="card-soft flex items-center gap-3 p-3.5">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: c?.color ?? "#888" }} />
              <div className="flex-1">
                <p className="font-medium">{t.title}</p>
                <p className="text-xs text-muted-foreground">
                  {time && <span className="mr-1 font-mono text-foreground/70">{time}</span>}
                  {c?.name ?? "Uncategorized"} · weight {t.weightage}
                </p>
              </div>
              <button
                onClick={() => archive.mutate(t.id, { onError: (e: any) => toast.error(e.message) })}
                className="rounded-lg p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          );
        })}
      </ul>

      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Weekly</h2>
      <ul className="space-y-2">
        {weekly.length === 0 && <Empty msg="Add weekly goals like 'Finish 1 book' or 'Listen to a podcast'." />}
        {weekly.map((t) => {
          const c = cats.find((x) => x.id === t.category_id);
          return (
            <li key={t.id} className="card-soft flex items-center gap-3 p-3.5">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: c?.color ?? "#888" }} />
              <div className="flex-1">
                <p className="font-medium">{t.title}</p>
                <p className="text-xs text-muted-foreground">{c?.name ?? "Uncategorized"} · weight {t.weightage}</p>
              </div>
              <button
                onClick={() => archive.mutate(t.id, { onError: (e: any) => toast.error(e.message) })}
                className="rounded-lg p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Empty({ msg }: { msg: string }) {
  return <li className="card-soft p-6 text-center text-sm text-muted-foreground">{msg}</li>;
}

export function formatRange(start?: string | null, end?: string | null): string {
  const fmt = (t?: string | null) => {
    if (!t) return null;
    const [hStr, mStr] = t.split(":");
    let h = parseInt(hStr, 10);
    const m = parseInt(mStr ?? "0", 10);
    const ap = h >= 12 ? "pm" : "am";
    h = h % 12 || 12;
    return m ? `${h}:${String(m).padStart(2, "0")}${ap}` : `${h}${ap}`;
  };
  const s = fmt(start);
  const e = fmt(end);
  if (s && e) return `${s}–${e}`;
  if (s) return s;
  if (e) return `by ${e}`;
  return "";
}

function NewGoalDialog() {
  const { data: cats = [] } = useCategories();
  const create = useCreateTask();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [weightage, setWeightage] = useState(3);
  const [frequency, setFrequency] = useState<"daily" | "weekly">("daily");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");

  const reset = () => {
    setTitle("");
    setCategoryId("");
    setWeightage(3);
    setFrequency("daily");
    setStartTime("");
    setEndTime("");
  };

  const onCreate = () => {
    if (!title.trim()) return toast.error("Give it a title");
    create.mutate(
      {
        title: title.trim(),
        category_id: categoryId || null,
        weightage,
        frequency,
        start_time: startTime || null,
        end_time: endTime || null,
      },
      {
        onSuccess: () => {
          toast.success("Goal created");
          reset();
          setOpen(false);
        },
        onError: (e: any) => toast.error(e.message),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="rounded-full"><Plus className="h-4 w-4" /> New goal</Button>
      </DialogTrigger>
      <DialogContent className="rounded-2xl">
        <DialogHeader>
          <DialogTitle className="font-display">New goal</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="text-xs">Title</Label>
            <Input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. 10k steps" className="mt-1" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Frequency</Label>
              <Select value={frequency} onValueChange={(v) => setFrequency(v as any)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Category</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
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
          </div>
          {frequency === "daily" && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Start time (optional)</Label>
                <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">End time (optional)</Label>
                <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="mt-1" />
              </div>
            </div>
          )}
          <div>
            <Label className="text-xs">Weightage · {weightage}</Label>
            <Slider value={[weightage]} min={1} max={10} step={1} onValueChange={(v) => setWeightage(v[0])} className="mt-3" />
            <p className="mt-1 text-xs text-muted-foreground">Higher = more impact on your daily score.</p>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={onCreate} disabled={create.isPending}>Create</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
