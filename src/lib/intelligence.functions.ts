import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { generateText } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";
import { computeDiscoveries, computeRealityGap, type DailyLogRow } from "./behavioral";
import type { Task, Log } from "./scoring";
import { ymd, lastNDays } from "./date-utils";

function getModel() {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("LOVABLE_API_KEY not configured");
  return createLovableAiGatewayProvider(key)("google/gemini-3-flash-preview");
}

async function loadWindow(supabase: any, userId: string, days = 60) {
  const dates = lastNDays(days);
  const from = ymd(dates[0]);
  const to = ymd(dates[dates.length - 1]);
  const [tasks, logs, daily] = await Promise.all([
    supabase.from("tasks").select("id,title,weightage,frequency,category_id,archived,start_time,end_time,days_of_week,one_off_date").eq("archived", false),
    supabase.from("task_logs").select("task_id,log_date,completed,notes").gte("log_date", from).lte("log_date", to),
    supabase.from("daily_logs").select("log_date,mood,energy,sleep_hours,productivity_rating").gte("log_date", from).lte("log_date", to),
  ]);
  return {
    dates,
    tasks: (tasks.data ?? []) as Task[],
    logs: (logs.data ?? []) as Log[],
    daily: (daily.data ?? []) as DailyLogRow[],
  };
}

// ============================================================
// GENERATE DISCOVERIES (Performance Lab)
// ============================================================

export const generateDiscoveries = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context as any;
    const { tasks, logs, daily, dates } = await loadWindow(supabase, userId, 60);

    const discoveries = computeDiscoveries(tasks, logs, daily, dates);

    if (discoveries.length === 0) {
      return { count: 0, message: "Not enough data yet. Log a few daily check-ins and complete some tasks." };
    }

    // Clear prior discoveries (we re-derive from data each time)
    await supabase.from("insights").delete().eq("user_id", userId).eq("kind", "discovery");

    const rows = discoveries.map((d) => ({
      user_id: userId,
      kind: "discovery" as const,
      title: d.title,
      body: d.body,
      data: d.data,
      confidence: d.confidence,
    }));
    await supabase.from("insights").insert(rows);

    return { count: discoveries.length };
  });

// ============================================================
// GENERATE REALITY GAP
// ============================================================

export const generateRealityGap = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({ days: z.number().min(1).max(60).default(7) }).parse(input))
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context as any;
    const { tasks, logs, dates } = await loadWindow(supabase, userId, data.days);
    const gap = computeRealityGap(tasks, logs, dates);

    let narrative = "";
    if (gap.plannedCount > 0) {
      try {
        const { text } = await generateText({
          model: getModel(),
          system: "You are a sharp, kind behavioral coach. Two sentences, no fluff. Cite the numbers given.",
          prompt: `Reality gap (last ${data.days} days): planned ${gap.plannedCount} task-occurrences, did ${gap.actualCount}. Planning accuracy ${gap.accuracy}%. Most overestimated: ${gap.mostOverestimated?.title ?? "none"} (missed ${gap.mostOverestimated?.gap ?? 0} times). Write a short honest paragraph.`,
        });
        narrative = text;
      } catch {
        narrative = `You planned ${gap.plannedCount} task-occurrences and completed ${gap.actualCount}. Planning accuracy: ${gap.accuracy}%.`;
      }
    }
    return { gap, narrative };
  });

// ============================================================
// WEEKLY REPORT (manual trigger)
// ============================================================

export const generateWeeklyReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context as any;
    const { tasks, logs, daily, dates } = await loadWindow(supabase, userId, 7);

    // Build summary
    const totalPlanned = tasks.filter((t) => t.frequency === "daily" && !t.archived).reduce((s, t) => s + t.weightage * 7, 0);
    const completedW = logs.filter((l) => l.completed).reduce((sum, l) => {
      const t = tasks.find((x) => x.id === l.task_id);
      return sum + (t?.weightage ?? 0);
    }, 0);
    const completionPct = totalPlanned ? Math.round((completedW / totalPlanned) * 100) : 0;

    const recentNotes = logs.filter((l) => l.notes).slice(-10).map((l) => l.notes);
    const checkIns = daily.length;

    let body = "";
    try {
      const { text } = await generateText({
        model: getModel(),
        system: "You are Momentum Coach: honest, kind, specific. Format markdown with sections: ## Wins, ## Misses, ## Pattern, ## This week's focus. Be tight.",
        prompt: `Weekly snapshot:
Completion: ${completionPct}%
Check-ins logged: ${checkIns}/7
Tasks tracked: ${tasks.length}
Recent notes (verbatim): ${recentNotes.join(" | ")}
Write a short weekly review.`,
      });
      body = text;
    } catch {
      body = `Weekly completion: ${completionPct}%. Keep going.`;
    }

    await supabase.from("insights").insert({
      user_id: userId,
      kind: "weekly",
      title: `Week of ${ymd(dates[0])}`,
      body,
      data: { completionPct, checkIns },
      confidence: "medium",
      period_start: ymd(dates[0]),
      period_end: ymd(dates[dates.length - 1]),
    });

    return { completionPct };
  });
