import { useMemo } from 'react';
import { ArrowRight, AlertTriangle, Bot, ChartNoAxesCombined, CircleDollarSign, ClipboardCheck, ContactRound, Megaphone, PackageSearch, Receipt, ShoppingBag, Target, UsersRound, Wallet } from 'lucide-react';
import { Link } from 'wouter';
import { useBusiness } from '@/hooks/use-workspace';
import { isoToday, money, PageFrame, SectionCard } from '@/components/record-ui';

function monthKey(date: Date) {
  return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0');
}
function percentHeight(value: number, max: number) {
  return Math.max(value ? 4 : 0, value / max * 100) + '%';
}

export default function Dashboard() {
  const { state, workspace, metrics } = useBusiness();
  const currency = workspace?.currency;
  const today = new Date();
  const todayKey = isoToday();
  const paidSales = state.sales.filter(s => s.paymentStatus === 'paid');
  const paidRevenue = paidSales.reduce((sum, s) => sum + s.total, 0);
  const pendingPayments = state.sales.filter(s => s.paymentStatus === 'pending').reduce((sum, s) => sum + s.total, 0);
  const supplierPayables = state.purchases.reduce((sum, purchase) => sum + purchase.balance, 0);
  const lowStock = state.products.filter(p => p.stock <= p.minimumStock);
  const overdue = state.tasks.filter(t => t.status !== 'Completed' && t.dueDate && t.dueDate < todayKey);
  const recentSales = [...state.sales].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5);
  const openTasks = [...state.tasks].filter(t => t.status !== 'Completed').sort((a, b) => a.dueDate.localeCompare(b.dueDate)).slice(0, 5);
  const monthly = useMemo(() => {
    const buckets = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(today.getFullYear(), today.getMonth() - (5 - i), 1);
      return { key: monthKey(d), label: d.toLocaleDateString(undefined, { month: 'short' }), revenue: 0, expenses: 0 };
    });
    const index = new Map(buckets.map((b, i) => [b.key, i]));
    state.sales.filter(s => s.paymentStatus === 'paid').forEach(s => {
      const i = index.get(monthKey(new Date(s.createdAt)));
      if (i !== undefined) buckets[i].revenue += s.total;
    });
    state.expenses.forEach(e => {
      const i = index.get(monthKey(new Date(e.date || e.createdAt)));
      if (i !== undefined) buckets[i].expenses += e.amount;
    });
    return buckets;
  }, [state.sales, state.expenses]);
  const maxBar = Math.max(1, ...monthly.flatMap(m => [m.revenue, m.expenses]));
  const metricsCards = [
    { label: 'Paid revenue', value: money(paidRevenue, currency), detail: paidSales.length + ' paid sales', icon: CircleDollarSign, href: '/sales' },
    { label: 'Expenses', value: money(metrics.expenses, currency), detail: state.expenses.length + ' recorded entries', icon: Receipt, href: '/expenses' },
    { label: 'Operating profit', value: money(metrics.profit, currency), detail: metrics.profitMargin.toFixed(1) + '% calculated margin', icon: Wallet, href: '/reports' },
    { label: 'Customers', value: String(state.customers.length), detail: 'Saved customer records', icon: ContactRound, href: '/customers' },
    { label: 'Open tasks', value: String(metrics.taskCount), detail: metrics.overdueTaskCount + ' overdue', icon: ClipboardCheck, href: '/tasks' },
    { label: 'Stock alerts', value: String(lowStock.length), detail: metrics.outOfStockCount + ' out of stock', icon: PackageSearch, href: '/inventory' },
    { label: 'Team members', value: String(state.teamMembers.length), detail: state.teamMembers.filter(m => m.status === 'Active').length + ' active', icon: UsersRound, href: '/team' },
    { label: 'Campaigns', value: String(state.campaigns.length), detail: state.campaigns.filter(c => c.status === 'Active').length + ' active campaigns', icon: Megaphone, href: '/marketing' },
    { label: 'Suppliers', value: String(state.suppliers.length), detail: state.suppliers.filter(s => s.status === 'Active').length + ' active suppliers', icon: Truck, href: '/suppliers' },
    { label: 'Supplier payables', value: money(supplierPayables, currency), detail: state.purchases.length + ' purchase entries', icon: ShoppingCart, href: '/purchases' },
  ];
  const alerts = [
    ...(pendingPayments > 0 ? [{ title: 'Pending payments', detail: money(pendingPayments, currency) + ' across ' + state.sales.filter(s => s.paymentStatus === 'pending').length + ' sale(s)', href: '/sales' }] : []),
    ...(lowStock.length ? [{ title: 'Inventory attention', detail: lowStock.length + ' item(s) are at or below minimum stock', href: '/inventory' }] : []),
    ...(overdue.length ? [{ title: 'Overdue tasks', detail: overdue.length + ' open task(s) are past due', href: '/tasks' }] : []),
  ];
  const quickActions = [
    { label: 'Create sale', href: '/sales', icon: ShoppingBag, description: 'Record revenue and stock movement' },
    { label: 'Add expense', href: '/expenses', icon: Receipt, description: 'Capture an operating cost' },
    { label: 'Add task', href: '/tasks', icon: ClipboardCheck, description: 'Assign your next action' },
    { label: 'Review insights', href: '/ai-advisor', icon: Bot, description: 'Get recommendations from your data' },
    { label: 'New campaign', href: '/marketing', icon: Megaphone, description: 'Track marketing performance' },
    { label: 'Set revenue target', href: '/revenue-targets', icon: Target, description: 'Plan the next revenue milestone' },
    { label: 'Record purchase', href: '/purchases', icon: ShoppingCart, description: 'Receive goods and increase stock' },
    { label: 'Add supplier', href: '/suppliers', icon: Truck, description: 'Save a vendor contact' },
  ];
  return <PageFrame>
    <section className="mb-5 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 sm:p-7">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[hsl(var(--muted-foreground))]">Business overview · {today.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}</p><h2 data-testid="text-dashboard-headline" className="mt-2 text-2xl font-semibold tracking-[-0.045em] sm:text-3xl">{workspace ? 'Welcome to ' + workspace.businessName : 'Your business workspace'}</h2><p className="mt-2 max-w-xl text-sm leading-6 text-[hsl(var(--muted-foreground))]">{state.sales.length + state.products.length + state.customers.length + state.expenses.length + state.tasks.length + state.teamMembers.length + state.campaigns.length > 0 ? 'Your dashboard is now using the records saved in this workspace.' : 'Your workspace is ready. Add your first real business records to bring this overview to life.'}</p></div><Link href="/setup" className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-xl border border-[hsl(var(--border))] px-4 text-xs font-semibold">{workspace ? 'Edit workspace' : 'Set up workspace'}</Link></div>
      {!workspace && <div className="mt-5 rounded-xl border border-dashed border-[hsl(var(--border))] p-4 text-xs text-[hsl(var(--muted-foreground))]">Complete workspace setup to configure your business name, industry, currency and modules.</div>}
    </section>
    <section className="mb-6"><div className="mb-3 flex items-end justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[hsl(var(--muted-foreground))]">Business pulse</p><h3 className="mt-1 text-base font-semibold">Key performance indicators</h3></div><Link href="/reports" className="text-xs font-semibold text-[hsl(var(--accent-foreground))]">View reports <ArrowRight className="ml-1 inline size-3.5"/></Link></div><div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">{metricsCards.map(({ label, value, detail, icon: Icon, href }) => <Link href={href} key={label} className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-3 transition-colors hover:bg-[hsl(var(--muted)/0.35)] sm:p-4"><div className="flex items-center justify-between gap-2"><span className="grid size-8 place-items-center rounded-lg bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]"><Icon className="size-4"/></span><ArrowRight className="size-3.5 text-[hsl(var(--muted-foreground))]"/></div><p className="mt-4 truncate text-xs text-[hsl(var(--muted-foreground))]">{label}</p><p className="mt-1 truncate text-lg font-semibold tabular-nums">{value}</p><p className="mt-1 truncate text-[10px] text-[hsl(var(--muted-foreground))]">{detail}</p></Link>)}</div></section>
    <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
      <SectionCard><div className="mb-4 flex items-center justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[hsl(var(--muted-foreground))]">Performance trend</p><h3 className="mt-1 text-sm font-semibold">Paid revenue vs expenses</h3></div><ChartNoAxesCombined className="size-5 text-[hsl(var(--muted-foreground))]"/></div><div className="flex flex-wrap gap-4 text-[11px]"><span className="flex items-center gap-2"><span className="size-2 rounded-full bg-[hsl(var(--primary))]"/> Paid revenue</span><span className="flex items-center gap-2"><span className="size-2 rounded-full bg-[hsl(var(--muted-foreground)/0.45)]"/> Expenses</span></div><div className="mt-5 grid grid-cols-6 items-end gap-2">{monthly.map(m=><div key={m.key} className="flex min-w-0 flex-col items-center gap-2"><div className="flex h-36 w-full items-end justify-center gap-1"><div title={'Revenue: ' + money(m.revenue, currency)} className="w-1/3 rounded-t-md bg-[hsl(var(--primary))]" style={{ height: percentHeight(m.revenue, maxBar) }}/><div title={'Expenses: ' + money(m.expenses, currency)} className="w-1/3 rounded-t-md bg-[hsl(var(--muted-foreground)/0.45)]" style={{ height: percentHeight(m.expenses, maxBar) }}/></div><span className="text-[10px] text-[hsl(var(--muted-foreground))]">{m.label}</span></div>)}</div>{!state.sales.length && !state.expenses.length && <p className="mt-3 text-center text-xs text-[hsl(var(--muted-foreground))]">Add sales and expenses to populate the six-month trend.</p>}</SectionCard>
      <SectionCard><div className="mb-4 flex items-center justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[hsl(var(--muted-foreground))]">Needs attention</p><h3 className="mt-1 text-sm font-semibold">Action alerts</h3></div><AlertTriangle className="size-5 text-[hsl(var(--muted-foreground))]"/></div>{alerts.length===0?<div className="rounded-xl border border-dashed border-[hsl(var(--border))] p-5 text-center"><p className="text-sm font-semibold">No active alerts</p><p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">Payment, stock and due-date alerts will appear here when records need attention.</p></div>:<div className="grid gap-2">{alerts.map(a=><Link href={a.href} key={a.title} className="flex items-center gap-3 rounded-xl border border-[hsl(var(--border))] p-3"><span className="grid size-8 place-items-center rounded-lg bg-amber-500/10 text-amber-700"><AlertTriangle className="size-4"/></span><span className="min-w-0 flex-1"><span className="block text-xs font-semibold">{a.title}</span><span className="mt-1 block text-[11px] text-[hsl(var(--muted-foreground))]">{a.detail}</span></span><ArrowRight className="size-4 shrink-0"/></Link>)}</div>}</SectionCard>
      <SectionCard><div className="mb-4 flex items-center justify-between"><h3 className="text-sm font-semibold">Recent sales</h3><Link href="/sales" className="text-xs font-semibold text-[hsl(var(--accent-foreground))]">All sales</Link></div>{recentSales.length===0?<p className="text-xs text-[hsl(var(--muted-foreground))]">No sales recorded yet.</p>:<div className="grid gap-3">{recentSales.map(s=><div key={s.id} className="flex items-center justify-between gap-3 border-b border-[hsl(var(--border))] pb-3 last:border-0 last:pb-0"><div className="min-w-0"><p className="text-xs font-semibold">{state.customers.find(c=>c.id===s.customerId)?.name||'Walk-in customer'}</p><p className="mt-1 text-[10px] text-[hsl(var(--muted-foreground))]">{new Date(s.createdAt).toLocaleDateString()} · {s.paymentStatus}</p></div><strong className="shrink-0 text-xs">{money(s.total,currency)}</strong></div>)}</div>}</SectionCard>
      <SectionCard><div className="mb-4 flex items-center justify-between"><h3 className="text-sm font-semibold">Upcoming work</h3><Link href="/tasks" className="text-xs font-semibold text-[hsl(var(--accent-foreground))]">All tasks</Link></div>{openTasks.length===0?<p className="text-xs text-[hsl(var(--muted-foreground))]">No open tasks. Create a task to plan the next action.</p>:<div className="grid gap-3">{openTasks.map(t=><div key={t.id} className="flex items-start justify-between gap-3 border-b border-[hsl(var(--border))] pb-3 last:border-0 last:pb-0"><div className="min-w-0"><p className="text-xs font-semibold">{t.title}</p><p className="mt-1 text-[10px] text-[hsl(var(--muted-foreground))]">{t.assignedTo||'Unassigned'} · {t.dueDate||'No due date'}</p></div><span className="rounded-full bg-[hsl(var(--muted))] px-2 py-1 text-[10px] font-semibold">{t.priority}</span></div>)}</div>}</SectionCard>
    </div>
    <section className="mt-6"><div className="mb-3"><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[hsl(var(--muted-foreground))]">Quick actions</p><h3 className="mt-1 text-base font-semibold">Move work forward</h3></div><div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">{quickActions.map(({ label, href, icon: Icon, description }) => <Link href={href} key={label} className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-3 hover:bg-[hsl(var(--muted)/0.35)]"><Icon className="size-4 text-[hsl(var(--accent-foreground))]"/><p className="mt-3 text-xs font-semibold">{label}</p><p className="mt-1 text-[10px] leading-4 text-[hsl(var(--muted-foreground))]">{description}</p></Link>)}</div></section>
    <p className="mt-4 text-[11px] leading-5 text-[hsl(var(--muted-foreground))]">Paid revenue excludes pending and refunded sales. Operating profit is calculated from recorded sale costs and expenses; verify it against your accounting records.</p>
  </PageFrame>;
}
