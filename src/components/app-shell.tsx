"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Receipt,
  PieChart,
  TrendingUp,
  Wallet,
  Plus,
  Tag,
  Settings,
  Moon,
  Sun,
  LogOut,
  CalendarDays,
  Repeat,
} from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useHousehold, useProfile, useSession } from "@/lib/hooks/use-household";

const NAV = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/expenses", label: "Expenses", icon: Receipt },
  { href: "/investments", label: "Investments", icon: TrendingUp },
  { href: "/income", label: "Income", icon: Wallet },
  { href: "/budgets", label: "Budgets", icon: PieChart },
  { href: "/yearly", label: "Yearly", icon: CalendarDays },
];

const SECONDARY = [
  { href: "/transactions", label: "Transactions", icon: Receipt },
  { href: "/categories", label: "Categories", icon: Tag },
  { href: "/recurring", label: "Recurring", icon: Repeat },
  { href: "/settings", label: "Settings", icon: Settings },
];

const MOBILE_NAV = [
  { href: "/", label: "Home", icon: LayoutDashboard },
  { href: "/expenses", label: "Expenses", icon: Receipt },
  { href: "/add", label: "Add", icon: Plus, primary: true },
  { href: "/investments", label: "Invest", icon: TrendingUp },
  { href: "/transactions", label: "Log", icon: Tag },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, isLoading: sLoading } = useSession();
  const { data: profile, isLoading: pLoading } = useProfile();
  const { data: household, isLoading: hLoading } = useHousehold();

  const ready = !sLoading && !pLoading && !hLoading;

  React.useEffect(() => {
    if (!ready) return;
    if (!session) return;
    if (!profile?.household_id && pathname !== "/onboarding") {
      router.replace("/onboarding");
    }
  }, [ready, session, profile, pathname, router]);

  if (!ready) {
    return (
      <div className="min-h-screen grid place-items-center">
        <div className="h-10 w-10 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
      </div>
    );
  }

  if (!profile?.household_id) {
    // Render children (onboarding page) without shell
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen flex">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:w-64 lg:w-72 flex-col border-r bg-card/50">
        <div className="px-5 py-5 flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-primary/15 text-primary grid place-items-center">
            <Wallet className="h-5 w-5" />
          </div>
          <div>
            <div className="font-semibold leading-tight">Duddify</div>
            <div className="text-xs text-muted-foreground truncate">
              {household?.name}
            </div>
          </div>
        </div>
        <nav className="px-3 py-2 space-y-1">
          <div className="px-2 py-1.5 text-[11px] uppercase tracking-wider text-muted-foreground">
            Dashboards
          </div>
          {NAV.map((item) => (
            <NavLink key={item.href} {...item} active={pathname === item.href} />
          ))}
          <div className="px-2 pt-4 pb-1.5 text-[11px] uppercase tracking-wider text-muted-foreground">
            Manage
          </div>
          {SECONDARY.map((item) => (
            <NavLink
              key={item.href}
              {...item}
              active={pathname.startsWith(item.href) && item.href !== "/"}
            />
          ))}
        </nav>
        <div className="mt-auto p-3 space-y-2">
          <Button asChild size="lg" className="w-full">
            <Link href="/add">
              <Plus /> Add transaction
            </Link>
          </Button>
          <UserBlock />
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile top bar */}
        <header className="md:hidden sticky top-0 z-30 bg-background/85 backdrop-blur border-b safe-top">
          <div className="flex items-center justify-between px-4 h-12">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-primary/15 text-primary grid place-items-center">
                <Wallet className="h-4 w-4" />
              </div>
              <div className="font-semibold text-sm truncate max-w-[140px]">
                {household?.name}
              </div>
            </div>
            <ThemeToggle />
          </div>
        </header>

        <main className="flex-1 pb-24 md:pb-6">{children}</main>

        {/* Mobile bottom nav */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t bg-background/95 backdrop-blur safe-bottom">
          <div className="grid grid-cols-5">
            {MOBILE_NAV.map((item) => {
              const active = pathname === item.href;
              if (item.primary) {
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex justify-center -mt-5"
                  >
                    <span className="h-12 w-12 rounded-full bg-primary text-primary-foreground grid place-items-center shadow-lg shadow-primary/30">
                      <Plus className="h-6 w-6" />
                    </span>
                  </Link>
                );
              }
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex flex-col items-center justify-center py-2 text-[11px] gap-0.5",
                    active ? "text-primary" : "text-muted-foreground"
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
}

function NavLink({
  href,
  label,
  icon: Icon,
  active,
}: {
  href: string;
  label: string;
  icon: any;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
        active
          ? "bg-primary/10 text-primary font-medium"
          : "text-muted-foreground hover:bg-accent hover:text-foreground"
      )}
    >
      <Icon className="h-[18px] w-[18px]" />
      {label}
    </Link>
  );
}

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);
  if (!mounted) return <div className="h-9 w-9" />;
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      aria-label="Toggle theme"
    >
      {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  );
}

function UserBlock() {
  const { data: profile } = useProfile();
  return (
    <div className="flex items-center gap-2 px-2">
      <div className="h-8 w-8 rounded-full bg-muted overflow-hidden grid place-items-center text-xs">
        {profile?.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
        ) : (
          (profile?.display_name ?? "U").slice(0, 1).toUpperCase()
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs font-medium truncate">{profile?.display_name}</div>
        <div className="text-[10px] text-muted-foreground truncate">{profile?.email}</div>
      </div>
      <ThemeToggle />
      <form action="/auth/signout" method="post">
        <Button variant="ghost" size="icon" type="submit" aria-label="Sign out">
          <LogOut className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}
