"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "motion/react";
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
  Menu as MenuIcon,
  ListOrdered,
  Copy,
  FileBarChart,
} from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { useHousehold, useProfile, useSession } from "@/lib/hooks/use-household";
import { PrivacyToggle } from "@/components/private-value";
import { BiometricGate } from "@/components/biometric-gate";
import { CommandPalette } from "@/components/command-palette";
import { ChatFab } from "@/components/chat-fab";
import { useFeatureFlags } from "@/lib/feature-flags";
import { toast } from "sonner";
import { Target } from "lucide-react";

type NavItem = {
  href: string;
  label: string;
  icon: any;
  /** If set, item is hidden unless this feature-flag key is enabled. */
  requiresFlag?: "ai" | "goals" | "investments";
};

const NAV: NavItem[] = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/expenses", label: "Expenses", icon: Receipt },
  { href: "/investments", label: "Investments", icon: TrendingUp, requiresFlag: "investments" },
  { href: "/income", label: "Income", icon: Wallet },
  { href: "/budgets", label: "Budgets", icon: PieChart },
  { href: "/goals", label: "Goals", icon: Target, requiresFlag: "goals" },
  { href: "/yearly", label: "Yearly", icon: CalendarDays },
  { href: "/reports", label: "Reports", icon: FileBarChart },
];

const SECONDARY: NavItem[] = [
  { href: "/transactions", label: "All transactions", icon: ListOrdered },
  { href: "/categories", label: "Categories", icon: Tag },
  { href: "/recurring", label: "Recurring", icon: Repeat },
  { href: "/settings", label: "Settings", icon: Settings },
];

const MOBILE_NAV: (NavItem & { primary?: boolean })[] = [
  { href: "/", label: "Home", icon: LayoutDashboard },
  { href: "/expenses", label: "Spend", icon: Receipt },
  { href: "/add", label: "Add", icon: Plus, primary: true },
  { href: "/investments", label: "Invest", icon: TrendingUp, requiresFlag: "investments" },
  { href: "/transactions", label: "All", icon: ListOrdered },
];

/** Returns only nav items whose required flag is enabled (or no flag). */
function visibleItems<T extends NavItem>(items: T[], flags: Record<string, boolean>): T[] {
  return items.filter((item) => !item.requiresFlag || flags[item.requiresFlag]);
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const { data: session, isLoading: sLoading } = useSession();
  const { data: profile, isLoading: pLoading } = useProfile();
  const { data: household, isLoading: hLoading } = useHousehold();
  const { flags } = useFeatureFlags();
  const visibleNav = React.useMemo(() => visibleItems(NAV, flags as any), [flags]);
  const visibleMobile = React.useMemo(
    () => visibleItems(MOBILE_NAV, flags as any),
    [flags]
  );

  // Note: the boot splash has been removed entirely. It was causing the
  // "grey grid screen reappears every now and then" UX where one user
  // saw it every login. The app shell now renders immediately on every
  // page load; individual pages handle their own loading states via
  // skeletons / empty states, which is far less jarring than a blocking
  // full-screen splash that might or might not auto-dismiss in time.
  const ready = !sLoading && !pLoading && !hLoading;

  React.useEffect(() => {
    if (!ready) return;
    if (!session) return;
    if (!profile?.household_id && pathname !== "/onboarding") {
      router.replace("/onboarding");
    }
  }, [ready, session, profile, pathname, router]);

  React.useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  // While auth/profile is still settling on a cold load, render a minimal
  // wrapper so users see *something* immediately. Once profile + household
  // resolve, the full nav shell snaps in. This avoids any blocking screen.
  if (!ready) {
    return <BootShell>{children}</BootShell>;
  }

  if (!profile?.household_id) {
    return <BiometricGate>{children}</BiometricGate>;
  }

  return (
    <BiometricGate>
    <CommandPalette />
    <ChatFab />
    <div className="min-h-screen flex">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:w-64 lg:w-72 flex-col border-r glass">
        <div className="px-5 py-5 flex items-center gap-2.5">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 22 }}
            className="h-9 w-9 rounded-xl gradient-primary text-primary-foreground grid place-items-center shadow-lg shadow-primary/30"
          >
            <Wallet className="h-5 w-5" />
          </motion.div>
          <div>
            <div className="font-semibold leading-tight tracking-tight">Duddify</div>
            <div className="text-xs text-muted-foreground truncate">{household?.name}</div>
          </div>
        </div>
        <nav className="px-3 py-2 space-y-1">
          <div className="px-2 py-1.5 text-[11px] uppercase tracking-wider text-muted-foreground">
            Dashboards
          </div>
          {visibleNav.map((item) => (
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
          <button
            type="button"
            className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-xs text-muted-foreground hover:bg-accent transition-colors"
            onClick={() => {
              window.dispatchEvent(
                new KeyboardEvent("keydown", { key: "k", metaKey: true })
              );
            }}
            aria-label="Open command palette"
          >
            <span className="flex items-center gap-1.5">
              <MenuIcon className="h-3.5 w-3.5" /> Search & jump
            </span>
            <kbd className="hidden lg:inline-flex h-5 select-none items-center rounded border bg-muted px-1.5 text-[10px] font-mono">
              ⌘K
            </kbd>
          </button>
          <UserBlock />
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile top bar */}
        <header className="md:hidden sticky top-0 z-30 glass-strong border-b safe-top">
          <div className="flex items-center justify-between px-3 h-14">
            <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Menu">
                  <MenuIcon className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-[85%] max-w-sm">
                <MobileDrawer />
              </SheetContent>
            </Sheet>

            <div className="flex items-center gap-2">
              <motion.div
                initial={{ rotate: -10, scale: 0.85, opacity: 0 }}
                animate={{ rotate: 0, scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 280, damping: 22 }}
                className="h-7 w-7 rounded-lg gradient-primary text-primary-foreground grid place-items-center shadow-md shadow-primary/30"
              >
                <Wallet className="h-4 w-4" />
              </motion.div>
              <div className="font-semibold text-sm truncate max-w-[160px] tracking-tight">
                {household?.name}
              </div>
            </div>

            <div className="flex items-center gap-0.5">
              <PrivacyToggle />
              <ThemeToggle />
            </div>
          </div>
        </header>

        <main className="flex-1 pb-28 md:pb-6">{children}</main>

        {/* Mobile bottom nav with iOS-style sliding pill */}
        <MobileBottomNav pathname={pathname} items={visibleMobile} />
      </div>
    </div>
    </BiometricGate>
  );
}

function MobileBottomNav({
  pathname,
  items,
}: {
  pathname: string;
  items: (NavItem & { primary?: boolean })[];
}) {
  const cols = items.length;
  const colPct = 100 / Math.max(1, cols);
  const activeIdx = items.findIndex((i) => i.href === pathname && !i.primary);
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t glass-strong safe-bottom">
      <div
        className="relative"
        style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
      >
        {/* Sliding active indicator */}
        {activeIdx >= 0 && (
          <motion.div
            layoutId="bottom-nav-pill"
            className="absolute top-1.5 bottom-1.5 rounded-xl bg-primary/10 ring-1 ring-primary/20 pointer-events-none"
            style={{
              left: `${activeIdx * colPct + 1}%`,
              width: `${colPct - 2}%`,
            }}
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
          />
        )}
        {items.map((item) => {
          const active = pathname === item.href;
          if (item.primary) {
            return (
              <Link key={item.href} href={item.href} className="flex justify-center -mt-6 relative">
                <motion.span
                  whileTap={{ scale: 0.92 }}
                  whileHover={{ scale: 1.06 }}
                  transition={{ type: "spring", stiffness: 350, damping: 18 }}
                  className="h-14 w-14 rounded-full gradient-primary text-primary-foreground grid place-items-center animate-pulse-glow"
                >
                  <Plus className="h-7 w-7" strokeWidth={2.5} />
                </motion.span>
              </Link>
            );
          }
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center py-2.5 text-[10.5px] gap-0.5 relative z-10 transition-colors",
                active ? "text-primary font-medium" : "text-muted-foreground"
              )}
            >
              <item.icon className="h-[18px] w-[18px]" strokeWidth={active ? 2.3 : 2} />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

function MobileDrawer() {
  const pathname = usePathname();
  const { data: profile } = useProfile();
  const { data: household } = useHousehold();
  const { flags } = useFeatureFlags();
  const visibleNav = React.useMemo(() => visibleItems(NAV, flags as any), [flags]);

  const copyHouseholdId = () => {
    if (!household) return;
    navigator.clipboard.writeText(household.id);
    toast.success("Household ID copied — share with your partner to invite them");
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-5 py-5 border-b">
        <div className="flex items-center gap-2.5 mb-3">
          <div className="h-10 w-10 rounded-xl bg-primary/15 text-primary grid place-items-center">
            <Wallet className="h-5 w-5" />
          </div>
          <div>
            <div className="font-semibold leading-tight">Duddify</div>
            <div className="text-xs text-muted-foreground truncate">{household?.name}</div>
          </div>
        </div>
        <button
          onClick={copyHouseholdId}
          className="flex items-center gap-2 w-full text-xs text-muted-foreground hover:text-foreground transition-colors py-1.5 px-2 rounded-md hover:bg-accent"
        >
          <Copy className="h-3 w-3" />
          Tap to copy household ID (invite partner)
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
        <div className="px-2 py-1.5 text-[11px] uppercase tracking-wider text-muted-foreground">
          Dashboards
        </div>
        {visibleNav.map((item) => (
          <DrawerLink key={item.href} {...item} active={pathname === item.href} />
        ))}

        <div className="px-2 pt-4 pb-1.5 text-[11px] uppercase tracking-wider text-muted-foreground">
          Manage
        </div>
        {SECONDARY.map((item) => (
          <DrawerLink
            key={item.href}
            {...item}
            active={pathname.startsWith(item.href) && item.href !== "/"}
          />
        ))}
      </nav>

      <div className="border-t p-3">
        <div className="flex items-center gap-2 px-2 py-2">
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
          <form action="/auth/signout" method="post">
            <Button variant="ghost" size="icon" type="submit" aria-label="Sign out">
              <LogOut className="h-4 w-4" />
            </Button>
          </form>
        </div>
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

function DrawerLink({
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
    <SheetClose asChild>
      <Link
        href={href}
        className={cn(
          "flex items-center gap-3 px-3 py-3 rounded-lg text-sm transition-colors",
          active
            ? "bg-primary/10 text-primary font-medium"
            : "text-foreground hover:bg-accent"
        )}
      >
        <Icon className="h-5 w-5" />
        {label}
      </Link>
    </SheetClose>
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
      <PrivacyToggle />
      <ThemeToggle />
      <form action="/auth/signout" method="post">
        <Button variant="ghost" size="icon" type="submit" aria-label="Sign out">
          <LogOut className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}

/**
 * Minimal non-blocking wrapper rendered while auth / profile / household
 * queries are still resolving on a cold load. No full-screen takeover, no
 * grids, no fancy logo — just a thin top bar with a subtle progress shimmer
 * so the page feels alive. The page's own children render below with their
 * own loading skeletons. The moment `ready` flips true, AppShell snaps to
 * the full nav layout.
 */
function BootShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <div
        className="h-1 w-full overflow-hidden bg-transparent"
        aria-hidden="true"
      >
        <motion.div
          initial={{ x: "-100%" }}
          animate={{ x: "100%" }}
          transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
          className="h-full w-1/3 rounded-full bg-gradient-to-r from-transparent via-primary to-transparent"
        />
      </div>
      <main className="flex-1 pb-28 md:pb-6">{children}</main>
    </div>
  );
}
