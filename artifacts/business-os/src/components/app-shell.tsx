import * as React from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  Bell,
  Compass,
  Ellipsis,
  House,
  ListChecks,
  ShoppingBag,
} from "lucide-react";
import { Toaster } from "sonner";
import { cn } from "@/lib/utils";
import { useAppStore, useBusiness } from "@/lib/store";
import { applyPalette, buildPalette } from "@/lib/theme";
import { deriveActions, buildContext } from "@/lib/engines";
import { Button } from "@/components/ui";

const NAV = [
  { to: "/", label: "Home", icon: House, match: (p: string) => p === "/" },
  { to: "/sell", label: "Sell", icon: ShoppingBag, match: (p: string) => p.startsWith("/sell") },
  { to: "/actions", label: "Actions", icon: ListChecks, match: (p: string) => p.startsWith("/actions") },
  { to: "/advisor", label: "Advise", icon: Compass, match: (p: string) => p.startsWith("/advisor") },
  { to: "/more", label: "More", icon: Ellipsis, match: (p: string) => !["/", "/sell", "/actions", "/advisor"].includes(p) && p !== "/onboarding" },
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
      <div className="flex min-h-dvh flex-col items-center justify-center bg-background text-foreground">
        <p className="font-display text-4xl">Vestra</p>
        <p className="mt-2 text-sm text-muted-foreground">Loading workspace</p>
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
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-background">
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border/70 bg-background/90 px-4 py-3 backdrop-blur-md">
        {business.logoDataUrl ? (
          <img src={business.logoDataUrl} alt="" className="size-9 rounded-[var(--radius-sm)] object-cover" />
        ) : (
          <div className="flex size-9 items-center justify-center rounded-[var(--radius-sm)] bg-primary text-sm font-semibold text-primary-foreground">
            {business.name.slice(0, 1).toUpperCase()}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{title ?? business.name}</p>
          <p className="truncate text-xs text-muted-foreground">{business.industry}</p>
        </div>
        {action}
        <Link to="/inbox" aria-label="Notifications">
          <span className="relative inline-flex size-11 items-center justify-center rounded-[var(--radius-md)]">
            <Bell className="size-5" />
            {unread > 0 ? (
              <span className="absolute top-2 right-2 size-2 rounded-full bg-danger" />
            ) : null}
          </span>
        </Link>
      </header>
      <main className="flex-1 px-4 pt-4 pb-[calc(var(--nav-h)+var(--safe-b)+16px)]">{children}</main>
      <nav className="fixed inset-x-0 bottom-0 z-40 mx-auto w-full max-w-md border-t border-border bg-card/95 pb-[var(--safe-b)] backdrop-blur-md">
        <ul className="grid grid-cols-5">
          {NAV.map((item) => {
            const active = item.match(pathname);
            const Icon = item.icon;
            const badge = item.to === "/actions" ? actionCount : 0;
            return (
              <li key={item.to}>
                <Link
                  to={item.to}
                  className={cn(
                    "flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium",
                    active ? "text-primary" : "text-muted-foreground",
                  )}
                >
                  <span className="relative">
                    <Icon className="size-5" strokeWidth={active ? 2.4 : 1.8} />
                    {badge > 0 ? (
                      <span className="absolute -top-1.5 -right-2 min-w-4 rounded-full bg-danger px-1 text-[9px] leading-4 text-white">
                        {badge > 9 ? "9+" : badge}
                      </span>
                    ) : null}
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
    <div className="mb-4 flex items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="font-display text-3xl leading-none">{title}</h1>
        {subtitle ? <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p> : null}
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
      className="mb-3 h-11 w-full rounded-[var(--radius-lg)] border border-border bg-card px-3 text-base outline-none placeholder:text-subtle focus:ring-2 focus:ring-ring/40"
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
