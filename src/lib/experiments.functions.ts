import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { generateText } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";

function getModel() {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("LOVABLE_API_KEY not configured");
  return createLovableAiGatewayProvider(key)("google/gemini-3-flash-preview");
}

export const concludeExperiment = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({ experiment_id: z.string().uuid() }).parse(input))
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context as any;

    const { data: exp, error: expErr } = await supabase
      .from("experiments")
      .select("*")
      .eq("id", data.experiment_id)
      .single();
    if (expErr || !exp) throw new Error("Experiment not found");

    // Build baseline = equal-length window immediately before start_date
    const start = new Date(exp.start_date);
    const end = new Date(exp.end_date);
    const days = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000));
    const baselineStart = new Date(start);
    baselineStart.setDate(baselineStart.getDate() - days);
    const fmt = (d: Date) => d.toISOString().slice(0, 10);

    const [duringDaily, baselineDaily, duringLogs, baselineLogs] = await Promise.all([
      supabase.from("daily_logs").select("*").gte("log_date", fmt(start)).lte("log_date", fmt(end)),
      supabase.from("daily_logs").select("*").gte("log_date", fmt(baselineStart)).lt("log_date", fmt(start)),
      supabase.from("task_logs").select("completed").gte("log_date", fmt(start)).lte("log_date", fmt(end)).eq("completed", true),
      supabase.from("task_logs").select("completed").gte("log_date", fmt(baselineStart)).lt("log_date", fmt(start)).eq("completed", true),
    ]);

    const avg = (arr: number[]) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);
    const summarize = (rows: any[]) => {
      const moodMap = { excellent: 4, good: 3, average: 2, bad: 1 } as Record<string, number>;
      const energyMap = { high: 3, medium: 2, low: 1 } as Record<string, number>;
      return {
        mood: +avg(rows.map((r) => moodMap[r.mood] ?? 0).filter((n) => n > 0)).toFixed(2),
        energy: +avg(rows.map((r) => energyMap[r.energy] ?? 0).filter((n) => n > 0)).toFixed(2),
        sleep: +avg(rows.map((r) => r.sleep_hours).filter((n) => n != null)).toFixed(2),
        productivity: +avg(rows.map((r) => r.productivity_rating).filter((n) => n != null)).toFixed(2),
      };
    };

    const during = summarize(duringDaily.data ?? []);
    const baseline = summarize(baselineDaily.data ?? []);
    const completionDuring = (duringLogs.data ?? []).length;
    const completionBaseline = (baselineLogs.data ?? []).length;

    const conclusion_data = { during, baseline, completionDuring, completionBaseline, days };

    let conclusion = "";
    try {
      const { text } = await generateText({
        model: getModel(),
        system: "You are a sharp behavioral analyst. 3-4 sentences. Cite the numbers. Honest verdict on the hypothesis.",
        prompt: `Experiment: ${exp.title}
Hypothesis: ${exp.hypothesis ?? "(none)"}
Duration: ${days} days

BEFORE (baseline ${days}d): mood avg ${baseline.mood}, energy ${baseline.energy}, sleep ${baseline.sleep}h, productivity ${baseline.productivity}, ${completionBaseline} task completions.
DURING: mood ${during.mood}, energy ${during.energy}, sleep ${during.sleep}h, productivity ${during.productivity}, ${completionDuring} task completions.

Write the verdict.`,
      });
      conclusion = text;
    } catch (e: any) {
      conclusion = `Mood ${baseline.mood} → ${during.mood}. Energy ${baseline.energy} → ${during.energy}. Completions ${completionBaseline} → ${completionDuring}.`;
    }

    await supabase
      .from("experiments")
      .update({ status: "completed", conclusion, conclusion_data })
      .eq("id", data.experiment_id);

    return { conclusion, conclusion_data };
  });
