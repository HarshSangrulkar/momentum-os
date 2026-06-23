import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";
import { useCategories, useCreateCategory, useDeleteCategory } from "@/lib/data";
import { useNotifPrefs, useUpsertNotifPrefs } from "@/lib/intel-data";
import { generateWeeklyReport } from "@/lib/intelligence.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { LogOut, Plus, Sun, Moon, Trash2, Bell, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/settings")({
  head: () => ({ meta: [{ title: "Settings — Momentum" }] }),
  component: SettingsPage,
});

const PALETTE = ["#22c55e", "#3b82f6", "#a855f7", "#eab308", "#ec4899", "#06b6d4", "#f97316", "#ef4444"];

function SettingsPage() {
  const { user, signOut } = useAuth();
  const { theme, toggle } = useTheme();
  const { data: cats = [] } = useCategories();
  const create = useCreateCategory();
  const del = useDeleteCategory();
  const navigate = useNavigate();
  const { data: notif } = useNotifPrefs();
  const upsertNotif = useUpsertNotifPrefs();
  const runWeekly = useServerFn(generateWeeklyReport);
  const [reportBusy, setReportBusy] = useState(false);

  const [name, setName] = useState("");
  const [color, setColor] = useState(PALETTE[0]);

  const triggerWeekly = async () => {
    setReportBusy(true);
    try {
      await runWeekly();
      toast.success("Weekly report ready — see Reports");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed");
    } finally {
      setReportBusy(false);
    }
  };

  const requestNotifPerm = async () => {
    if (typeof Notification === "undefined") return toast.error("Browser notifications not supported");
    const res = await Notification.requestPermission();
    if (res === "granted") {
      new Notification("Momentum", { body: "Smart nudges are on. I'll only ping when it matters." });
      toast.success("Notifications enabled");
    } else {
      toast.error("Permission denied");
    }
  };

  const onLogout = async () => {
    await signOut();
    navigate({ to: "/auth", replace: true });
  };

  const addCat = () => {
    if (!name.trim()) return;
    create.mutate(
      { name: name.trim(), color, icon: "sparkles" },
      {
        onSuccess: () => { setName(""); toast.success("Category added"); },
        onError: (e: any) => toast.error(e.message),
      },
    );
  };

  return (
    <div className="mx-auto max-w-3xl px-4 pt-6 sm:px-6 sm:pt-10">
      <h1 className="font-display text-3xl font-semibold tracking-tight">Settings</h1>

      <section className="card-soft mt-6 p-5">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">Account</p>
        <p className="mt-2 font-medium">{user?.email}</p>
        <Button variant="outline" onClick={onLogout} className="mt-4 rounded-full">
          <LogOut className="h-4 w-4" /> Sign out
        </Button>
      </section>

      <section className="card-soft mt-4 p-5">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">Appearance</p>
        <button
          onClick={toggle}
          className="mt-3 flex w-full items-center justify-between rounded-xl border border-border bg-surface-2 p-3"
        >
          <span className="flex items-center gap-3">
            {theme === "dark" ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
            <span className="font-medium">{theme === "dark" ? "Dark mode" : "Light mode"}</span>
          </span>
          <span className="text-xs text-muted-foreground">Tap to switch</span>
        </button>
      </section>

      <section className="card-soft mt-4 p-5">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">Intelligence</p>
        <div className="mt-3 flex items-center justify-between rounded-xl border border-border bg-surface-2 p-3">
          <div className="flex items-center gap-3">
            <Bell className="h-5 w-5 text-primary" />
            <div>
              <p className="font-medium">Smart nudges</p>
              <p className="text-xs text-muted-foreground">Context-aware, not generic reminders.</p>
            </div>
          </div>
          <Switch
            checked={notif?.smart_nudges ?? true}
            onCheckedChange={(v) => upsertNotif.mutate({ smart_nudges: v })}
          />
        </div>
        <div className="mt-2 flex items-center justify-between rounded-xl border border-border bg-surface-2 p-3">
          <div className="flex items-center gap-3">
            <FileText className="h-5 w-5 text-primary" />
            <div>
              <p className="font-medium">Weekly report</p>
              <p className="text-xs text-muted-foreground">AI-written review every Sunday.</p>
            </div>
          </div>
          <Switch
            checked={notif?.weekly_report ?? true}
            onCheckedChange={(v) => upsertNotif.mutate({ weekly_report: v })}
          />
        </div>
        <Button variant="outline" onClick={requestNotifPerm} className="mt-3 w-full rounded-full">
          Enable browser notifications
        </Button>
        <Button onClick={triggerWeekly} disabled={reportBusy} className="mt-2 w-full rounded-full">
          {reportBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
          Generate weekly report now
        </Button>
      </section>


      <section className="card-soft mt-4 p-5">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">Categories</p>
        <ul className="mt-3 space-y-2">
          {cats.map((c) => (
            <li key={c.id} className="flex items-center gap-3 rounded-lg border border-border bg-surface-2 p-3">
              <span className="h-3 w-3 rounded-full" style={{ background: c.color }} />
              <span className="flex-1 font-medium">{c.name}</span>
              <button
                onClick={() => del.mutate(c.id, { onError: (e: any) => toast.error(e.message) })}
                className="rounded-lg p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>

        <div className="mt-4 space-y-2">
          <Label className="text-xs">Add category</Label>
          <div className="flex gap-2">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Mindfulness" />
            <Button onClick={addCat}><Plus className="h-4 w-4" /></Button>
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            {PALETTE.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className={`h-7 w-7 rounded-full ring-offset-2 ring-offset-background transition ${color === c ? "ring-2 ring-primary" : ""}`}
                style={{ background: c }}
                aria-label={c}
              />
            ))}
          </div>
        </div>
      </section>

      <p className="mt-8 text-center text-xs text-muted-foreground">Momentum · v1.0</p>
    </div>
  );
}
