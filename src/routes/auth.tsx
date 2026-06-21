import { createFileRoute, useNavigate, Navigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Momentum" },
      { name: "description", content: "Sign in to Momentum and start building daily momentum." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  if (loading) return <div className="min-h-screen bg-background" />;
  if (user) return <Navigate to="/today" />;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin + "/today" },
        });
        if (error) throw error;
        toast.success("Account created. You're in.");
        navigate({ to: "/today" });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: "/today" });
      }
    } catch (e: any) {
      toast.error(e.message ?? "Auth failed");
    } finally {
      setBusy(false);
    }
  };

  const onGoogle = async () => {
    setBusy(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin + "/today",
    });
    if (result.error) {
      toast.error((result.error as Error).message ?? "Google sign-in failed");
      setBusy(false);
    } else if (!result.redirected) {
      navigate({ to: "/today" });
    }
  };

  return (
    <div className="grid min-h-screen place-items-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-2xl bg-primary/15 grid place-items-center">
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 17 L10 11 L13.5 14.5 L19 7" className="text-primary" />
              <circle cx="19" cy="7" r="1.2" className="text-primary" fill="currentColor" />
            </svg>
          </div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">
            {mode === "signin" ? "Welcome back" : "Start your momentum"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === "signin" ? "Sign in to continue." : "Create an account in 10 seconds."}
          </p>
        </div>

        <button
          onClick={onGoogle}
          disabled={busy}
          className="mb-4 flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-surface py-3 text-sm font-medium hover:bg-surface-2 disabled:opacity-60"
        >
          <GoogleIcon /> Continue with Google
        </button>

        <div className="my-4 flex items-center gap-3 text-xs text-muted-foreground">
          <div className="h-px flex-1 bg-border" /> or email <div className="h-px flex-1 bg-border" />
        </div>

        <form onSubmit={onSubmit} className="space-y-3">
          <div>
            <Label htmlFor="email" className="text-xs">Email</Label>
            <Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label htmlFor="password" className="text-xs">Password</Label>
            <Input id="password" type="password" autoComplete={mode === "signup" ? "new-password" : "current-password"} required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1" />
          </div>
          <Button type="submit" disabled={busy} className="w-full rounded-xl">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : mode === "signin" ? "Sign in" : "Create account"}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          {mode === "signin" ? "New here?" : "Already have an account?"}{" "}
          <button onClick={() => setMode(mode === "signin" ? "signup" : "signin")} className="font-medium text-foreground hover:underline">
            {mode === "signin" ? "Create an account" : "Sign in"}
          </button>
        </p>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4">
      <path fill="#EA4335" d="M12 10.2v3.96h5.5c-.24 1.3-1.66 3.82-5.5 3.82-3.32 0-6.02-2.75-6.02-6.14s2.7-6.14 6.02-6.14c1.88 0 3.14.8 3.86 1.48l2.62-2.52C16.78 3.16 14.6 2.2 12 2.2 6.84 2.2 2.66 6.38 2.66 11.54S6.84 20.88 12 20.88c6.92 0 9.5-4.86 9.5-7.36 0-.5-.06-.88-.14-1.32H12z"/>
    </svg>
  );
}
