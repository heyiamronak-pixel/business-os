import { Link } from 'wouter';
import { ArrowRight, Compass, Construction, Sparkles } from 'lucide-react';
import type { ModuleDefinition } from '@/data/modules';

const accentStyles = {
  coral: {
    icon: 'bg-[hsl(var(--accent)/0.17)] text-[hsl(var(--accent-foreground))]',
    line: 'bg-[hsl(var(--accent))]',
  },
  teal: {
    icon: 'bg-[hsl(var(--chart-2)/0.14)] text-[hsl(var(--chart-2))]',
    line: 'bg-[hsl(var(--chart-2))]',
  },
  gold: {
    icon: 'bg-[hsl(var(--chart-4)/0.18)] text-[hsl(var(--foreground))]',
    line: 'bg-[hsl(var(--chart-4))]',
  },
  slate: {
    icon: 'bg-[hsl(var(--primary)/0.09)] text-[hsl(var(--primary))]',
    line: 'bg-[hsl(var(--primary))]',
  },
};

export function EmptyModule({ module }: { module: ModuleDefinition }) {
  const Icon = module.icon;
  const styles = accentStyles[module.accent];

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-7 sm:px-6 sm:py-10 lg:px-9">
      <div className="animate-enter flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className={`grid size-12 shrink-0 place-items-center rounded-2xl ${styles.icon}`}><Icon className="size-5" strokeWidth={1.8} /></div>
          <div>
            <div className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[hsl(var(--muted-foreground))]"><span className={`size-1.5 rounded-full ${styles.line}`} /> Future module</div>
            <h2 data-testid={`text-module-title-${module.slug}`} className="text-2xl font-semibold tracking-[-0.045em] sm:text-3xl">{module.label}</h2>
            <p className="mt-2 max-w-lg text-sm leading-6 text-[hsl(var(--muted-foreground))]">{module.description}</p>
          </div>
        </div>
      </div>

      <section className="animate-enter animate-enter-delay-1 relative overflow-hidden rounded-3xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 shadow-[0_14px_50px_hsl(var(--foreground)/0.04)] sm:p-10">
        <div className="pointer-events-none absolute -right-20 -top-20 size-60 rounded-full bg-[hsl(var(--accent)/0.08)] blur-3xl" />
        <div className="relative max-w-xl">
          <div className="mb-5 flex size-11 items-center justify-center rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-[hsl(var(--primary))]"><Construction className="size-5" /></div>
          <h3 data-testid={`text-module-status-${module.slug}`} className="text-xl font-semibold tracking-[-0.035em]">Ready when you are.</h3>
          <p className="mt-3 text-sm leading-6 text-[hsl(var(--muted-foreground))]">This space is prepared for your {module.label.toLowerCase()} setup. Once a workspace is connected, your team will find the tools, views, and signals for this area here.</p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Link href="/settings" data-testid={`link-module-setup-${module.slug}`} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-4 text-sm font-semibold text-[hsl(var(--primary-foreground))] transition-transform hover:-translate-y-0.5">
              Prepare workspace <ArrowRight className="size-4" />
            </Link>
            <Link href="/dashboard" data-testid={`link-module-dashboard-${module.slug}`} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[hsl(var(--border))] px-4 text-sm font-semibold hover:bg-[hsl(var(--muted)/0.7)]">
              Return to overview
            </Link>
          </div>
        </div>
      </section>

      <div className="animate-enter animate-enter-delay-2 grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-dashed border-[hsl(var(--border))] bg-[hsl(var(--card)/0.55)] p-5">
          <Compass className="size-5 text-[hsl(var(--chart-2))]" />
          <h4 className="mt-4 text-sm font-semibold">A focused starting point</h4>
          <p className="mt-2 text-xs leading-5 text-[hsl(var(--muted-foreground))]">No sample records or invented metrics here. Your first real signal will have room to speak clearly.</p>
        </div>
        <div className="rounded-2xl border border-dashed border-[hsl(var(--border))] bg-[hsl(var(--card)/0.55)] p-5">
          <Sparkles className="size-5 text-[hsl(var(--accent-foreground))]" />
          <h4 className="mt-4 text-sm font-semibold">Built to become yours</h4>
          <p className="mt-2 text-xs leading-5 text-[hsl(var(--muted-foreground))]">Each module will adapt to the way your industry, team, and operating rhythm actually work.</p>
        </div>
      </div>
    </div>
  );
}