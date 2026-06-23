# Momentum → AI Behavioral Intelligence Platform

This is a large scope. I'll deliver it in **4 phased migrations + UI waves** so each phase is shippable, testable, and the AI has real data to reason about before we layer forecasts on top. Nothing existing breaks — Today / Goals / Coach stay; new surfaces are added.

---

## Phase 1 — Data foundation (daily signals)

**New tables (migration 1):**
- `daily_logs` — one row per user per date: `mood` (excellent/good/average/bad), `energy` (high/med/low), `sleep_hours` (numeric), `productivity_rating` (1–5), `note` (text)
- `long_term_goals` — title, description, target_date, status, category_id, target_metric (jsonb: e.g. `{type:'books', target:24, current:0}`)
- `goal_milestones` — goal_id, period (`month`/`week`/`day`), title, order_index, due_date, status, auto_generated (bool), linked_task_id (nullable)
- `experiments` — title, hypothesis, start_date, end_date, tracked_metrics (jsonb array), status, conclusion (text, AI-filled)
- `experiment_logs` — experiment_id, date, metrics (jsonb)
- `insights` — user_id, kind (`discovery`/`forecast`/`gap`/`weekly`/`monthly`), title, body (text), data (jsonb), confidence (low/med/high), generated_at, dismissed
- `notification_preferences` — minimal: quiet hours, enabled toggles

All with RLS scoped to `auth.uid()`, GRANTs to authenticated + service_role, `updated_at` triggers where relevant.

**Today screen additions:**
- A small **"Daily Check-in" card** at top of Today: mood (4 emojis), energy (3 dots), sleep hours (number), productivity (1–5 stars), optional note. Auto-saves to `daily_logs`. Visible only on today's card (not past/future).

---

## Phase 2 — Life Dashboard + Long-term Goals + Decomposition

**New route `/dashboard`** becomes the new landing surface inside the app shell (Today stays at `/today`). Cards:
- Today's Score (reuse scoring)
- Current top streak
- Top long-term goal w/ progress bar
- Weekly progress sparkline
- Latest AI Insight of the Day (from `insights`)
- Quick-add: note / mood / energy
- Forecast tile (filled in Phase 4)

**New route `/goals/long-term`** (or merge into existing Goals page as a tab):
- Create long-term goal (title, target metric, target date, category)
- "Decompose with AI" button → server fn calls Lovable AI → returns months → weeks → daily action templates → inserts into `goal_milestones`. User can edit / delete / re-generate. Daily actions can optionally be promoted into actual recurring `tasks`.

---

## Phase 3 — Performance Lab + Reality Gap + Experiments

**New route `/lab`** with tabs:

1. **Discoveries** — Cards listing AI-generated behavioral findings from `insights` (kind=`discovery`). "Generate new discoveries" button calls a server fn that:
   - Pulls last 60 days of `task_logs` + `daily_logs`
   - Computes correlations server-side (sleep vs completion, day-of-week patterns, mood vs productivity, category cross-effects) using deterministic JS — NOT AI, so numbers are real
   - Passes the computed correlations to Lovable AI only to phrase them into the "When X, then Y (confidence Z)" narrative
   - Stores results in `insights`

2. **Reality Gap** — week selector. Computes:
   - Planned = sum of active tasks × scheduled occurrences in week
   - Actual = completed logs
   - Per-category bars (planned vs actual)
   - **Planning Accuracy Score** = actual / planned, capped 100
   - Most overestimated activity (largest negative delta)
   - One-paragraph AI narrative

3. **Experiments** — list + create. Template picker (10k Steps / No Social Media / Early Wake / High Protein / Meditation / Custom). On creation we pin tracked metrics. Daily during the experiment, the user logs metrics (auto-pulled from `daily_logs` + selected tasks). On end_date a server fn computes deltas vs the prior baseline window of equal length and writes a conclusion via AI.

---

## Phase 4 — Forecasts, Reports, Accountability AI, Smart Notifications

- **Forecast engine** (`/dashboard` tile + `/lab` "Forecasts" tab): linear-rate projections per goal (current pace vs target → ETA). Pure math, AI only narrates.
- **Weekly Report** (auto-generated Sunday via pg_cron hitting `/api/public/hooks/weekly-report`, also generatable on-demand): completion %, category scores, streaks, wins, failures, AI-written learnings + suggestions. Stored in `insights` (kind=`weekly`) and surfaced in Reports page.
- **Monthly Review**: same pipeline, kind=`monthly`, with PDF export via the existing print-optimized Reports route + browser print.
- **Accountability Coach**: upgrade `/coach` system prompt to receive a *richer* context bundle — current streaks, recent regressions, long-term goal progress, discoveries — so it can reference history ("You've missed reading 3 weeks in a row…"). No new UI, just smarter context.
- **Smart notifications**: PWA permission prompt in Settings + a server fn that composes context-aware messages from `insights` + behavior. Delivered via the browser Notification API on app open (since this is a PWA without push infra, we render them in a "Notifications" inbox card on the dashboard and fire `Notification(...)` when granted). Honest scope — no APNs/FCM.

---

## Technical details

- **AI model**: keep `google/gemini-3-flash-preview` via existing `ai-gateway.server.ts`. All correlations are computed deterministically in TS; AI is used only for narration and decomposition. This keeps "discoveries" trustworthy.
- **Server functions**: new `src/lib/intelligence.functions.ts` (compute discoveries, gap, forecasts), `src/lib/goals.functions.ts` (decompose), `src/lib/experiments.functions.ts` (conclude). All gated by `requireSupabaseAuth`.
- **Cron**: one `/api/public/hooks/weekly-report` endpoint scheduled Sundays 18:00 UTC via pg_cron, iterates users, generates + stores weekly insight.
- **Design**: keep existing Apple-style minimal tokens in `styles.css`. New surfaces use soft cards, generous whitespace, single accent gradient per surface — no new color system, no new fonts.
- **Navigation**: bottom nav grows to: Dashboard, Today, Goals, Lab, Coach (Reports + Settings move under a "More" sheet to keep the bar at 5).

---

## What I will NOT do in this pass

- Native push notifications (no APNs/FCM infra) — in-app + browser Notification API only.
- Background daily AI runs per user beyond the weekly cron — discoveries regenerate on demand or with weekly report (cost control).
- Replacing the existing Today carousel, Goals page, or scoring formula.

---

## Delivery order (each is a checkpoint)

1. Phase 1 migration + Today daily check-in card
2. Phase 2 dashboard + long-term goals + AI decomposition
3. Phase 3 Performance Lab (Discoveries + Reality Gap + Experiments)
4. Phase 4 Forecasts + Weekly/Monthly reports + Accountability context + Notifications inbox

Approve and I'll start with Phase 1.
