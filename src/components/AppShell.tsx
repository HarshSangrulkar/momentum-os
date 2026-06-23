import { Link, useLocation } from "@tanstack/react-router";
import { LayoutDashboard, Calendar, Target, FlaskConical, Sparkles, BarChart3, Settings as Cog, FileText, Sun, Moon, MoreHorizontal, User as UserIcon } from "lucide-react";
import { useTheme } from "@/lib/theme";
import type { ReactNode } from "react";
import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

const primaryNav = [
  { to: "/dashboard", label: "Home", icon: LayoutDashboard },
  { to: "/today", label: "Today", icon: Calendar },
  { to: "/goals", label: "Goals", icon: Target },
  { to: "/lab", label: "Lab", icon: FlaskConical },
  { to: "/coach", label: "Coach", icon: Sparkles },
] as const;

const overflowNav = [
  { to: "/profile", label: "Profile", icon: UserIcon },
  { to: "/longterm", label: "Long-term goals", icon: Target },
  { to: "/analytics", label: "Stats", icon: BarChart3 },
  { to: "/reports", label: "Reports", icon: FileText },
  { to: "/settings", label: "Settings", icon: Cog },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const { theme, toggle } = useTheme();
  const location = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);

  const allDesktop = [...primaryNav, ...overflowNav];

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Desktop sidebar */}
      <aside className="no-print fixed left-0 top-0 hidden h-screen w-60 border-r border-border bg-surface/50 px-4 py-6 md:flex md:flex-col">
        <div className="mb-8 flex items-center gap-2 px-2">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary/15">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 17 L10 11 L13.5 14.5 L19 7" className="text-primary" />
              <circle cx="19" cy="7" r="1.2" className="text-primary" fill="currentColor" />
            </svg>
          </div>
          <span className="font-display text-base font-semibold tracking-tight">Momentum</span>
        </div>
        <nav className="flex flex-1 flex-col gap-1">
          {allDesktop.map((n) => {
            const active = location.pathname.startsWith(n.to);
            const Icon = n.icon;
            return (
              <Link
                key={n.to}
                to={n.to}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                  active ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-surface-2 hover:text-foreground"
                }`}
              >
                <Icon className="h-4 w-4" />
                {n.label}
              </Link>
            );
          })}
        </nav>
        <button
          onClick={toggle}
          className="mt-2 flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-surface-2 hover:text-foreground"
        >
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          {theme === "dark" ? "Light mode" : "Dark mode"}
        </button>
      </aside>

      {/* Main */}
      <main className="md:ml-60 pb-24 md:pb-10">{children}</main>

      {/* Mobile bottom nav */}
      <nav className="no-print fixed inset-x-0 bottom-0 z-40 border-t border-border glass md:hidden">
        <div className="mx-auto grid max-w-md grid-cols-6">
          {primaryNav.map((n) => {
            const active = location.pathname.startsWith(n.to);
            const Icon = n.icon;
            return (
              <Link
                key={n.to}
                to={n.to}
                className={`flex flex-col items-center gap-1 py-2.5 text-[10px] font-medium transition ${
                  active ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <Icon className={`h-5 w-5 ${active ? "scale-110" : ""} transition`} />
                {n.label}
              </Link>
            );
          })}
          <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
            <SheetTrigger asChild>
              <button className="flex flex-col items-center gap-1 py-2.5 text-[10px] font-medium text-muted-foreground">
                <MoreHorizontal className="h-5 w-5" />
                More
              </button>
            </SheetTrigger>
            <SheetContent side="bottom" className="rounded-t-3xl">
              <SheetHeader>
                <SheetTitle className="font-display">More</SheetTitle>
              </SheetHeader>
              <div className="mt-4 grid grid-cols-2 gap-2 pb-6">
                {overflowNav.map((n) => {
                  const Icon = n.icon;
                  return (
                    <Link
                      key={n.to}
                      to={n.to}
                      onClick={() => setMoreOpen(false)}
                      className="flex flex-col items-start gap-2 rounded-2xl border border-border bg-surface-2 p-4"
                    >
                      <Icon className="h-5 w-5 text-primary" />
                      <span className="text-sm font-medium">{n.label}</span>
                    </Link>
                  );
                })}
                <button
                  onClick={() => { toggle(); }}
                  className="flex flex-col items-start gap-2 rounded-2xl border border-border bg-surface-2 p-4"
                >
                  {theme === "dark" ? <Sun className="h-5 w-5 text-primary" /> : <Moon className="h-5 w-5 text-primary" />}
                  <span className="text-sm font-medium">{theme === "dark" ? "Light mode" : "Dark mode"}</span>
                </button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
        <div className="h-[env(safe-area-inset-bottom)]" />
      </nav>
    </div>
  );
}
