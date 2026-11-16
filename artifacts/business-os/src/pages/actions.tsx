import { useMemo, useState } from 'react';
import { AlertTriangle, ArrowRight, Bot, CheckCircle2, ClipboardList, PackageSearch, Receipt, Target, Wallet } from 'lucide-react';
import { Link } from 'wouter';
import { useBusiness } from '@/hooks/use-workspace';
import { money, PageFrame, PageIntro, SectionCard } from '@/components/record-ui';

type ActionItem = { id:string; title:string; detail:string; suggestion:string; href:string; cta:string; severity:'High'|'Medium'|'Low'; icon:typeof AlertTriangle };

export default function Actions() {
  const { state, workspace } = useBusiness();
  const [expanded,setExpanded] = useState<string[]>([]);
  const items=useMemo<ActionItem[]>(()=>{
    const list:ActionItem[]=[];
    const today=new Date().toISOString().slice(0,10);
    const pending=state.sales.filter(s=>s.paymentStatus==='pending');
    const pendingAmount=pending.reduce((sum,s)=>sum+s.total,0);
    const out=state.products.filter(p=>p.stock<=0);
    const low=state.products.filter(p=>p.stock>0&&p.stock<=p.minimumStock);
    const overdue=state.tasks.filter(t=>t.status!=='Completed'&&t.dueDate&&t.dueDate<today);
    const target=state.revenueTargets.find(t=>t.startDate<=today&&t.endDate>=today);
    const paidRevenue=state.sales.filter(s=>s.paymentStatus==='paid').reduce((sum,s)=>sum+s.total,0);
    if(pending.length)list.push({id:'pending',title:'Follow up on pending payments',detail:pending.length+' sale(s) · '+money(pendingAmount,workspace?.currency)+' outstanding in the local sales records.',suggestion:'Open each pending sale, verify the customer and invoice details, then follow up through your normal collection process. Mark a sale paid only when payment is confirmed.',href:'/sales',cta:'Review sales',severity:'High',icon:Receipt});
    if(out.length||low.length)list.push({id:'stock',title:'Review inventory levels',detail:out.length+' out-of-stock product(s) and '+low.length+' low-stock product(s).',suggestion:'Verify physical quantities first. Open Inventory and record a stock-in movement with a note only after new stock is received. Review the minimum-stock levels for products with repeated shortages.',href:'/inventory',cta:'Open inventory',severity:out.length?'High':'Medium',icon:PackageSearch});
    if(overdue.length)list.push({id:'overdue',title:'Clear overdue tasks',detail:overdue.length+' open task(s) have passed their due date.',suggestion:'Sort overdue tasks by impact, confirm the owner, and either complete or reschedule each item. Avoid leaving old due dates unchanged because that makes the dashboard less useful.',href:'/tasks',cta:'Open tasks',severity:'High',icon:ClipboardList});
    if(!target)list.push({id:'target',title:'Set an active revenue target',detail:'No revenue target covers today, so target pacing is not available.',suggestion:'Create a target with a start date, end date and realistic amount. Then review paid revenue against that target and keep pending collections separate.',href:'/revenue-targets',cta:'Create target',severity:'Medium',icon:Target});
    else if(target.amount>0&&paidRevenue<target.amount)list.push({id:'pace',title:'Review revenue target pace',detail:money(paidRevenue,workspace?.currency)+' paid revenue against '+money(target.amount,workspace?.currency)+' target.',suggestion:'Calculate remaining amount and days in the target period. Review recent lead flow, conversion and average order value before increasing spend or changing the target.',href:'/reports',cta:'Review reports',severity:'Medium',icon:Target});
    const spend=state.campaigns.reduce((sum,c)=>sum+c.spend,0);
    const leads=state.campaigns.reduce((sum,c)=>sum+c.leads,0);
    if(spend>0&&leads===0)list.push({id:'marketing',title:'Verify campaign lead tracking',detail:money(spend,workspace?.currency)+' recorded campaign spend but no leads entered.',suggestion:'Check whether tracking is configured and whether leads have been entered correctly. The current campaign figures are manual; do not treat missing data as proof that a platform generated zero leads.',href:'/marketing',cta:'Review campaigns',severity:'Medium',icon:Wallet});
    return list;
  },[state,workspace?.currency]);
  const toggle=(id:string)=>setExpanded(current=>current.includes(id)?current.filter(x=>x!==id):[...current,id]);
  return <PageFrame>
    <PageIntro eyebrow="Daily operations" title="Action Center" description="Business signals converted into practical work. Each item links to the module where you can review it."/>
    <div className="mb-4 grid grid-cols-3 gap-3"><SectionCard><p className="text-xs text-[hsl(var(--muted-foreground))]">Open actions</p><p className="mt-2 text-2xl font-semibold">{items.length}</p></SectionCard><SectionCard><p className="text-xs text-[hsl(var(--muted-foreground))]">High priority</p><p className="mt-2 text-2xl font-semibold">{items.filter(i=>i.severity==='High').length}</p></SectionCard><SectionCard><p className="text-xs text-[hsl(var(--muted-foreground))]">Medium priority</p><p className="mt-2 text-2xl font-semibold">{items.filter(i=>i.severity==='Medium').length}</p></SectionCard></div>
    {items.length===0?<SectionCard><div className="flex items-center gap-3 py-4"><CheckCircle2 className="size-7 text-emerald-600"/><div><h3 className="text-sm font-semibold">Nothing needs immediate attention</h3><p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">New alerts will appear here when recorded payments, stock, tasks or targets need review.</p></div></div></SectionCard>:<div className="grid gap-3 lg:grid-cols-2">{items.map(item=>{const Icon=item.icon;const isOpen=expanded.includes(item.id);return <SectionCard key={item.id}><div className="flex items-start gap-3"><span className={['grid size-10 shrink-0 place-items-center rounded-xl',item.severity==='High'?'bg-rose-500/10 text-rose-700':'bg-amber-500/10 text-amber-700'].join(' ')}><Icon className="size-4"/></span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="text-sm font-semibold">{item.title}</h3><span className="rounded-full bg-[hsl(var(--muted))] px-2 py-0.5 text-[10px] font-semibold">{item.severity}</span></div><p className="mt-2 text-xs leading-5 text-[hsl(var(--muted-foreground))]">{item.detail}</p><div className="mt-3 flex flex-wrap gap-2"><Link href={item.href} className="inline-flex min-h-9 items-center gap-1 rounded-lg bg-[hsl(var(--primary))] px-3 text-xs font-semibold text-[hsl(var(--primary-foreground))]">{item.cta}<ArrowRight className="size-3.5"/></Link><button type="button" onClick={()=>toggle(item.id)} className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-[hsl(var(--border))] px-3 text-xs font-semibold"><Bot className="size-3.5"/> {isOpen?'Hide guidance':'Ask AI what to do'}</button></div>{isOpen&&<div className="mt-3 rounded-xl border border-[hsl(var(--primary)/0.2)] bg-[hsl(var(--primary)/0.04)] p-3"><p className="text-[10px] font-bold uppercase tracking-wide text-[hsl(var(--primary))]">Business Sutra guidance · Rules-based</p><p className="mt-2 text-xs leading-5">{item.suggestion}</p><p className="mt-2 text-[10px] text-[hsl(var(--muted-foreground))]">Advice is generated from local business records. No external AI model is connected.</p></div>}</div></div></SectionCard>})}</div>}
    <p className="mt-4 text-[11px] leading-5 text-[hsl(var(--muted-foreground))]">Actions are generated from recorded information and do not send messages, make payments, place purchase orders or change platform data automatically.</p>
  </PageFrame>;
}
