import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { ymd, weekStart, weekEnd } from "./date-utils";
import type { Task, Log } from "./scoring";

export type Category = { id: string; name: string; color: string; icon: string };

export function useCategories() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["categories", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<Category[]> => {
      const { data, error } = await supabase.from("categories").select("*").order("created_at");
      if (error) throw error;
      return data as Category[];
    },
  });
}

export function useTasks() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["tasks", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<Task[]> => {
      const { data, error } = await supabase
        .from("tasks")
        .select("id,title,weightage,frequency,category_id,archived,start_time,end_time,days_of_week,one_off_date")
        .eq("archived", false)
        .order("created_at");
      if (error) throw error;
      return data as Task[];
    },
  });
}

/** logs in a date range (yyyy-mm-dd inclusive) */
export function useLogs(fromISO: string, toISO: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["logs", user?.id, fromISO, toISO],
    enabled: !!user,
    queryFn: async (): Promise<Log[]> => {
      const { data, error } = await supabase
        .from("task_logs")
        .select("task_id,log_date,completed,notes")
        .gte("log_date", fromISO)
        .lte("log_date", toISO);
      if (error) throw error;
      return data as Log[];
    },
  });
}

export function useToggleTaskLog() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ task_id, date, completed, notes }: { task_id: string; date: string; completed: boolean; notes?: string | null }) => {
      if (!user) throw new Error("not signed in");
      const { error } = await supabase
        .from("task_logs")
        .upsert(
          { user_id: user.id, task_id, log_date: date, completed, ...(notes !== undefined ? { notes } : {}) },
          { onConflict: "task_id,log_date" },
        );
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["logs"] }),
  });
}

export function useUpsertNote() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ task_id, date, notes }: { task_id: string; date: string; notes: string }) => {
      if (!user) throw new Error("not signed in");
      // Ensure a row exists (don't toggle completion)
      const { data: existing } = await supabase
        .from("task_logs")
        .select("id,completed")
        .eq("task_id", task_id)
        .eq("log_date", date)
        .maybeSingle();
      if (existing) {
        const { error } = await supabase.from("task_logs").update({ notes }).eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("task_logs")
          .insert({ user_id: user.id, task_id, log_date: date, completed: false, notes });
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["logs"] }),
  });
}

export function useCreateTask() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (t: { title: string; category_id: string | null; weightage: number; frequency: "daily" | "weekly"; start_time?: string | null; end_time?: string | null }) => {
      if (!user) throw new Error("not signed in");
      const { error } = await supabase.from("tasks").insert({ ...t, user_id: user.id });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });
}

export function useArchiveTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tasks").update({ archived: true }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });
}

export function useCreateCategory() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (c: { name: string; color: string; icon: string }) => {
      if (!user) throw new Error("not signed in");
      const { error } = await supabase.from("categories").insert({ ...c, user_id: user.id });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["categories"] }),
  });
}

export function useDeleteCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("categories").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["categories"] });
      qc.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
}

export const weekRange = () => ({ from: ymd(weekStart()), to: ymd(weekEnd()) });
