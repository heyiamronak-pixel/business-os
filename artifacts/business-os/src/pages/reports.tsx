import { useMemo, useState } from 'react';
import { BarChart3, Download, Megaphone } from 'lucide-react';
import { useBusiness } from '@/hooks/use-workspace';
import { EmptyState, inputClass, isoToday, money, PageFrame, PageIntro, SectionCard } from '@/components/record-ui';

function monthKey(value: string) { return value.slice(0, 7); }
function monthLabel(value: string) { return new Date(value + '-01T12:00:00').toLocaleDateString(undefined, { month: 'short', year: 'numeric' }); }
function dateKey(date: Date) { return date.getFullYear() + '-' + String(date.getMonth()+1).padStart(2,'0') + '-' + String(date.getDate()).padStart(2,'0'); }

export default function Reports() {
  const { state } = useBusiness();
  const [period,setPeriod]=useState('6');
  const [from,setFrom]=useState('');
  const [to,setTo]=useState('');
  const report=useMemo(()=>{
    const allDates=[
      ...state.sales.map(x=>x.createdAt.slice(0,10)),
      ...state.expenses.map(x=>x.date||x.createdAt.slice(0,10)),
      ...state.campaigns.map(x=>x.startDate),
    ].filter(Boolean).sort();
    const fallbackFrom=allDates[0]??isoToday();
    const end=to||isoToday();
    const start=from||(()=>{
      const d=new Date(end+'T12:00:00');
      d.setMonth(d.getMonth()-Number(period)+1);
      return dateKey(d);
    })();
    const sales=state.sales.filter(x=>x.createdAt.slice(0,10)>=start&&x.createdAt.slice(0,10)<=end);
    const expenses=state.expenses.filter(x=>(x.date||x.createdAt.slice(0,10))>=start&&(x.date||x.createdAt.slice(0,10))<=end);
    const campaigns=state.campaigns.filter(x=>x.startDate<=end&&x.endDate>=start);
    const validSales=sales.filter(x=>x.paymentStatus==='paid');
    const revenue=validSales.reduce((s,x)=>s+x.total,0);
    const cost=validSales.reduce((s,x)=>s+x.costTotal,0);
    const expenseTotal=expenses.reduce((s,x)=>s+x.amount,0);
    const marketingSpend=campaigns.reduce((s,x)=>s+x.spend,0);
    const leads=campaigns.reduce((s,x)=>s+x.leads,0);
    const conversions=campaigns.reduce((s,x)=>s+x.conversions,0);
    const attributedRevenue=campaigns.reduce((s,x)=>s+x.revenue,0);
    const pending=sales.filter(x=>x.paymentStatus==='pending').reduce((s,x)=>s+x.total,0);
    const grouped=new Map<string,{revenue:number;expenses:number;sales:number;marketingSpend:number;leads:number}>();
    for(const sale of validSales){
      const key=monthKey(sale.createdAt);
      const item=grouped.get(key)??{revenue:0,expenses:0,sales:0,marketingSpend:0,leads:0};
      item.revenue+=sale.total;item.sales+=1;grouped.set(key,item);
    }
    for(const expense of expenses){
      const key=monthKey(expense.date||expense.createdAt);
      const item=grouped.get(key)??{revenue:0,expenses:0,sales:0,marketingSpend:0,leads:0};
      item.expenses+=expense.amount;grouped.set(key,item);
    }
    for(const campaign of campaigns){
      const key=monthKey(campaign.startDate);
      const item=grouped.get(key)??{revenue:0,expenses:0,sales:0,marketingSpend:0,leads:0};
      item.marketingSpend+=campaign.spend;item.leads+=campaign.leads;grouped.set(key,item);
    }
    const rows=Array.from(grouped.entries()).sort(([a],[b])=>a.localeCompare(b));
    return {start:from||fallbackFrom,end,sales,expenses,campaigns,revenue,cost,expenseTotal,contribution:revenue-cost-expenseTotal,pending,marketingSpend,leads,conversions,attributedRevenue,roas:marketingSpend>0?attributedRevenue/marketingSpend:null,cpl:leads>0?marketingSpend/leads:null,rows};
  },[state,period,from,to]);
  function exportCsv(){
    const rows=[
      ['Business Sutra report',state.workspace?.businessName??'Business'],
      ['Period',report.start+' to '+report.end],
      [],
      ['Month','Paid revenue','Expenses','Marketing spend','Marketing leads','Sales count'],
      ...report.rows.map(([key,v])=>[monthLabel(key),String(v.revenue),String(v.expenses),String(v.marketingSpend),String(v.leads),String(v.sales)]),
      [],
      ['Summary','Value'],
      ['Paid revenue',String(report.revenue)],
      ['Pending collections',String(report.pending)],
      ['Recorded expenses',String(report.expenseTotal)],
      ['Product cost',String(report.cost)],
      ['Contribution after product cost and expenses',String(report.contribution)],
      ['Marketing spend',String(report.marketingSpend)],
      ['Marketing leads',String(report.leads)],
      ['Marketing conversions',String(report.conversions)],
      ['Attributed marketing revenue',String(report.attributedRevenue)],
      ['ROAS',report.roas===null?'Not available':report.roas.toFixed(2)+'x'],
      ['CPL',report.cpl===null?'Not available':String(report.cpl)],
    ];
    const csv=rows.map(row=>row.map(cell=>'"'+String(cell??'').replace(/"/g,'""')+'"').join(',')).join('\n');
    const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));
    const a=document.createElement('a');a.href=url;a.download='business-sutra-report.csv';a.click();URL.revokeObjectURL(url);
  }
  return <PageFrame>
    <PageIntro eyebrow="Business intelligence" title="Reports" description="Review date-filtered sales, expense and campaign performance from recorded workspace data." action={<button type="button" onClick={exportCsv} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[hsl(var(--border))] px-3 text-xs font-semibold"><Download className="size-3.5"/>Export CSV</button>}/>
    <SectionCard className="mb-4"><div className="grid gap-3 sm:grid-cols-3"><label className="grid gap-1 text-xs font-semibold">Period<select value={period} onChange={e=>{setPeriod(e.target.value);setFrom('');setTo('');}} className={inputClass}><option value="3">Last 3 months</option><option value="6">Last 6 months</option><option value="12">Last 12 months</option></select></label><label className="grid gap-1 text-xs font-semibold">From<input type="date" value={from} onChange={e=>setFrom(e.target.value)} className={inputClass}/></label><label className="grid gap-1 text-xs font-semibold">To<input type="date" value={to} onChange={e=>setTo(e.target.value)} className={inputClass}/></label></div></SectionCard>
    <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">{[{label:'Paid revenue',value:money(report.revenue,state.workspace?.currency)},{label:'Recorded expenses',value:money(report.expenseTotal,state.workspace?.currency)},{label:'Contribution',value:money(report.contribution,state.workspace?.currency)},{label:'Pending collections',value:money(report.pending,state.workspace?.currency)}].map(x=><SectionCard key={x.label}><p className="text-xs text-[hsl(var(--muted-foreground))]">{x.label}</p><p className="mt-2 text-lg font-semibold">{x.value}</p></SectionCard>)}</div>
    <SectionCard className="mb-4"><div className="mb-4 flex items-center gap-2"><Megaphone className="size-4"/><h3 className="text-sm font-semibold">Marketing performance</h3><span className="ml-auto text-[10px] text-[hsl(var(--muted-foreground))]">{report.campaigns.length} campaigns in period</span></div><div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">{[{label:'Ad spend',value:money(report.marketingSpend,state.workspace?.currency)},{label:'Leads',value:String(report.leads)},{label:'Conversions',value:String(report.conversions)},{label:'Attributed revenue',value:money(report.attributedRevenue,state.workspace?.currency)},{label:'ROAS',value:report.roas===null?'—':report.roas.toFixed(2)+'x'}].map(x=><div key={x.label} className="rounded-lg bg-[hsl(var(--muted)/0.4)] p-3"><p className="text-[10px] text-[hsl(var(--muted-foreground))]">{x.label}</p><p className="mt-2 text-sm font-semibold">{x.value}</p></div>)}</div><p className="mt-3 text-[11px] text-[hsl(var(--muted-foreground))]">Cost per lead: {report.cpl===null?'Not available':money(report.cpl,state.workspace?.currency)}. Campaign figures are manually recorded, and attributed revenue may overlap with sales records.</p></SectionCard>
    <SectionCard><div className="mb-4 flex items-center gap-2"><BarChart3 className="size-4"/><h3 className="text-sm font-semibold">Monthly performance</h3></div>{report.rows.length===0?<EmptyState title="No records in this period" description="Add sales, expenses or campaign results to build a report from actual activity."/>:<div className="overflow-x-auto"><table className="w-full min-w-[660px] text-left text-sm"><thead><tr className="border-b border-[hsl(var(--border))] text-xs text-[hsl(var(--muted-foreground))]"><th className="pb-3">Month</th><th className="pb-3 text-right">Paid revenue</th><th className="pb-3 text-right">Expenses</th><th className="pb-3 text-right">Marketing spend</th><th className="pb-3 text-right">Leads</th><th className="pb-3 text-right">Sales</th></tr></thead><tbody>{report.rows.map(([key,v])=><tr key={key} className="border-b border-[hsl(var(--border))] last:border-0"><td className="py-3 font-medium">{monthLabel(key)}</td><td className="py-3 text-right">{money(v.revenue,state.workspace?.currency)}</td><td className="py-3 text-right">{money(v.expenses,state.workspace?.currency)}</td><td className="py-3 text-right">{money(v.marketingSpend,state.workspace?.currency)}</td><td className="py-3 text-right">{v.leads}</td><td className="py-3 text-right">{v.sales}</td></tr>)}</tbody></table></div>}</SectionCard>
    <p className="mt-3 text-[11px] leading-5 text-[hsl(var(--muted-foreground))]">Report period: {report.start} to {report.end}. Paid revenue excludes pending and refunded sales. Contribution is paid revenue less recorded product cost and expenses, not statutory net profit. Marketing-attributed revenue is shown separately and is not added to sales revenue.</p>
  </PageFrame>;
}
