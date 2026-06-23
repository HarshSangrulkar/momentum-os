// Public endpoint hit by pg_cron weekly. Iterates active users and generates a weekly report.
// Authenticated via Supabase apikey header (anon).
import { createFileRoute } from "@tanstack/react-router";
import { generateText } from "ai";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";

export const Route = createFileRoute("/api/public/hooks/weekly-report")({
  server: {
    handlers: {
      POST: async () => {
        const key = process.env.LOVABLE_API_KEY;
        const supabaseUrl = process.env.SUPABASE_URL;
        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (!key || !supabaseUrl || !serviceKey) {
          return new Response("Misconfigured", { status: 500 });
        }
        const { createClient } = await import("@supabase/supabase-js");
        const admin = createClient(supabaseUrl, serviceKey);

        // Iterate users with notification prefs enabled (weekly_report on)
        const { data: prefs } = await admin
          .from("notification_preferences")
          .select("user_id")
          .eq("weekly_report", true);

        const model = createLovableAiGatewayProvider(key)("google/gemini-3-flash-preview");
        const userIds = (prefs ?? []).map((p) => p.user_id);

        let success = 0;
        for (const userId of userIds) {
          try {
            const since = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
            const [logs, daily, tasks] = await Promise.all([
              admin.from("task_logs").select("task_id,log_date,completed,notes").eq("user_id", userId).gte("log_date", since),
              admin.from("daily_logs").select("*").eq("user_id", userId).gte("log_date", since),
              admin.from("tasks").select("id,title,weightage,frequency,archived").eq("user_id", userId).eq("archived", false),
            ]);
            const completedW = (logs.data ?? []).filter((l) => l.completed).reduce((s, l) => {
              const t = (tasks.data ?? []).find((x) => x.id === l.task_id);
              return s + (t?.weightage ?? 0);
            }, 0);
            const planned = (tasks.data ?? []).filter((t) => t.frequency === "daily").reduce((s, t) => s + t.weightage * 7, 0);
            const pct = planned ? Math.round((completedW / planned) * 100) : 0;
            const notes = (logs.data ?? []).filter((l) => l.notes).slice(-10).map((l) => l.notes);

            const { text } = await generateText({
              model,
              system: "You are Momentum Coach. Markdown with ## Wins, ## Misses, ## Pattern, ## Next week's focus. Tight, honest.",
              prompt: `Weekly: ${pct}% completion. ${(daily.data ?? []).length}/7 check-ins. Recent notes: ${notes.join(" | ")}`,
            });

            await admin.from("insights").insert({
              user_id: userId,
              kind: "weekly",
              title: `Week of ${since}`,
              body: text,
              data: { completionPct: pct },
              confidence: "medium",
              period_start: since,
            });
            success++;
          } catch (e) {
            console.error("weekly-report user fail", userId, e);
          }
        }
        return Response.json({ processed: userIds.length, success });
      },
    },
  },
});
