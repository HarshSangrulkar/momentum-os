
-- Phase 1: Behavioral Intelligence data foundation

-- 1. daily_logs: one per user per date
CREATE TABLE public.daily_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  log_date date NOT NULL,
  mood text CHECK (mood IN ('excellent','good','average','bad')),
  energy text CHECK (energy IN ('high','medium','low')),
  sleep_hours numeric(3,1),
  productivity_rating smallint CHECK (productivity_rating BETWEEN 1 AND 5),
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, log_date)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.daily_logs TO authenticated;
GRANT ALL ON public.daily_logs TO service_role;
ALTER TABLE public.daily_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own daily_logs" ON public.daily_logs FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER daily_logs_touch BEFORE UPDATE ON public.daily_logs FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 2. long_term_goals
CREATE TABLE public.long_term_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  target_date date,
  target_metric jsonb,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','paused','done','archived')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.long_term_goals TO authenticated;
GRANT ALL ON public.long_term_goals TO service_role;
ALTER TABLE public.long_term_goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own long_term_goals" ON public.long_term_goals FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER long_term_goals_touch BEFORE UPDATE ON public.long_term_goals FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 3. goal_milestones
CREATE TABLE public.goal_milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  goal_id uuid NOT NULL REFERENCES public.long_term_goals(id) ON DELETE CASCADE,
  parent_id uuid REFERENCES public.goal_milestones(id) ON DELETE CASCADE,
  period text NOT NULL CHECK (period IN ('month','week','day')),
  title text NOT NULL,
  order_index integer NOT NULL DEFAULT 0,
  due_date date,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','in_progress','done','skipped')),
  auto_generated boolean NOT NULL DEFAULT false,
  linked_task_id uuid REFERENCES public.tasks(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.goal_milestones TO authenticated;
GRANT ALL ON public.goal_milestones TO service_role;
ALTER TABLE public.goal_milestones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own goal_milestones" ON public.goal_milestones FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER goal_milestones_touch BEFORE UPDATE ON public.goal_milestones FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 4. experiments
CREATE TABLE public.experiments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  hypothesis text,
  start_date date NOT NULL,
  end_date date NOT NULL,
  tracked_metrics jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','completed','abandoned')),
  conclusion text,
  conclusion_data jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.experiments TO authenticated;
GRANT ALL ON public.experiments TO service_role;
ALTER TABLE public.experiments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own experiments" ON public.experiments FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER experiments_touch BEFORE UPDATE ON public.experiments FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 5. experiment_logs
CREATE TABLE public.experiment_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  experiment_id uuid NOT NULL REFERENCES public.experiments(id) ON DELETE CASCADE,
  log_date date NOT NULL,
  metrics jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (experiment_id, log_date)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.experiment_logs TO authenticated;
GRANT ALL ON public.experiment_logs TO service_role;
ALTER TABLE public.experiment_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own experiment_logs" ON public.experiment_logs FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 6. insights
CREATE TABLE public.insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  kind text NOT NULL CHECK (kind IN ('discovery','forecast','gap','weekly','monthly','notification')),
  title text NOT NULL,
  body text,
  data jsonb,
  confidence text CHECK (confidence IN ('low','medium','high')),
  period_start date,
  period_end date,
  generated_at timestamptz NOT NULL DEFAULT now(),
  dismissed boolean NOT NULL DEFAULT false,
  read_at timestamptz
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.insights TO authenticated;
GRANT ALL ON public.insights TO service_role;
ALTER TABLE public.insights ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own insights" ON public.insights FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX insights_user_kind_idx ON public.insights (user_id, kind, generated_at DESC);

-- 7. notification_preferences
CREATE TABLE public.notification_preferences (
  user_id uuid PRIMARY KEY,
  enabled boolean NOT NULL DEFAULT true,
  quiet_start time DEFAULT '22:00',
  quiet_end time DEFAULT '07:00',
  weekly_report boolean NOT NULL DEFAULT true,
  smart_nudges boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notification_preferences TO authenticated;
GRANT ALL ON public.notification_preferences TO service_role;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own notif prefs" ON public.notification_preferences FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER notification_preferences_touch BEFORE UPDATE ON public.notification_preferences FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
