import { createFileRoute } from "@tanstack/react-router";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useMemo, useRef, useEffect, useState } from "react";
import { useTasks, useLogs, useCategories } from "@/lib/data";
import { useDailyLogs, useLongTermGoals, useInsights } from "@/lib/intel-data";
import { ymd, lastNDays } from "@/lib/date-utils";
import { scoreFor, rangeScore, currentStreak, longestStreak } from "@/lib/scoring";
import { Send, Sparkles, Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";

export const Route = createFileRoute("/_app/coach")({
  head: () => ({ meta: [{ title: "AI Coach — Momentum" }] }),
  component: CoachPage,
});

function CoachPage() {
  const { data: tasks = [] } = useTasks();
  const { data: cats = [] } = useCategories();
  const days30 = useMemo(() => lastNDays(30), []);
  const { data: logs = [] } = useLogs(ymd(days30[0]), ymd(new Date()));
  const { data: dailyLogs = [] } = useDailyLogs(ymd(days30[0]), ymd(new Date()));
  const { data: longTermGoals = [] } = useLongTermGoals();
  const { data: insights = [] } = useInsights();

  const context = useMemo(
    () => buildContext(tasks, cats, logs, dailyLogs, longTermGoals, insights),
    [tasks, cats, logs, dailyLogs, longTermGoals, insights],
  );

  const transport = useMemo(
    () => new DefaultChatTransport({ api: "/api/chat", body: { context } }),
    [context],
  );

  const { messages, sendMessage, status } = useChat({ transport });
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, status]);

  const isLoading = status === "submitted" || status === "streaming";

  const submit = (text: string) => {
    if (!text.trim() || isLoading) return;
    sendMessage({ text: text.trim() });
    setInput("");
  };

  const suggestions = [
    "How am I doing this week?",
    "What should I improve?",
    "Why is my score decreasing?",
    "Design a better daily routine for me.",
  ];

  return (
    <div className="mx-auto flex h-[calc(100vh-5rem)] max-w-3xl flex-col px-4 pt-6 sm:px-6 sm:pt-10">
      <div className="mb-4 flex items-center gap-3">
        <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary/15">
          <Sparkles className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">AI Coach</h1>
          <p className="text-xs text-muted-foreground">Knows your last 30 days. Tells you the truth.</p>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto py-2">
        {messages.length === 0 && (
          <div className="card-soft p-5">
            <p className="text-sm">Hi — I'm your coach. Ask me anything about your habits.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {suggestions.map((s) => (
                <button
                  key={s}
                  onClick={() => submit(s)}
                  className="rounded-full border border-border bg-surface-2 px-3 py-1.5 text-xs hover:bg-accent hover:text-accent-foreground"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m) => {
          const text = m.parts.map((p: any) => (p.type === "text" ? p.text : "")).join("");
          if (m.role === "user") {
            return (
              <div key={m.id} className="flex justify-end">
                <div className="max-w-[85%] rounded-2xl rounded-br-md bg-primary px-4 py-2.5 text-sm text-primary-foreground">{text}</div>
              </div>
            );
          }
          return (
            <div key={m.id} className="flex gap-2">
              <div className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary/15">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
              </div>
              <div className="prose prose-sm max-w-[85%] dark:prose-invert prose-p:my-1 prose-ul:my-1 prose-headings:font-display prose-headings:tracking-tight">
                <ReactMarkdown>{text || "…"}</ReactMarkdown>
              </div>
            </div>
          );
        })}
        {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
          <div className="flex gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Thinking…</div>
        )}
      </div>

      <form
        onSubmit={(e) => { e.preventDefault(); submit(input); }}
        className="no-print sticky bottom-0 mt-2 flex items-center gap-2 border-t border-border bg-background pb-4 pt-3"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask your coach…"
          className="flex-1 rounded-full border border-border bg-surface px-4 py-2.5 text-sm outline-none focus:border-primary"
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="grid h-10 w-10 place-items-center rounded-full bg-primary text-primary-foreground disabled:opacity-50"
        >
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </button>
      </form>
    </div>
  );
}

function buildContext(tasks: any[], cats: any[], logs: any[], dailyLogs: any[], goals: any[], insights: any[]) {
  const today = new Date();
  const today30 = lastNDays(30);
  const today7 = lastNDays(7);
  const todayScore = scoreFor(tasks, logs, ymd(today));
  const weekScore = rangeScore(tasks, logs, today7);
  const monthScore = rangeScore(tasks, logs, today30);
  const streak = currentStreak(tasks, logs);
  const longest = longestStreak(tasks, logs);

  const catSummary = cats.map((c) => {
    const ct = tasks.filter((t) => t.category_id === c.id && t.frequency === "daily");
    if (!ct.length) return null;
    const total = today30.length * ct.reduce((s, t) => s + t.weightage, 0);
    const done = today30.reduce((sum, d) => {
      const key = ymd(d);
      return sum + ct.reduce((s, t) => {
        const l = logs.find((x: any) => x.task_id === t.id && x.log_date === key && x.completed);
        return s + (l ? t.weightage : 0);
      }, 0);
    }, 0);
    return { name: c.name, score30d: total ? Math.round((done / total) * 100) : 0, tasks: ct.map((t) => t.title) };
  }).filter(Boolean);

  const recentNotes = logs
    .filter((l: any) => l.notes)
    .slice(-15)
    .map((l: any) => {
      const t = tasks.find((x) => x.id === l.task_id);
      return { date: l.log_date, task: t?.title, note: l.notes };
    });

  const checkIns = dailyLogs.slice(-14).map((d: any) => ({
    date: d.log_date, mood: d.mood, energy: d.energy, sleep: d.sleep_hours, prod: d.productivity_rating, note: d.note,
  }));

  const longTerm = goals.filter((g: any) => g.status === "active").map((g: any) => ({
    title: g.title,
    description: g.description,
    target: g.target_metric,
    target_date: g.target_date,
  }));

  const discoveries = insights.filter((i: any) => i.kind === "discovery").slice(0, 8).map((i: any) => ({
    title: i.title, body: i.body, confidence: i.confidence,
  }));

  return {
    today: ymd(today),
    scores: { today: todayScore, last7days: weekScore, last30days: monthScore },
    streaks: { current: streak, longest },
    categories: catSummary,
    tasks: tasks.map((t) => ({ title: t.title, frequency: t.frequency, weight: t.weightage })),
    recentNotes,
    checkIns,
    longTermGoals: longTerm,
    behavioralDiscoveries: discoveries,
  };
}

