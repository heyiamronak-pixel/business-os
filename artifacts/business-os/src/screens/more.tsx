import type { ComponentType } from "react";
import { Link } from "@tanstack/react-router";
import {
  Boxes,
  ChartColumn,
  CalendarCheck,
  ClipboardList,
  Megaphone,
  Package,
  Receipt,
  Settings,
  Target,
  Users,
  UserCog,
  Wallet,
  Warehouse,
} from "lucide-react";
import { AppPage, PageHeader } from "@/components/app-shell";
import { MODULE_CATALOG, type ModuleId } from "@/lib/domain";
import { useBusiness } from "@/lib/store";

const ICONS: Partial<Record<ModuleId, ComponentType<{ className?: string }>>> = {
  products: Package,
  inventory: Warehouse,
  pos: Boxes,
  sales: Receipt,
  customers: Users,
  expenses: Wallet,
  targets: Target,
  tasks: ClipboardList,
  team: UserCog,
  marketing: Megaphone,
  reports: ChartColumn,
};

export function MoreScreen() {
  const business = useBusiness();
  if (!business) return null;
  const enabled = business.moduleOrder.filter((id) => business.enabledModules.includes(id));
  const extra = business.enabledModules.filter((id) => !enabled.includes(id));
  const modules = [...enabled, ...extra];
  return (
    <AppPage>
      <PageHeader title="More" subtitle="Modules for this workspace" />
      <ul className="grid grid-cols-2 gap-2">
        {modules.map((id) => {
          const def = MODULE_CATALOG[id];
          const Icon = ICONS[id] ?? Package;
          const inner = (
            <div className="flex min-h-24 flex-col justify-between rounded-[var(--radius-xl)] border border-border bg-card p-3">
              <Icon className="size-5 text-primary" />
              <div>
                <p className="text-sm font-semibold">{def.label}</p>
                <p className="text-xs text-muted-foreground">{def.implemented ? def.description : "Coming later"}</p>
              </div>
            </div>
          );
          if (!def.implemented) {
            return <li key={id}>{inner}</li>;
          }
          return (
            <li key={id}>
              <Link to={def.path}>{inner}</Link>
            </li>
          );
        })}
        <li>
          <Link to="/attendance" className="flex min-h-24 flex-col justify-between rounded-[var(--radius-xl)] border border-border bg-card p-3">
            <CalendarCheck className="size-5 text-primary" />
            <div><p className="text-sm font-semibold">Attendance</p><p className="text-xs text-muted-foreground">GPS and selfie check-in</p></div>
          </Link>
        </li>
        <li>
          <Link to="/settings" className="flex min-h-24 flex-col justify-between rounded-[var(--radius-xl)] border border-border bg-card p-3">
            <Settings className="size-5 text-primary" />
            <div>
              <p className="text-sm font-semibold">Settings</p>
              <p className="text-xs text-muted-foreground">Theme, modules, workspaces</p>
            </div>
          </Link>
        </li>
      </ul>
    </AppPage>
  );
}
