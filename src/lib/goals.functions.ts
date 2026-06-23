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

const DecompositionSchema = z.object({
  months: z.array(
    z.object({
      title: z.string(),
      weeks: z.array(
        z.object({
          title: z.string(),
          days: z.array(z.string()),
        }),
      ),
    }),
  ),
});

export const decomposeGoal = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({
      goal_id: z.string().uuid(),
      title: z.string().min(2),
      description: z.string().optional().nullable(),
      target_date: z.string().optional().nullable(),
    }).parse(input),
  )
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context as any;

    let decomposition: z.infer<typeof DecompositionSchema>;
    try {
      const { text } = await generateText({
        model: getModel(),
        system: `You are an expert goal architect. Break long-term goals into 2-3 month milestones, each with 2-4 week objectives, each with 3-5 concrete daily actions. Reply with ONLY a valid JSON object — no markdown fences, no commentary — matching this shape:
{"months":[{"title":"...","weeks":[{"title":"...","days":["...","..."]}]}]}`,
        prompt: `Goal: ${data.title}
${data.description ? `Description: ${data.description}` : ""}
${data.target_date ? `Target date: ${data.target_date}` : ""}

Output JSON only.`,
      });
      // Strip any code fences just in case
      const cleaned = text.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/, "").trim();
      decomposition = DecompositionSchema.parse(JSON.parse(cleaned));
    } catch (e: any) {
      throw new Error(`AI decomposition failed: ${e?.message ?? "unknown error"}`);
    }

    // Replace any prior auto-generated milestones for this goal
    await supabase
      .from("goal_milestones")
      .delete()
      .eq("goal_id", data.goal_id)
      .eq("auto_generated", true);

    const rows: any[] = [];
    decomposition.months.forEach((m, mi) => {
      rows.push({
        user_id: userId,
        goal_id: data.goal_id,
        period: "month",
        title: m.title,
        order_index: mi,
        auto_generated: true,
      });
    });
    // insert months first to get IDs
    const { data: monthRows, error: monthErr } = await supabase
      .from("goal_milestones")
      .insert(rows)
      .select("id,title,order_index");
    if (monthErr) throw monthErr;

    const weekRows: any[] = [];
    decomposition.months.forEach((m, mi) => {
      const parent = monthRows?.find((r: any) => r.order_index === mi);
      m.weeks.forEach((w, wi) => {
        weekRows.push({
          user_id: userId,
          goal_id: data.goal_id,
          parent_id: parent?.id,
          period: "week",
          title: w.title,
          order_index: mi * 10 + wi,
          auto_generated: true,
        });
      });
    });
    const { data: weekInserted, error: weekErr } = await supabase
      .from("goal_milestones")
      .insert(weekRows)
      .select("id,order_index");
    if (weekErr) throw weekErr;

    const dayRows: any[] = [];
    decomposition.months.forEach((m, mi) => {
      m.weeks.forEach((w, wi) => {
        const parent = weekInserted?.find((r: any) => r.order_index === mi * 10 + wi);
        w.days.forEach((d, di) => {
          dayRows.push({
            user_id: userId,
            goal_id: data.goal_id,
            parent_id: parent?.id,
            period: "day",
            title: d,
            order_index: di,
            auto_generated: true,
          });
        });
      });
    });
    if (dayRows.length) {
      const { error } = await supabase.from("goal_milestones").insert(dayRows);
      if (error) throw error;
    }

    return { months: decomposition.months.length, weeks: weekRows.length, days: dayRows.length };
  });
