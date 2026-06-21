ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS days_of_week smallint[],
  ADD COLUMN IF NOT EXISTS one_off_date date;