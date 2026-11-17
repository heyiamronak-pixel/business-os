import * as React from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  Bell,
  ChartColumn,
  ChevronRight,
  Compass,
  Ellipsis,
  House,
  ListChecks,
  Settings2,
  ShoppingBag,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppStore, useBusiness } from "@/lib/store";
import { applyPalette, buildPalette } from "@/lib/theme";
import { deriveActions, buildContext } from "@/lib/engines";
import { Button } from "@/components/ui";

const MOBILE_NAV = [
  { to: "/", label: "Home", icon: House, match: (p: string) => p === "/" },
  { to: "/sell", label: "Sell", icon: ShoppingBag, match: (p: string) => p.startsWith("/sell") },
  { to: "/actions", label: "Actions", icon: ListChecks, match: (p: string) => p.startsWith("/actions") },
  { to: "/advisor", label: "AI", icon: Compass, match: (p: string) => p.startsWith("/advisor") },
  { to: "/more", label: "More", icon: Ellipsis, match: (p: string) => !["/", "/sell", "/actions", "/advisor"].includes(p) && p !== "/onboarding" },
];

const DESKTOP_NAV = [
  { to: "/", label: "Overview", icon: House },
  { to: "/sell", label: "Sales & checkout", icon: ShoppingBag },
  { to: "/reports", label: "Reports & insights", icon: ChartColumn },
  { to: "/actions", label: "Action centre", icon: ListChecks },
  { to: "/advisor", label: "Sutra AI", icon: Sparkles },
  { to: "/more", label: "All modules", icon: Ellipsis },
];

export function ThemeRuntime() {
  const business = useBusiness();
  React.useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => applyPalette(buildPalette(business ?? null, mq.matches));
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [business]);
  return null;
}

export function HydrateGate({ children }: { children: React.ReactNode }) {
  const hydrated = useAppStore((s) => s.hydrated);
  const hydrate = useAppStore((s) => s.hydrate);
  React.useEffect(() => {
    hydrate();
  }, [hydrate]);
  if (!hydrated) {
    return (
      <div className="app-backdrop flex min-h-dvh flex-col items-center justify-center text-foreground">
        <span className="grid size-14 place-items-center rounded-2xl bg-primary text-xl font-bold text-primary-foreground shadow-lg">B</span>
        <p className="mt-4 text-lg font-semibold tracking-tight">Business Sutra</p>
        <p className="mt-1 text-xs text-muted-foreground">Preparing your workspace</p>
      </div>
    );
  }
  return <>{children}</>;
}

export function AppPage({
  children,
  title,
  action,
}: {
  children: React.ReactNode;
  title?: string;
  action?: React.ReactNode;
}) {
  const business = useBusiness();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const db = useAppStore((s) => s.db);
  const unread = db.notifications.filter((n) => n.businessId === business?.id && !n.read).length;

  React.useEffect(() => {
    if (!business) navigate({ to: "/onboarding" });
  }, [business, navigate]);

  if (!business) return null;

  const ctx = buildContext(db, business);
  const actionCount = deriveActions(ctx).length;

  return (
    <div className="app-backdrop min-h-dvh text-foreground">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[264px] flex-col border-r border-white/10 bg-[#102033] px-4 py-6 text-[#E7EFF6] shadow-[12px_0_34px_rgba(15,30,48,0.08)] lg:flex">
        <Link to="/" className="mb-8 flex items-center gap-3 px-2">
          <span className="grid size-10 shrink-0 place-items-center rounded-[14px] bg-gradient-to-br from-[#1B4965] via-[#16747A] to-[#55B8AE] text-lg font-bold text-white shadow-[0_7px_18px_rgba(15,121,128,0.28)]">B</span>
          <span className="min-w-0">
            <span className="block truncate text-[15px] font-semibold tracking-[-0.035em] text-white">Business Sutra</span>
            <span className="mt-0.5 block text-[9px] font-semibold uppercase tracking-[0.18em] text-[#9DB0C2]">Everything connected</span>
          </span>
        </Link>

        <div className="mb-6 rounded-2xl border border-white/10 bg-white/[0.055] p-3.5">
          <div className="mb-2 flex items-center gap-2 text-[9px] font-bold uppercase tracking-[0.17em] text-[#94AABE]">
            <span className="size-1.5 rounded-full bg-[#59C2AE]" />
            Active workspace
          </div>
          <div className="flex items-center gap-3">
            {business.logoDataUrl ? (
              <img src={business.logoDataUrl} alt="" className="size-10 rounded-xl object-cover" />
            ) : (
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#244259] text-sm font-semibold text-white">
                {business.name.slice(0, 1).toUpperCase()}
              </span>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12px] font-semibold text-white">{business.name}</p>
              <p className="mt-1 truncate text-[10px] capitalize text-[#A9BAC9]">{business.industry.replaceAll("_", " ")}</p>
            </div>
            <ChevronRight className="size-4 shrink-0 text-[#8CA3B7]" />
          </div>
        </div>

        <div className="mb-2 px-3 text-[9px] font-bold uppercase tracking-[0.19em] text-[#7890A5]">Workspace</div>
        <nav aria-label="Desktop navigation" className="flex-1 space-y-1">
          {DESKTOP_NAV.map((item) => {
            const active = item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
            const Icon = item.icon;
            const count = item.to === "/actions" ? actionCount : 0;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "group flex min-h-11 items-center gap-3 rounded-xl border px-3 text-[12px] font-semibold transition-all duration-150",
                  active
                    ? "border-white/10 bg-white/[0.12] text-white shadow-[inset_3px_0_0_#55C5BC]"
                    : "border-transparent text-[#A9BAC9] hover:border-white/[0.06] hover:bg-white/[0.065] hover:text-white",
                )}
              >
                <Icon className={cn("size-[17px] shrink-0", active ? "text-[#6ED0C3]" : "text-[#91A6B8] group-hover:text-[#C8D7E3]")} strokeWidth={1.9} />
                <span className="min-w-0 flex-1 truncate">{item.label}</span>
                {count > 0 ? <span className="rounded-full bg-[#C25B65] px-1.5 py-0.5 text-[9px] font-bold text-white">{count > 9 ? "9+" : count}</span> : null}
              </Link>
            );
          })}
        </nav>

        <div className="mt-5 border-t border-white/10 pt-4">
          <Link to="/settings" className={cn("flex min-h-11 items-center gap-3 rounded-xl px-3 text-[12px] font-semibold transition-colors", pathname.startsWith("/settings") ? "bg-white/[0.12] text-white" : "text-[#A9BAC9] hover:bg-white/[0.065] hover:text-white")}>
            <Settings2 className="size-[17px] text-[#91A6B8]" />
            Workspace settings
          </Link>
          <div className="mt-4 flex items-center gap-2 px-3 text-[9px] font-medium uppercase tracking-[0.14em] text-[#7890A5]">
            <span className="size-1.5 rounded-full bg-[#D2A45C]" />
            Development preview
          </div>
        </div>
      </aside>

      <div className="flex min-h-dvh min-w-0 flex-col lg:ml-[264px]">
        <header className="sticky top-0 z-30 flex min-h-[68px] items-center gap-3 border-b border-border/80 bg-card/85 px-4 backdrop-blur-xl sm:px-6 lg:px-8">
          <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-[#1B4965] via-[#16747A] to-[#55B8AE] text-sm font-bold text-white shadow-sm lg:hidden">B</div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="hidden text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground sm:inline">Business Sutra</span>
              <span className="hidden size-1 rounded-full bg-border sm:inline-block" />
              <span className="truncate text-sm font-semibold tracking-[-0.02em]">{title ?? business.name}</span>
            </div>
          </div>
          {action}
          <Link
            to="/inbox"
            aria-label={unread > 0 ? `Notifications, ${unread} unread` : "Notifications"}
            className="relative grid size-10 shrink-0 place-items-center rounded-xl border border-border bg-card text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <Bell className="size-[17px]" />
            {unread > 0 ? <span className="absolute right-2 top-2 size-2 rounded-full border-2 border-card bg-[#D65A66]" /> : null}
          </Link>
        </header>

        <main key={pathname} className="app-main-enter mx-auto w-full max-w-[1440px] flex-1 px-4 pb-[calc(var(--nav-h)+var(--safe-b)+24px)] pt-6 sm:px-6 sm:pt-8 lg:px-9 lg:pb-12 lg:pt-9">
          {children}
        </main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-40 mx-auto w-full border-t border-border/90 bg-card/92 pb-[var(--safe-b)] shadow-[0_-6px_24px_rgba(19,43,61,0.06)] backdrop-blur-xl lg:hidden">
        <ul className="mx-auto grid h-16 max-w-xl grid-cols-5">
          {MOBILE_NAV.map((item) => {
            const active = item.match(pathname);
            const Icon = item.icon;
            const badge = item.to === "/actions" ? actionCount : 0;
            return (
              <li key={item.to}>
                <Link
                  to={item.to}
                  className={cn(
                    "relative flex h-full flex-col items-center justify-center gap-1 text-[10px] font-semibold transition-colors",
                    active ? "text-primary" : "text-muted-foreground",
                  )}
                >
                  <span className={cn("relative grid size-8 place-items-center rounded-xl transition-colors", active && "bg-primary/10")}>
                    <Icon className="size-[18px]" strokeWidth={active ? 2.2 : 1.8} />
                    {badge > 0 ? <span className="absolute -right-1 -top-0.5 min-w-4 rounded-full bg-[#C25B65] px-1 text-[9px] leading-4 text-white">{badge > 9 ? "9+" : badge}</span> : null}
                  </span>
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="font-display text-[1.8rem] font-semibold leading-tight tracking-[-0.055em] sm:text-[2rem]">{title}</h1>
        {subtitle ? <p className="mt-1.5 text-[13px] leading-5 text-muted-foreground">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function SearchField({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="mb-3 h-12 w-full rounded-[var(--radius-lg)] border border-border bg-card px-4 text-sm shadow-[0_1px_2px_rgba(19,43,61,0.025)] outline-none transition-[box-shadow,border-color] placeholder:text-subtle focus:border-primary/45 focus:ring-4 focus:ring-ring/10"
    />
  );
}

export function ConfirmBar({
  onCancel,
  onConfirm,
  confirmLabel,
  danger,
  disabled,
}: {
  onCancel: () => void;
  onConfirm: () => void;
  confirmLabel: string;
  danger?: boolean;
  disabled?: boolean;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <Button variant="secondary" onClick={onCancel}>
        Cancel
      </Button>
      <Button variant={danger ? "danger" : "default"} onClick={onConfirm} disabled={disabled}>
        {confirmLabel}
      </Button>
    </div>
  );
}
