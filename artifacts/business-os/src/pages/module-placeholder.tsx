import { ArrowRight, Construction, Database, Plus } from 'lucide-react';
import { Link, useLocation } from 'wouter';
import { moduleBySlug } from '@/data/modules';

export default function ModulePlaceholder() {
  const [location] = useLocation();
  const module = moduleBySlug(location.replace(/^\//, ''));
  const Icon = module.icon;

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-5 pb-28 sm:px-6 sm:py-8 lg:px-9 lg:pb-10">
      <div className="animate-enter flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[hsl(var(--accent)/0.15)] text-[hsl(var(--accent-foreground))]"><Icon className="size-5" /></span>
        <div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[hsl(var(--muted-foreground))]">Module</p><h2 data-testid={`text-module-title-${module.slug}`} className="mt-1 text-2xl font-semibold tracking-[-0.045em]">{module.label}</h2><p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">{module.description}</p></div>
      </div>

      <section className="animate-enter animate-enter-delay-1 mt-6 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 sm:p-7">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-xl"><div className="mb-4 flex size-9 items-center justify-center rounded-lg bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]"><Construction className="size-4" /></div><h3 data-testid={`text-module-status-${module.slug}`} className="text-lg font-semibold tracking-[-0.035em]">Nothing here yet.</h3><p className="mt-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">This module is ready for your {module.label.toLowerCase()} records. Add real information when you are ready; Business OS will not create sample activity.</p></div>
          <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl border border-dashed border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.35)] text-[hsl(var(--muted-foreground))]"><Database className="size-5" /></div>
        </div>
        <div className="mt-6 flex flex-col gap-3 border-t border-[hsl(var(--border))] pt-5 sm:flex-row"><button type="button" disabled data-testid={`button-add-${module.slug}`} className="inline-flex min-h-11 cursor-not-allowed items-center justify-center gap-2 rounded-xl bg-[hsl(var(--primary)/0.55)] px-4 text-sm font-semibold text-[hsl(var(--primary-foreground)/0.8)]"><Plus className="size-4" /> Add first record</button><Link href="/dashboard" data-testid={`link-module-dashboard-${module.slug}`} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[hsl(var(--border))] px-4 text-sm font-semibold">Back to home <ArrowRight className="size-4" /></Link></div>
      </section>
      <div className="mt-5 flex items-center gap-2 text-xs text-[hsl(var(--muted-foreground))]"><Database className="size-3.5" /> Connect your workspace data when this module is ready.</div>
    </div>
  );
}