import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

// ---------- DAILY CHECK-INS ----------

export type DailyLog = {
  id: string;
  log_date: string;
  mood: "excellent" | "good" | "average" | "bad" | null;
  energy: "high" | "medium" | "low" | null;
  sleep_hours: number | null;
  productivity_rating: number | null;
  note: string | null;
};

export function useDailyLogs(fromISO: string, toISO: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["daily_logs", user?.id, fromISO, toISO],
    enabled: !!user,
    queryFn: async (): Promise<DailyLog[]> => {
      const { data, error } = await supabase
        .from("daily_logs")
        .select("id,log_date,mood,energy,sleep_hours,productivity_rating,note")
        .gte("log_date", fromISO)
        .lte("log_date", toISO)
        .order("log_date");
      if (error) throw error;
      return (data ?? []) as DailyLog[];
    },
  });
}

export function useUpsertDailyLog() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      log_date: string;
      mood?: DailyLog["mood"];
      energy?: DailyLog["energy"];
      sleep_hours?: number | null;
      productivity_rating?: number | null;
      note?: string | null;
    }) => {
      if (!user) throw new Error("not signed in");
      const { error } = await supabase
        .from("daily_logs")
        .upsert({ user_id: user.id, ...input }, { onConflict: "user_id,log_date" });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["daily_logs"] }),
  });
}

// ---------- LONG-TERM GOALS ----------

export type LongTermGoal = {
  id: string;
  title: string;
  description: string | null;
  category_id: string | null;
  target_date: string | null;
  target_metric: { type?: string; target?: number; current?: number; unit?: string } | null;
  status: "active" | "paused" | "done" | "archived";
  created_at: string;
};

export type GoalMilestone = {
  id: string;
  goal_id: string;
  parent_id: string | null;
  period: "month" | "week" | "day";
  title: string;
  order_index: number;
  due_date: string | null;
  status: "pending" | "in_progress" | "done" | "skipped";
  auto_generated: boolean;
  linked_task_id: string | null;
};

export function useLongTermGoals() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["long_term_goals", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<LongTermGoal[]> => {
      const { data, error } = await supabase
        .from("long_term_goals")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as LongTermGoal[];
    },
  });
}

export function useGoalMilestones(goalId: string | null) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["goal_milestones", user?.id, goalId],
    enabled: !!user && !!goalId,
    queryFn: async (): Promise<GoalMilestone[]> => {
      const { data, error } = await supabase
        .from("goal_milestones")
        .select("*")
        .eq("goal_id", goalId!)
        .order("period")
        .order("order_index");
      if (error) throw error;
      return (data ?? []) as GoalMilestone[];
    },
  });
}

export function useCreateLongTermGoal() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (g: {
      title: string;
      description?: string | null;
      category_id?: string | null;
      target_date?: string | null;
      target_metric?: LongTermGoal["target_metric"];
    }): Promise<{ id: string }> => {
      if (!user) throw new Error("not signed in");
      const { data, error } = await supabase
        .from("long_term_goals")
        .insert({ ...g, user_id: user.id })
        .select("id")
        .single();
      if (error) throw error;
      return data as { id: string };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["long_term_goals"] }),
  });
}

export function useUpdateLongTermGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<LongTermGoal> }) => {
      const { error } = await supabase.from("long_term_goals").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["long_term_goals"] });
    },
  });
}

export function useDeleteLongTermGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("long_term_goals").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["long_term_goals"] }),
  });
}

export function useToggleMilestone() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: GoalMilestone["status"] }) => {
      const { error } = await supabase.from("goal_milestones").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: ["goal_milestones"] }),
  });
}

// ---------- EXPERIMENTS ----------

export type Experiment = {
  id: string;
  title: string;
  hypothesis: string | null;
  start_date: string;
  end_date: string;
  tracked_metrics: string[];
  status: "active" | "completed" | "abandoned";
  conclusion: string | null;
  conclusion_data: Record<string, unknown> | null;
};

export function useExperiments() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["experiments", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<Experiment[]> => {
      const { data, error } = await supabase
        .from("experiments")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Experiment[];
    },
  });
}

export function useCreateExperiment() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (e: {
      title: string;
      hypothesis?: string | null;
      start_date: string;
      end_date: string;
      tracked_metrics: string[];
    }) => {
      if (!user) throw new Error("not signed in");
      const { error } = await supabase.from("experiments").insert({ ...e, user_id: user.id });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["experiments"] }),
  });
}

export function useEndExperiment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, conclusion, conclusion_data }: { id: string; conclusion: string; conclusion_data: Record<string, unknown> }) => {
      const { error } = await supabase
        .from("experiments")
        .update({ status: "completed", conclusion, conclusion_data })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["experiments"] }),
  });
}

// ---------- INSIGHTS ----------

export type InsightKind = "discovery" | "forecast" | "gap" | "weekly" | "monthly" | "notification";

export type Insight = {
  id: string;
  kind: InsightKind;
  title: string;
  body: string | null;
  data: Record<string, unknown> | null;
  confidence: "low" | "medium" | "high" | null;
  generated_at: string;
  dismissed: boolean;
  read_at: string | null;
  period_start: string | null;
  period_end: string | null;
};

export function useInsights(kind?: InsightKind) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["insights", user?.id, kind ?? "all"],
    enabled: !!user,
    queryFn: async (): Promise<Insight[]> => {
      let q = supabase
        .from("insights")
        .select("*")
        .eq("dismissed", false)
        .order("generated_at", { ascending: false });
      if (kind) q = q.eq("kind", kind);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as Insight[];
    },
  });
}

export function useDismissInsight() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("insights").update({ dismissed: true }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["insights"] }),
  });
}

// ---------- NOTIFICATION PREFS ----------

export function useNotifPrefs() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["notification_preferences", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notification_preferences")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useUpsertNotifPrefs() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: { enabled?: boolean; weekly_report?: boolean; smart_nudges?: boolean }) => {
      if (!user) throw new Error("not signed in");
      const { error } = await supabase
        .from("notification_preferences")
        .upsert({ user_id: user.id, ...patch }, { onConflict: "user_id" });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notification_preferences"] }),
  });
}
