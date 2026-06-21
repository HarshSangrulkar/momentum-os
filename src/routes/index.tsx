import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { ArrowRight, Sparkles, TrendingUp, Flame, MessageCircle } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Momentum — Your Personal Growth OS" },
      { name: "description", content: "Track daily and weekly goals, build streaks, visualize progress, and get AI coaching." },
    ],
  }),
  component: Landing,
});

function Landing() {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen bg-background" />;
  if (user) return <Navigate to="/today" />;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2">
          <Logo />
          <span className="font-display text-lg font-semibold tracking-tight">Momentum</span>
        </div>
        <Link
          to="/auth"
          className="rounded-full border border-border bg-surface px-4 py-2 text-sm font-medium hover:bg-surface-2"
        >
          Sign in
        </Link>
      </header>

      <main className="mx-auto max-w-5xl px-6">
        <section className="pb-16 pt-12 sm:pt-20">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            Your personal growth operating system
          </div>
          <h1 className="font-display text-5xl font-semibold leading-[1.05] tracking-tight sm:text-7xl">
            Small daily wins,<br />
            <span className="text-primary">compounding momentum.</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
            Track habits and weekly goals, build unbreakable streaks, and let an AI coach
            review your progress and tell you what to improve.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/auth"
              className="group inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition hover:opacity-90"
            >
              Start free
              <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
            </Link>
            <a
              href="#features"
              className="rounded-full border border-border bg-surface px-6 py-3 text-sm font-medium hover:bg-surface-2"
            >
              See features
            </a>
          </div>
        </section>

        <section id="features" className="grid gap-4 pb-24 sm:grid-cols-3">
          <Feature icon={<TrendingUp className="h-5 w-5" />} title="Daily & weekly scoring" desc="Weight every habit. Get one score that reflects your day, week, and month." />
          <Feature icon={<Flame className="h-5 w-5" />} title="Streaks that matter" desc="Per-habit and per-category streaks, plus your all-time longest run." />
          <Feature icon={<MessageCircle className="h-5 w-5" />} title="AI coach" desc="Ask 'how am I doing?' — it knows your data and gives honest, actionable feedback." />
        </section>
      </main>

      <footer className="border-t border-border py-6 text-center text-xs text-muted-foreground">
        Built for compounding consistency.
      </footer>
    </div>
  );
}

function Logo() {
  return (
    <div className="grid h-8 w-8 place-items-center rounded-lg bg-foreground/5">
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 17 L10 11 L13.5 14.5 L19 7" className="text-primary" />
        <circle cx="19" cy="7" r="1.2" className="text-primary" fill="currentColor" />
      </svg>
    </div>
  );
}

function Feature({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="card-soft p-5">
      <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-accent text-accent-foreground">{icon}</div>
      <h3 className="font-display text-base font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
    </div>
  );
}
