import { useMemo, useState } from 'react';
import { BarChart3, Download, FileSpreadsheet, TrendingUp } from 'lucide-react';
import { useBusiness } from '@/hooks/use-workspace';
import { EmptyState, inputClass, money, PageFrame, PageIntro, SectionCard } from '@/components/record-ui';

function monthKey(value: string) { return value.slice(0, 7); }
function monthLabel(value: string) { return new Date(`${value}-01T00:00:00`).toLocaleDateString(undefined, { month: 'short', year: 'numeric' }); }

export default function Reports() {
  const { state } = useBusiness();
  const [period, setPeriod] = useState('6');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const report = useMemo(() => {
    const allDates = [
      ...state.sales.map((x) => x.createdAt.slice(0, 10)),
      ...state.expenses.map((x) => x.date || x.createdAt.slice(0, 10)),
    ].filter(Boolean).sort();
    const fallbackFrom = allDates[0] ?? new Date().toISOString().slice(0, 10);
    const end = to || new Date().toISOString().slice(0, 10);
    const start = from || (() => { const d = new Date(end); d.setMonth(d.getMonth() - Number(period) + 1); return d.toISOString().slice(0, 10); })();
    const sales = state.sales.filter((x) => x.createdAt.slice(0, 10) >= start && x.createdAt.slice(0, 10) <= end);
    const expenses = state.expenses.filter((x) => (x.date || x.createdAt.slice(0, 10)) >= start && (x.date || x.createdAt.slice(0, 10)) <= end);
    const validSales = sales.filter((x) => x.paymentStatus !== 'refunded');
    const revenue = validSales.reduce((s, x) => s + x.total, 0);
    const cost = validSales.reduce((s, x) => s + x.costTotal, 0);
    const expenseTotal = expenses.reduce((s, x) => s + x.amount, 0);
    const grouped = new Map<string, { revenue: number; expenses: number; sales: number }>();
    for (const sale of validSales) {
      const key = monthKey(sale.createdAt);
      const item = grouped.get(key) ?? { revenue: 0, expenses: 0, sales: 0 };
      item.revenue += sale.total; item.sales += 1; grouped.set(key, item);
    }
    for (const expense of expenses) {
      const key = monthKey(expense.date || expense.createdAt);
      const item = grouped.get(key) ?? { revenue: 0, expenses: 0, sales: 0 };
      item.expenses += expense.amount; grouped.set(key, item);
    }
    const rows = Array.from(grouped.entries()).sort(([a], [b]) => a.localeCompare(b));
    return { start: from || fallbackFrom, end, sales, expenses, revenue, cost, expenseTotal, contribution: revenue - cost - expenseTotal, pending: sales.filter((x) => x.paymentStatus === 'pending').reduce((s, x) => s + x.total, 0), rows };
  }, [state, period, from, to]);
  function exportCsv() {
    const rows = [['Month','Paid revenue','Expenses','Sales count'], ...report.rows.map(([key, v]) => [monthLabel(key), String(v.revenue), String(v.expenses), String(v.sales)])];
    rows.push(['TOTAL', String(report.revenue), String(report.expenseTotal), String(report.sales.length)]);
    const csv = rows.map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a'); a.href = url; a.download = 'business-sutra-report.csv'; a.click(); URL.revokeObjectURL(url);
  }
  return <PageFrame>
    <PageIntro eyebrow="Business intelligence" title="Reports" description="Review date-filtered performance from your recorded sales and expenses. Export the same figures for further analysis." action={<button type="button" onClick={exportCsv} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[hsl(var(--border))] px-3 text-xs font-semibold"><Download className="size-3.5" /> Export CSV</button>} />
    <SectionCard className="mb-4"><div className="grid gap-3 sm:grid-cols-3"><label className="grid gap-1 text-xs font-semibold">Period<select value={period} onChange={e=>{setPeriod(e.target.value);setFrom('');setTo('');}} className={inputClass}><option value="3">Last 3 months</option><option value="6">Last 6 months</option><option value="12">Last 12 months</option></select></label><label className="grid gap-1 text-xs font-semibold">From<input type="date" value={from} onChange={e=>setFrom(e.target.value)} className={inputClass}/></label><label className="grid gap-1 text-xs font-semibold">To<input type="date" value={to} onChange={e=>setTo(e.target.value)} className={inputClass}/></label></div></SectionCard>
    <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">{[{label:'Paid revenue',value:money(report.revenue,state.workspace?.currency)},{label:'Recorded expenses',value:money(report.expenseTotal,state.workspace?.currency)},{label:'Contribution after costs',value:money(report.contribution,state.workspace?.currency)},{label:'Pending collections',value:money(report.pending,state.workspace?.currency)}].map(x=><SectionCard key={x.label}><p className="text-xs text-[hsl(var(--muted-foreground))]">{x.label}</p><p className="mt-2 text-lg font-semibold">{x.value}</p></SectionCard>)}</div>
    <SectionCard><div className="mb-4 flex items-center gap-2"><BarChart3 className="size-4"/><h3 className="text-sm font-semibold">Monthly performance</h3></div>{report.rows.length===0?<EmptyState title="No records in this period" description="Add sales and expenses to generate a report from actual business activity."/>:<div className="overflow-x-auto"><table className="w-full min-w-[520px] text-left text-sm"><thead><tr className="border-b border-[hsl(var(--border))] text-xs text-[hsl(var(--muted-foreground))]"><th className="pb-3">Month</th><th className="pb-3 text-right">Revenue</th><th className="pb-3 text-right">Expenses</th><th className="pb-3 text-right">Sales</th></tr></thead><tbody>{report.rows.map(([key,v])=><tr key={key} className="border-b border-[hsl(var(--border))] last:border-0"><td className="py-3 font-medium">{monthLabel(key)}</td><td className="py-3 text-right">{money(v.revenue,state.workspace?.currency)}</td><td className="py-3 text-right">{money(v.expenses,state.workspace?.currency)}</td><td className="py-3 text-right">{v.sales}</td></tr>)}</tbody></table></div>}</SectionCard>
    <p className="mt-3 text-[11px] leading-5 text-[hsl(var(--muted-foreground))]">Report period: {report.start} to {report.end}. Revenue excludes refunded sales; pending sales are shown separately and are not included in paid revenue. Contribution is paid revenue less recorded product cost and expenses, not statutory net profit.</p>
  </PageFrame>;
}
