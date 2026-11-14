import { ArrowRight, CircleAlert, CircleDollarSign, ClipboardList, ContactRound, Lightbulb, PackageSearch, Percent, PiggyBank, Receipt, ShoppingBag, Target, TrendingDown } from 'lucide-react';
import { Link } from 'wouter';
import { useWorkspace } from '@/hooks/use-workspace';

const metrics = [
  { label: 'Revenue target', icon: Target },
  { label: 'Revenue achieved', icon: CircleDollarSign },
  { label: 'Remaining target', icon: TrendingDown },
  { label: 'Profit', icon: PiggyBank },
  { label: 'Margin', icon: Percent },
  { label: 'Expenses', icon: Receipt },
  { label: 'Sales', icon: ShoppingBag },
  { label: 'Customers', icon: ContactRound },
  { label: 'Tasks', icon: ClipboardList },
  { label: 'Alerts', icon: CircleAlert },
  { label: 'Insights', icon: Lightbulb },
];

const quickLinks = [
  { label: 'Sales', description: 'Add your first sale', href: '/sales', icon: ShoppingBag },
  { label: 'Products', description: 'Build your catalog', href: '/products', icon: PackageSearch },
  { label: 'Tasks', description: 'Capture work to do', href: '/tasks', icon: ClipboardList },
];

export default function Dashboard() {
  const { workspace } = useWorkspace();
  return (
    <div className="mx-auto w-full max-w-[1600px] px-4 py-5 sm:px-6 sm:py-8 lg:px-9">
      <section className="animate-enter rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[hsl(var(--muted-foreground))]">Today at a glance</p>
            <h2 data-testid="text-dashboard-headline" className="mt-1 text-xl font-semibold tracking-[-0.04em] sm:text-2xl">{workspace ? `Good to have you here, ${workspace.businessName}.` : 'Your business workspace is ready.'}</h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-[hsl(var(--muted-foreground))]">{workspace ? 'Your operating view will fill in as you add real business information.' : 'Set up your workspace first, then add real information as the work happens.'}</p>
          </div>
          {!workspace && <Link href="/setup" data-testid="link-dashboard-setup" className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-4 text-sm font-semibold text-[hsl(var(--primary-foreground))]">Set up workspace <ArrowRight className="size-4" /></Link>}
          {workspace && <Link href="/setup" data-testid="link-dashboard-edit-setup" className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-[hsl(var(--border))] px-3 text-xs font-semibold">Edit setup <ArrowRight className="size-3.5" /></Link>}
        </div>
        {!workspace && <div data-testid="status-dashboard-no-workspace" className="mt-5 flex items-start gap-3 rounded-xl border border-dashed border-[hsl(var(--accent)/0.45)] bg-[hsl(var(--accent)/0.08)] p-3"><CircleAlert className="mt-0.5 size-4 shrink-0 text-[hsl(var(--accent-foreground))]" /><div><p className="text-xs font-semibold">No workspace set up</p><p className="mt-1 text-xs leading-5 text-[hsl(var(--muted-foreground))]">There are no business records or analytics to show yet.</p></div></div>}
      </section>

      <section className="animate-enter animate-enter-delay-1 mt-6">
        <div className="flex items-end justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[hsl(var(--muted-foreground))]">Business pulse</p><h3 className="mt-1 text-base font-semibold tracking-[-0.03em]">Key metrics</h3></div><span className="text-[10px] font-medium text-[hsl(var(--muted-foreground))]">No data yet</span></div>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {metrics.map(({ label, icon: Icon }) => <div key={label} data-testid={`metric-${label.toLowerCase().replace(/\s+/g, '-')}`} className="min-h-[96px] rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-3"><div className="flex items-center justify-between gap-2"><span className="grid size-7 place-items-center rounded-lg bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]"><Icon className="size-3.5" /></span><span className="font-mono text-base font-bold text-[hsl(var(--muted-foreground)/0.42)]">—</span></div><p className="mt-4 text-xs font-semibold">{label}</p><p className="mt-0.5 text-[10px] text-[hsl(var(--muted-foreground))]">Awaiting data</p></div>)}
        </div>
      </section>

      <section className="animate-enter animate-enter-delay-2 mt-6 grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 sm:p-5">
          <div className="flex items-center justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[hsl(var(--muted-foreground))]">Next actions</p><h3 className="mt-1 text-base font-semibold tracking-[-0.03em]">Start with a useful record</h3></div><Link href="/modules" data-testid="link-dashboard-module-map" className="text-xs font-semibold text-[hsl(var(--accent-foreground))]">Explore the map</Link></div>
          <div className="mt-4 divide-y divide-[hsl(var(--border))]">{quickLinks.map(({ label, description, href, icon: Icon }) => <Link href={href} key={label} data-testid={`link-dashboard-quick-${label.toLowerCase()}`} className="group flex min-h-14 items-center gap-3 py-3 first:pt-0 last:pb-0"><span className="grid size-8 shrink-0 place-items-center rounded-lg bg-[hsl(var(--primary)/0.07)] text-[hsl(var(--primary))]"><Icon className="size-4" /></span><span className="min-w-0 flex-1"><span className="block text-sm font-semibold">{label}</span><span className="mt-0.5 block text-xs text-[hsl(var(--muted-foreground))]">{description}</span></span><ArrowRight className="size-4 text-[hsl(var(--muted-foreground))] transition-transform group-hover:translate-x-0.5" /></Link>)}</div>
        </div>
        <div className="rounded-2xl border border-dashed border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.3)] p-4 sm:p-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[hsl(var(--muted-foreground))]">Operating note</p>
          <h3 className="mt-2 text-base font-semibold tracking-[-0.03em]">A quiet start is a good start.</h3>
          <p className="mt-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">The dashboard does not invent totals, activity, or customer records. Add information through the relevant module and this view will become your daily checkpoint.</p>
          <Link href="/reports" data-testid="link-dashboard-reports" className="mt-4 inline-flex min-h-10 items-center gap-2 text-xs font-semibold text-[hsl(var(--accent-foreground))]">Open reports <ArrowRight className="size-3.5" /></Link>
        </div>
      </section>
    </div>
  );
}