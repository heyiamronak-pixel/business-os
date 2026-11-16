import { useMemo, useState } from 'react';
import { Bot, Lightbulb, RefreshCw, Sparkles, Target, TrendingDown, TrendingUp, AlertTriangle, PackageSearch, CheckCircle2 } from 'lucide-react';
import { useBusiness } from '@/hooks/use-workspace';
import { EmptyState, money, PageFrame, PageIntro, SectionCard } from '@/components/record-ui';
import type { BusinessState } from '@/domain/types';

type Finding = { title: string; detail: string; action: string; tone: 'positive' | 'warning' | 'neutral' };

function buildFindings(state: BusinessState): Finding[] {
  const findings: Finding[] = [];
  const today = new Date();
  const todayKey = today.toISOString().slice(0, 10);
  const paidSales = state.sales.filter((sale) => sale.paymentStatus === 'paid');
  const pendingSales = state.sales.filter((sale) => sale.paymentStatus === 'pending');
  const revenue = paidSales.reduce((sum, sale) => sum + sale.total, 0);
  const expenses = state.expenses.reduce((sum, item) => sum + item.amount, 0);
  const cost = paidSales.reduce((sum, sale) => sum + sale.costTotal, 0);
  const grossProfitAfterExpenses = revenue - cost - expenses;
  const lowStock = state.products.filter((item) => item.stock > 0 && item.stock <= item.minimumStock);
  const zeroStock = state.products.filter((item) => item.stock <= 0);
  const overdue = state.tasks.filter((item) => item.status !== 'Completed' && item.dueDate && item.dueDate < todayKey);
  const currentTarget = state.revenueTargets.find((target) => target.startDate <= todayKey && target.endDate >= todayKey);

  if (currentTarget) {
    const ratio = currentTarget.amount > 0 ? revenue / currentTarget.amount : 0;
    findings.push({
      title: 'Revenue target pacing',
      detail: `${money(revenue, state.workspace?.currency)} paid revenue against ${money(currentTarget.amount, state.workspace?.currency)} target (${Math.round(ratio * 100)}%).`,
      action: ratio >= 1 ? 'Target reached. Review the next period target.' : 'Review the remaining target and plan daily sales activity.',
      tone: ratio >= 1 ? 'positive' : 'warning',
    });
  } else {
    findings.push({ title: 'Set a revenue target', detail: 'No active target covers today, so target pacing cannot be calculated.', action: 'Create a target with a clear start date, end date and amount.', tone: 'neutral' });
  }

  if (pendingSales.length) {
    const amount = pendingSales.reduce((sum, sale) => sum + sale.total, 0);
    findings.push({ title: 'Pending payments need follow-up', detail: `${pendingSales.length} sale(s) have ${money(amount, state.workspace?.currency)} marked as pending.`, action: 'Review each pending sale and record collection when payment is received.', tone: 'warning' });
  }

  if (lowStock.length || zeroStock.length) {
    findings.push({ title: 'Inventory needs attention', detail: `${zeroStock.length} product(s) are out of stock and ${lowStock.length} are at or below minimum stock.`, action: 'Review stock movement history and plan replenishment for critical items.', tone: 'warning' });
  }

  if (overdue.length) {
    findings.push({ title: 'Overdue work is building up', detail: `${overdue.length} open task(s) have a due date before today.`, action: 'Reassign, reschedule or complete overdue tasks so the work queue stays accurate.', tone: 'warning' });
  }

  if (state.sales.length && expenses > revenue) {
    findings.push({ title: 'Expenses exceed paid revenue', detail: `Recorded expenses are ${money(expenses, state.workspace?.currency)} while paid revenue is ${money(revenue, state.workspace?.currency)}.`, action: 'Review the expense period and ensure revenue and expense dates are comparable.', tone: 'warning' });
  } else if (state.sales.length) {
    findings.push({ title: 'Operating contribution', detail: `Paid revenue less recorded product cost and expenses is ${money(grossProfitAfterExpenses, state.workspace?.currency)}.`, action: 'Compare this with your accounting records before making financial decisions.', tone: grossProfitAfterExpenses >= 0 ? 'positive' : 'warning' });
  }

  if (!findings.length) findings.push({ title: 'Add your first business records', detail: 'The advisor needs real sales, products, tasks or targets to generate meaningful findings.', action: 'Start by adding products, customers and your first task or sale.', tone: 'neutral' });
  return findings;
}

export default function Advisor() {
  const { state } = useBusiness();
  const [refreshedAt, setRefreshedAt] = useState(() => new Date());
  const findings = useMemo(() => buildFindings(state), [state, refreshedAt]);
  const recordCount = state.sales.length + state.products.length + state.tasks.length + state.expenses.length + state.customers.length;
  return <PageFrame>
    <PageIntro eyebrow="Business intelligence" title="AI Business Advisor" description="A practical thinking partner that checks your actual workspace records and turns them into clear next actions." action={<button type="button" onClick={() => setRefreshedAt(new Date())} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[hsl(var(--border))] px-3 text-xs font-semibold"><RefreshCw className="size-3.5" /> Refresh insights</button>} />
    <SectionCard className="mb-4">
      <div className="flex items-start gap-3"><span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))]"><Bot className="size-5" /></span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="text-sm font-semibold">Workspace intelligence</h3><span className="rounded-full bg-[hsl(var(--muted))] px-2 py-1 text-[10px] font-semibold">Rules-based preview</span></div><p className="mt-1 text-xs leading-5 text-[hsl(var(--muted-foreground))]">This first advisor uses transparent calculations on data already stored in this browser. It does not send your business data to an AI provider or invent missing figures.</p><div className="mt-3 text-[11px] text-[hsl(var(--muted-foreground))]">${recordCount} workspace records considered · Updated ${refreshedAt.toLocaleTimeString()}</div></div></div>
    </SectionCard>
    <div className="mb-3 flex items-center gap-2"><Sparkles className="size-4 text-[hsl(var(--primary))]" /><h3 className="text-sm font-semibold">Recommended actions</h3></div>
    <div className="grid gap-3 lg:grid-cols-2">{findings.map((item, index) => <SectionCard key={item.title}><div className="flex items-start gap-3"><span className={['grid size-9 shrink-0 place-items-center rounded-lg', item.tone === 'positive' ? 'bg-emerald-500/10 text-emerald-600' : item.tone === 'warning' ? 'bg-amber-500/10 text-amber-600' : 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]'].join(' ')}>{item.tone === 'positive' ? <CheckCircle2 className="size-4" /> : item.tone === 'warning' ? <AlertTriangle className="size-4" /> : <Lightbulb className="size-4" />}</span><div className="min-w-0"><p className="text-sm font-semibold">{item.title}</p><p className="mt-2 text-xs leading-5 text-[hsl(var(--muted-foreground))]">{item.detail}</p><div className="mt-3 rounded-lg bg-[hsl(var(--muted)/0.55)] p-3"><p className="text-[10px] font-bold uppercase tracking-wide text-[hsl(var(--muted-foreground))]">Suggested next step</p><p className="mt-1 text-xs leading-5">{item.action}</p></div></div></div></SectionCard>)}</div>
    <p className="mt-4 text-[11px] leading-5 text-[hsl(var(--muted-foreground))]">These are operational prompts, not accounting, tax, legal or investment advice. Use date-aligned records and verify the underlying entries before acting.</p>
  </PageFrame>;
}
