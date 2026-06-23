import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { User as UserIcon, Save, LogOut } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/profile")({
  head: () => ({ meta: [{ title: "Profile — Momentum" }] }),
  component: ProfilePage,
});

type Profile = {
  id: string;
  display_name: string | null;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  date_of_birth: string | null;
  gender: string | null;
  location: string | null;
  timezone: string | null;
  occupation: string | null;
  height_cm: number | null;
  weight_kg: number | null;
  focus_areas: string[] | null;
  motivation: string | null;
  wake_time: string | null;
  sleep_time: string | null;
};

const FOCUS_PRESETS = ["Fitness", "Career", "Learning", "Mindfulness", "Finance", "Relationships", "Creativity", "Health"];

function ProfilePage() {
  const { user, signOut } = useAuth();
  const qc = useQueryClient();

  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<Profile | null> => {
      const { data, error } = await supabase.from("profiles").select("*").eq("id", user!.id).maybeSingle();
      if (error) throw error;
      return (data as Profile | null) ?? null;
    },
  });

  const save = useMutation({
    mutationFn: async (patch: Partial<Profile>) => {
      if (!user) throw new Error("not signed in");
      const tz = patch.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
      const { error } = await supabase
        .from("profiles")
        .upsert({ id: user.id, timezone: tz, ...patch }, { onConflict: "id" });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["profile"] });
      toast.success("Profile saved");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const [form, setForm] = useState<Partial<Profile>>({});
  useEffect(() => {
    if (profile) setForm(profile);
    else if (user)
      setForm({
        display_name: (user.user_metadata as any)?.name ?? user.email?.split("@")[0] ?? "",
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      });
  }, [profile, user]);

  const set = <K extends keyof Profile>(k: K, v: Profile[K]) => setForm((f) => ({ ...f, [k]: v }));
  const toggleFocus = (f: string) => {
    const cur = new Set(form.focus_areas ?? []);
    cur.has(f) ? cur.delete(f) : cur.add(f);
    set("focus_areas", Array.from(cur));
  };

  if (isLoading) return <div className="mx-auto max-w-3xl p-6 text-sm text-muted-foreground">Loading…</div>;

  return (
    <div className="mx-auto max-w-3xl px-4 pt-6 sm:px-6 sm:pt-10">
      <header className="mb-6 flex items-center gap-3">
        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-primary/15">
          <UserIcon className="h-6 w-6 text-primary" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{user?.email}</p>
          <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">Your profile</h1>
        </div>
      </header>

      <p className="mb-4 text-sm text-muted-foreground">
        The more your AI coach knows about you, the more personal its guidance becomes. Everything stays private to your account.
      </p>

      <Section title="Identity">
        <Grid>
          <Field label="Display name">
            <Input value={form.display_name ?? ""} onChange={(e) => set("display_name", e.target.value)} placeholder="What should we call you?" />
          </Field>
          <Field label="Full name">
            <Input value={form.full_name ?? ""} onChange={(e) => set("full_name", e.target.value)} placeholder="Optional" />
          </Field>
          <Field label="Date of birth">
            <Input type="date" value={form.date_of_birth ?? ""} onChange={(e) => set("date_of_birth", e.target.value || null)} />
          </Field>
          <Field label="Gender">
            <Select value={form.gender ?? ""} onValueChange={(v) => set("gender", v || null)}>
              <SelectTrigger><SelectValue placeholder="Prefer not to say" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="male">Male</SelectItem>
                <SelectItem value="female">Female</SelectItem>
                <SelectItem value="non_binary">Non-binary</SelectItem>
                <SelectItem value="other">Other</SelectItem>
                <SelectItem value="prefer_not">Prefer not to say</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </Grid>
      </Section>

      <Section title="Context">
        <Grid>
          <Field label="Location">
            <Input value={form.location ?? ""} onChange={(e) => set("location", e.target.value)} placeholder="City, country" />
          </Field>
          <Field label="Timezone">
            <Input value={form.timezone ?? ""} onChange={(e) => set("timezone", e.target.value)} placeholder="Asia/Kolkata" />
          </Field>
          <Field label="Occupation">
            <Input value={form.occupation ?? ""} onChange={(e) => set("occupation", e.target.value)} placeholder="Student, engineer…" />
          </Field>
        </Grid>
      </Section>

      <Section title="Body">
        <Grid>
          <Field label="Height (cm)">
            <Input type="number" value={form.height_cm ?? ""} onChange={(e) => set("height_cm", e.target.value === "" ? null : Number(e.target.value))} />
          </Field>
          <Field label="Weight (kg)">
            <Input type="number" value={form.weight_kg ?? ""} onChange={(e) => set("weight_kg", e.target.value === "" ? null : Number(e.target.value))} />
          </Field>
          <Field label="Wake time">
            <Input type="time" value={form.wake_time ?? ""} onChange={(e) => set("wake_time", e.target.value || null)} />
          </Field>
          <Field label="Sleep time">
            <Input type="time" value={form.sleep_time ?? ""} onChange={(e) => set("sleep_time", e.target.value || null)} />
          </Field>
        </Grid>
      </Section>

      <Section title="What you're working on">
        <div className="mb-2 flex flex-wrap gap-2">
          {FOCUS_PRESETS.map((f) => {
            const active = (form.focus_areas ?? []).includes(f);
            return (
              <button
                key={f}
                type="button"
                onClick={() => toggleFocus(f)}
                className={`rounded-full border px-3 py-1.5 text-xs transition ${
                  active ? "border-primary bg-primary/10 text-primary" : "border-border bg-surface-2 text-muted-foreground hover:text-foreground"
                }`}
              >
                {f}
              </button>
            );
          })}
        </div>
        <Field label="Bio">
          <Textarea
            value={form.bio ?? ""}
            onChange={(e) => set("bio", e.target.value)}
            placeholder="Who you are in one paragraph."
            className="min-h-20"
          />
        </Field>
        <div className="mt-3" />
        <Field label="Why you're here · your motivation">
          <Textarea
            value={form.motivation ?? ""}
            onChange={(e) => set("motivation", e.target.value)}
            placeholder="What does success look like in 12 months? What's the deeper why?"
            className="min-h-24"
          />
        </Field>
      </Section>

      <div className="sticky bottom-24 z-10 mt-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between md:bottom-4">
        <Button onClick={() => save.mutate(form)} disabled={save.isPending} className="rounded-full">
          <Save className="h-4 w-4" /> {save.isPending ? "Saving…" : "Save profile"}
        </Button>
        <Button variant="ghost" onClick={signOut} className="rounded-full text-muted-foreground">
          <LogOut className="h-4 w-4" /> Sign out
        </Button>
      </div>
      <div className="h-12" />
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="card-soft mb-4 p-4">
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</h2>
      {children}
    </section>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{children}</div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <div className="mt-1">{children}</div>
    </div>
  );
}
