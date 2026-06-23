import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useInsights, useDismissInsight, useExperiments, useCreateExperiment, useDeleteExperiment } from "@/lib/intel-data";
import { generateDiscoveries, generateRealityGap } from "@/lib/intelligence.functions";
import { concludeExperiment } from "@/lib/experiments.functions";
import { Sparkles, Lightbulb, TrendingDown, FlaskConical, Plus, Loader2, X, CheckCheck, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ymd } from "@/lib/date-utils";

export const Route = createFileRoute("/_app/lab")({
  head: () => ({ meta: [{ title: "Performance Lab — Momentum" }] }),
  component: LabPage,
});

const EXPERIMENT_TEMPLATES = [
  { title: "10k steps for 30 days", hypothesis: "Will improve my energy and mood.", days: 30 },
  { title: "No social media for 14 days", hypothesis: "Will improve productivity and focus.", days: 14 },
  { title: "Sleep 8h for 21 days", hypothesis: "Will improve completion and energy.", days: 21 },
  { title: "Morning meditation for 30 days", hypothesis: "Will reduce stress and improve mood.", days: 30 },
  { title: "High protein diet for 21 days", hypothesis: "Will improve energy and recovery.", days: 21 },
];

function LabPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 pt-6 sm:px-6 sm:pt-10">
      <header className="mb-6">
        <p className="text-sm text-muted-foreground">Behavioral intelligence</p>
        <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">Performance Lab</h1>
        <p className="mt-2 text-sm text-muted-foreground">Discoveries from your real data. No vibes — just numbers.</p>
      </header>

      <Tabs defaultValue="discoveries">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="discoveries"><Lightbulb className="mr-1 h-3.5 w-3.5" /> Discoveries</TabsTrigger>
          <TabsTrigger value="gap"><TrendingDown className="mr-1 h-3.5 w-3.5" /> Reality gap</TabsTrigger>
          <TabsTrigger value="experiments"><FlaskConical className="mr-1 h-3.5 w-3.5" /> Experiments</TabsTrigger>
        </TabsList>

        <TabsContent value="discoveries" className="mt-4">
          <DiscoveriesTab />
        </TabsContent>
        <TabsContent value="gap" className="mt-4">
          <RealityGapTab />
        </TabsContent>
        <TabsContent value="experiments" className="mt-4">
          <ExperimentsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function DiscoveriesTab() {
  const { data: insights = [], refetch } = useInsights("discovery");
  const dismiss = useDismissInsight();
  const gen = useServerFn(generateDiscoveries);
  const [busy, setBusy] = useState(false);

  const run = async () => {
    setBusy(true);
    try {
      const res: any = await gen();
      if (res?.message) toast.message(res.message);
      else toast.success(`Found ${res.count} discoveries`);
      refetch();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <Button onClick={run} disabled={busy} className="w-full rounded-full">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
        {busy ? "Analyzing your last 60 days…" : "Generate discoveries"}
      </Button>

      <div className="mt-4 space-y-3">
        {insights.length === 0 && (
          <div className="card-soft p-6 text-center text-sm text-muted-foreground">
            No discoveries yet. Tap above once you've logged a few daily check-ins and task completions.
          </div>
        )}
        {insights.map((d) => (
          <div key={d.id} className="card-soft p-4">
            <div className="flex items-start gap-3">
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary/15">
                <Lightbulb className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-display text-base font-semibold tracking-tight">{d.title}</p>
                  <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    {d.confidence ?? "low"} confidence
                  </span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{d.body}</p>
              </div>
              <button
                onClick={() => dismiss.mutate(d.id)}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-surface-2"
                aria-label="Dismiss"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function RealityGapTab() {
  const compute = useServerFn(generateRealityGap);
  const [result, setResult] = useState<{ gap: any; narrative: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [days, setDays] = useState(7);

  const run = async () => {
    setBusy(true);
    try {
      const r = await compute({ data: { days } });
      setResult(r as any);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div className="card-soft flex items-center gap-2 p-3">
        <Label className="text-xs">Window</Label>
        <select
          value={days}
          onChange={(e) => setDays(+e.target.value)}
          className="rounded-md border border-input bg-transparent px-2 py-1 text-sm"
        >
          <option value={7}>7 days</option>
          <option value={14}>14 days</option>
          <option value={30}>30 days</option>
        </select>
        <Button onClick={run} disabled={busy} size="sm" className="ml-auto rounded-full">
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Compute"}
        </Button>
      </div>

      {result && (
        <div className="mt-4 space-y-3">
          <div className="card-soft bg-gradient-to-br from-primary/10 to-transparent p-4">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Planning accuracy</p>
            <p className="mt-1 font-display text-5xl font-semibold tabular-nums">{result.gap.accuracy}%</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Planned {result.gap.plannedCount} task-occurrences, completed {result.gap.actualCount}.
            </p>
          </div>
          {result.narrative && (
            <div className="card-soft p-4 text-sm leading-relaxed">{result.narrative}</div>
          )}
          {result.gap.byTask.length > 0 && (
            <div className="card-soft p-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Per task</p>
              <ul className="space-y-2">
                {result.gap.byTask.map((t: any, i: number) => {
                  const pct = t.planned ? Math.round((t.actual / t.planned) * 100) : 0;
                  return (
                    <li key={i}>
                      <div className="flex items-baseline justify-between text-sm">
                        <span className="truncate font-medium">{t.title}</span>
                        <span className="tabular-nums text-muted-foreground">{t.actual}/{t.planned} · {pct}%</span>
                      </div>
                      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                        <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ExperimentsTab() {
  const { data: experiments = [] } = useExperiments();
  const create = useCreateExperiment();
  const del = useDeleteExperiment();
  const conclude = useServerFn(concludeExperiment);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [hypothesis, setHypothesis] = useState("");
  const [days, setDays] = useState(30);
  const [concludingId, setConcludingId] = useState<string | null>(null);

  const useTemplate = (t: typeof EXPERIMENT_TEMPLATES[number]) => {
    setTitle(t.title);
    setHypothesis(t.hypothesis);
    setDays(t.days);
  };

  const submit = () => {
    if (!title.trim()) return toast.error("Give it a title");
    const start = new Date();
    const end = new Date(Date.now() + days * 86400000);
    create.mutate(
      {
        title: title.trim(),
        hypothesis: hypothesis.trim() || null,
        start_date: ymd(start),
        end_date: ymd(end),
        tracked_metrics: ["mood", "energy", "sleep_hours", "productivity_rating"],
      },
      {
        onSuccess: () => {
          toast.success("Experiment started");
          setOpen(false);
          setTitle("");
          setHypothesis("");
          setDays(30);
        },
        onError: (e: any) => toast.error(e.message),
      },
    );
  };

  const finish = async (id: string) => {
    setConcludingId(id);
    try {
      await conclude({ data: { experiment_id: id } });
      toast.success("Verdict ready");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed");
    } finally {
      setConcludingId(null);
    }
  };

  return (
    <div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button className="w-full rounded-full"><Plus className="h-4 w-4" /> New experiment</Button>
        </DialogTrigger>
        <DialogContent className="max-h-[90vh] overflow-y-auto rounded-2xl">
          <DialogHeader><DialogTitle className="font-display">Run an experiment</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {EXPERIMENT_TEMPLATES.map((t) => (
                <button
                  key={t.title}
                  onClick={() => useTemplate(t)}
                  className="rounded-full border border-border bg-surface-2 px-3 py-1.5 text-xs hover:bg-accent"
                >
                  {t.title}
                </button>
              ))}
            </div>
            <div>
              <Label className="text-xs">Title</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Hypothesis</Label>
              <Textarea value={hypothesis} onChange={(e) => setHypothesis(e.target.value)} className="mt-1 min-h-20" placeholder="What do you expect to happen?" />
            </div>
            <div>
              <Label className="text-xs">Duration (days)</Label>
              <Input type="number" min={3} max={120} value={days} onChange={(e) => setDays(+e.target.value)} className="mt-1" />
            </div>
            <Button onClick={submit} disabled={create.isPending} className="w-full">Start</Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="mt-4 space-y-3">
        {experiments.length === 0 && (
          <div className="card-soft p-6 text-center text-sm text-muted-foreground">
            No experiments yet. Run a structured 30-day test on yourself.
          </div>
        )}
        {experiments.map((e) => {
          const active = e.status === "active";
          const now = new Date();
          const end = new Date(e.end_date);
          const overdue = active && now >= end;
          return (
            <div key={e.id} className="card-soft p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="font-display text-base font-semibold tracking-tight">{e.title}</p>
                  {e.hypothesis && <p className="mt-0.5 text-sm text-muted-foreground">"{e.hypothesis}"</p>}
                  <p className="mt-1 text-xs text-muted-foreground">
                    {e.start_date} → {e.end_date} · <span className="capitalize">{e.status}</span>
                  </p>
                </div>
                {active && (
                  <Button
                    size="sm"
                    variant={overdue ? "default" : "outline"}
                    onClick={() => finish(e.id)}
                    disabled={concludingId === e.id}
                    className="rounded-full"
                  >
                    {concludingId === e.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCheck className="h-3.5 w-3.5" />}
                    Conclude
                  </Button>
                )}
              </div>
              {e.conclusion && (
                <div className="mt-3 rounded-xl border border-border bg-surface-2 p-3 text-sm leading-relaxed">
                  {e.conclusion}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
