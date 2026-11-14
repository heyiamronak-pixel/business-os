import { ArrowRight, Boxes, CircleHelp } from 'lucide-react';
import { Link } from 'wouter';
import { modules, settingsModule } from '@/data/modules';

export default function ModulesOverview() {
  const SettingsIcon = settingsModule.icon;
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-5 pb-28 sm:px-6 sm:py-8 lg:px-9 lg:pb-10">
      <div className="animate-enter mb-6">
        <div className="mb-3 flex size-10 items-center justify-center rounded-xl bg-[hsl(var(--accent)/0.17)] text-[hsl(var(--accent-foreground))]"><Boxes className="size-5" /></div>
        <p className="text-[10px] font-bold uppercase tracking-[0.17em] text-[hsl(var(--muted-foreground))]">Business OS map</p>
        <h2 data-testid="text-modules-title" className="mt-1 text-2xl font-semibold tracking-[-0.045em]">Modules</h2>
        <p className="mt-2 max-w-xl text-sm leading-6 text-[hsl(var(--muted-foreground))]">Choose a work area. Each module starts empty and is ready for your real records.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {modules.map((module) => {
          const Icon = module.icon;
          return (
            <Link href={`/${module.slug}`} key={module.slug} data-testid={`card-overview-module-${module.slug}`} className="group flex min-h-[112px] items-start gap-3 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 transition-colors hover:border-[hsl(var(--accent)/0.55)] hover:bg-[hsl(var(--muted)/0.4)]">
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[hsl(var(--primary)/0.07)] text-[hsl(var(--primary))]"><Icon className="size-4" strokeWidth={1.8} /></span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center justify-between gap-2 text-sm font-semibold"><span>{module.label}</span><ArrowRight className="size-3.5 text-[hsl(var(--muted-foreground))] transition-transform group-hover:translate-x-0.5" /></span>
                <span className="mt-1 block text-xs leading-5 text-[hsl(var(--muted-foreground))]">{module.description}</span>
                <span className="mt-3 block text-[10px] font-bold uppercase tracking-[0.12em] text-[hsl(var(--muted-foreground))]">No records yet</span>
              </span>
            </Link>
          );
        })}
        <Link href="/settings" data-testid="card-overview-module-settings" className="group flex min-h-[112px] items-start gap-3 rounded-2xl border border-dashed border-[hsl(var(--border))] bg-[hsl(var(--card)/0.65)] p-4 transition-colors hover:border-[hsl(var(--accent)/0.55)] hover:bg-[hsl(var(--muted)/0.4)]">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[hsl(var(--accent)/0.14)] text-[hsl(var(--accent-foreground))]"><SettingsIcon className="size-4" /></span>
          <span className="min-w-0 flex-1"><span className="flex items-center justify-between gap-2 text-sm font-semibold">Settings <ArrowRight className="size-3.5 text-[hsl(var(--muted-foreground))]" /></span><span className="mt-1 block text-xs leading-5 text-[hsl(var(--muted-foreground))]">Workspace preferences and setup</span></span>
        </Link>
      </div>

      <div className="mt-5 flex items-start gap-3 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.34)] p-4">
        <CircleHelp className="mt-0.5 size-4 shrink-0 text-[hsl(var(--muted-foreground))]" />
        <p className="text-xs leading-5 text-[hsl(var(--muted-foreground))]">Modules are intentionally quiet until you add information. Business OS never fills this view with sample activity.</p>
      </div>
    </div>
  );
}