import { useMemo, useState } from 'react';
import { Bot, Lightbulb, RefreshCw, Send, Sparkles, AlertTriangle, CheckCircle2, UserRound, BrainCircuit } from 'lucide-react';
import { Link } from 'wouter';
import { useBusiness } from '@/hooks/use-workspace';
import { inputClass, isoToday, money, PageFrame, PageIntro, SectionCard } from '@/components/record-ui';
import type { BusinessState } from '@/domain/types';

type Finding = { title: string; detail: string; action: string; tone: 'positive' | 'warning' | 'neutral'; href: string };
type Message = { role: 'user' | 'assistant'; content: string };

function buildFindings(state: BusinessState): Finding[] {
  const findings: Finding[] = [];
  const today = isoToday();
  const paidSales = state.sales.filter(s => s.paymentStatus === 'paid');
  const pending = state.sales.filter(s => s.paymentStatus === 'pending');
  const paidRevenue = paidSales.reduce((sum, s) => sum + s.total, 0);
  const expenses = state.expenses.reduce((sum, e) => sum + e.amount, 0);
  const cost = paidSales.reduce((sum, s) => sum + s.costTotal, 0);
  const lowStock = state.products.filter(p => p.stock > 0 && p.stock <= p.minimumStock);
  const outOfStock = state.products.filter(p => p.stock <= 0);
  const overdue = state.tasks.filter(t => t.status !== 'Completed' && t.dueDate && t.dueDate < today);
  const target = state.revenueTargets.find(t => t.startDate <= today && t.endDate >= today);

  if (pending.length) {
    const amount = pending.reduce((sum, s) => sum + s.total, 0);
    findings.push({ title: 'Collect pending payments', detail: pending.length + ' sale(s) have ' + money(amount, state.workspace?.currency) + ' pending.', action: 'Open Sales, contact customers, and update payment status only after collection is confirmed.', tone: 'warning', href: '/sales' });
  }
  if (outOfStock.length || lowStock.length) {
    findings.push({ title: 'Review stock levels', detail: outOfStock.length + ' product(s) are out of stock and ' + lowStock.length + ' are below or at the minimum.', action: 'Open Inventory, review the product movement history and record stock-in when replenishment arrives.', tone: 'warning', href: '/inventory' });
  }
  if (overdue.length) {
    findings.push({ title: 'Clear overdue tasks', detail: overdue.length + ' open task(s) have a due date before today.', action: 'Open Tasks and complete, reassign or reschedule each overdue item.', tone: 'warning', href: '/tasks' });
  }
  if (!target) {
    findings.push({ title: 'Create a revenue target', detail: 'There is no revenue target active for today.', action: 'Set a target period and amount to make revenue pacing measurable.', tone: 'neutral', href: '/revenue-targets' });
  } else if (target.amount > 0 && paidRevenue < target.amount) {
    findings.push({ title: 'Track revenue target pace', detail: money(paidRevenue, state.workspace?.currency) + ' paid revenue against ' + money(target.amount, state.workspace?.currency) + ' for ' + target.label + '.', action: 'Review the remaining target, days left and lead-to-sale conversion before changing the plan.', tone: 'neutral', href: '/reports' });
  }
  if (state.campaigns.length) {
    const spend = state.campaigns.reduce((sum, c) => sum + c.spend, 0);
    const leads = state.campaigns.reduce((sum, c) => sum + c.leads, 0);
    if (spend > 0 && leads === 0) findings.push({ title: 'Check campaign lead tracking', detail: money(spend, state.workspace?.currency) + ' spend is recorded but no campaign leads are recorded.', action: 'Check campaign setup and enter verified leads before drawing a channel performance conclusion.', tone: 'warning', href: '/marketing' });
  }
  if (state.sales.length && paidRevenue - cost - expenses >= 0) {
    findings.push({ title: 'Review operating contribution', detail: 'Paid revenue less recorded product cost and expenses is ' + money(paidRevenue - cost - expenses, state.workspace?.currency) + '.', action: 'Compare the same date range with your accounting records and review high-cost categories.', tone: 'positive', href: '/reports' });
  }
  if (!findings.length) findings.push({ title: 'Start with your first business records', detail: 'The Action Center needs real workspace entries before it can flag exceptions.', action: 'Add products, customers, a task or your first sale to begin.', tone: 'neutral', href: '/products' });
  return findings;
}

function answerQuestion(question: string, state: BusinessState): string {
  const q = question.toLowerCase();
  const currency = state.workspace?.currency;
  const paid = state.sales.filter(s => s.paymentStatus === 'paid');
  const pending = state.sales.filter(s => s.paymentStatus === 'pending');
  const revenue = paid.reduce((sum, s) => sum + s.total, 0);
  const cost = paid.reduce((sum, s) => sum + s.costTotal, 0);
  const expenses = state.expenses.reduce((sum, e) => sum + e.amount, 0);
  const contribution = revenue - cost - expenses;
  const low = state.products.filter(p => p.stock > 0 && p.stock <= p.minimumStock);
  const zero = state.products.filter(p => p.stock <= 0);
  const overdue = state.tasks.filter(t => t.status !== 'Completed' && t.dueDate && t.dueDate < new Date().toISOString().slice(0, 10));
  const campaignSpend = state.campaigns.reduce((sum, c) => sum + c.spend, 0);
  const leads = state.campaigns.reduce((sum, c) => sum + c.leads, 0);
  const conversions = state.campaigns.reduce((sum, c) => sum + c.conversions, 0);
  const campaignRevenue = state.campaigns.reduce((sum, c) => sum + c.revenue, 0);
  const activeTarget = state.revenueTargets.find(t => t.startDate <= isoToday() && t.endDate >= isoToday());

  if (/stock|inventory|product|reorder/.test(q)) {
    const list = [...zero, ...low].slice(0, 8).map(p => p.name + ' (' + p.stock + ' ' + p.unit + ')').join(', ');
    return 'Inventory review:\n' + zero.length + ' product(s) are out of stock and ' + low.length + ' are at or below their minimum level. ' + (list ? 'Priority items: ' + list + '. ' : '') + 'Next step: open Inventory, verify physical stock, then record a stock-in movement with a note. Do not increase stock until goods are actually received.';
  }
  if (/task|work|today|overdue|team/.test(q)) {
    return 'Work queue:\nThere are ' + state.tasks.filter(t => t.status !== 'Completed').length + ' open task(s), including ' + overdue.length + ' overdue. ' + state.teamMembers.filter(m => m.status === 'Active').length + ' active directory members are recorded. Next step: sort tasks by due date, assign an owner, and reschedule any item that cannot be completed today.';
  }
  if (/market|campaign|ads|lead|roas|cpl|ctr/.test(q)) {
    const roas = campaignSpend > 0 ? campaignRevenue / campaignSpend : null;
    const cpl = leads > 0 ? campaignSpend / leads : null;
    const ctrClicks = state.campaigns.reduce((sum, c) => sum + c.clicks, 0);
    const impressions = state.campaigns.reduce((sum, c) => sum + c.impressions, 0);
    const ctr = impressions > 0 ? (ctrClicks / impressions) * 100 : null;
    return 'Marketing snapshot:\n' + state.campaigns.length + ' campaign(s), ' + money(campaignSpend, currency) + ' spend, ' + leads + ' leads, ' + conversions + ' conversions and ' + money(campaignRevenue, currency) + ' attributed revenue. ' + (cpl === null ? 'CPL unavailable because no leads are recorded. ' : 'Recorded CPL is ' + money(cpl, currency) + '. ') + (roas === null ? 'ROAS unavailable because spend is zero.' : 'Recorded ROAS is ' + roas.toFixed(2) + 'x.') + (ctr === null ? '' : ' CTR is ' + ctr.toFixed(2) + '%.') + ' These are manual entries, not live platform attribution.';
  }
  if (/profit|expense|cost|margin|finance|money/.test(q)) {
    const categories = new Map<string, number>();
    state.expenses.forEach(e => categories.set(e.category, (categories.get(e.category) || 0) + e.amount));
    const top = [...categories.entries()].sort((a, b) => b[1] - a[1])[0];
    return 'Financial snapshot (all recorded periods):\nPaid revenue is ' + money(revenue, currency) + ', recorded product cost is ' + money(cost, currency) + ', expenses are ' + money(expenses, currency) + ', and contribution after these costs is ' + money(contribution, currency) + '. ' + (top ? 'Largest recorded expense category: ' + top[0] + ' at ' + money(top[1], currency) + '. ' : '') + 'Next step: compare the same date range, check pending collections separately (' + money(pending.reduce((sum, s) => sum + s.total, 0), currency) + '), and verify taxes, payroll and other costs are captured before treating this as net profit.';
  }
  if (/target|revenue|sales|grow|growth/.test(q)) {
    if (!activeTarget) return 'Revenue planning:\nNo target is active today. You have ' + paid.length + ' paid sale(s) totalling ' + money(revenue, currency) + '. Create a target with dates and an amount, then track paid revenue and pending collections separately.';
    const remaining = Math.max(0, activeTarget.amount - revenue);
    return 'Revenue target:\n' + money(revenue, currency) + ' paid revenue against ' + money(activeTarget.amount, currency) + ' for ' + activeTarget.label + '. Remaining: ' + money(remaining, currency) + '. Review the number of days left, average order value, open enquiries and conversion rate before setting a daily sales goal.';
  }
  return 'Business overview:\nYou have ' + state.sales.length + ' sale(s), ' + state.customers.length + ' customer record(s), ' + state.products.length + ' product(s), ' + state.tasks.filter(t => t.status !== 'Completed').length + ' open task(s), ' + state.teamMembers.length + ' team directory member(s) and ' + state.campaigns.length + ' marketing campaign(s). Paid revenue is ' + money(revenue, currency) + ', expenses are ' + money(expenses, currency) + ' and calculated contribution is ' + money(contribution, currency) + '. Pending collections: ' + money(pending.reduce((sum, s) => sum + s.total, 0), currency) + '. Start with the item that has the highest cash, customer or delivery impact. Ask about inventory, tasks, marketing, profit or revenue targets for a deeper breakdown.';
}

const prompts = ['How is my business performing?', 'What should I do to improve profit?', 'Which inventory needs attention?', 'How are my marketing campaigns performing?', 'What needs attention today?'];

export default function Advisor() {
  const { state } = useBusiness();
  const [refreshedAt, setRefreshedAt] = useState(() => new Date());
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const findings = useMemo(() => buildFindings(state), [state, refreshedAt]);
  const recordCount = state.sales.length + state.products.length + state.tasks.length + state.expenses.length + state.customers.length + state.teamMembers.length + state.campaigns.length;
  const ask = (value: string) => {
    const text = value.trim();
    if (!text) return;
    setMessages(current => [...current, { role: 'user', content: text }, { role: 'assistant', content: answerQuestion(text, state) }]);
    setQuestion('');
  };
  return <PageFrame>
    <PageIntro eyebrow="Business intelligence" title="AI Business Advisor" description="Ask questions about your recorded business data and get clear operational next steps." action={<button type="button" onClick={() => setRefreshedAt(new Date())} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[hsl(var(--border))] px-3 text-xs font-semibold"><RefreshCw className="size-3.5"/>Refresh</button>}/>
    <SectionCard className="mb-4"><div className="flex items-start gap-3"><span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))]"><BrainCircuit className="size-5"/></span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="text-sm font-semibold">Business Sutra intelligence</h3><span className="rounded-full bg-[hsl(var(--muted))] px-2 py-1 text-[10px] font-semibold">Local AI preview</span></div><p className="mt-1 text-xs leading-5 text-[hsl(var(--muted-foreground))]">This version uses transparent rules and calculations on records already stored in this browser. It does not call an external AI model or transmit your business data.</p><p className="mt-2 text-[11px] text-[hsl(var(--muted-foreground))]">{recordCount} business records considered · Refreshed {refreshedAt.toLocaleTimeString()}</p></div></div></SectionCard>
    <SectionCard className="mb-5"><div className="mb-3 flex items-center gap-2"><Bot className="size-4 text-[hsl(var(--primary))]"/><h3 className="text-sm font-semibold">Ask about your business</h3></div><div className="mb-4 flex flex-wrap gap-2">{prompts.map(p=><button key={p} type="button" onClick={()=>ask(p)} className="rounded-full border border-[hsl(var(--border))] px-3 py-2 text-left text-[11px] font-medium hover:bg-[hsl(var(--muted)/0.5)]">{p}</button>)}</div><div className="mb-3 space-y-3">{messages.map((m,i)=><div key={i} className={['flex gap-2',m.role==='user'?'justify-end':'justify-start'].join(' ')}>{m.role==='assistant'&&<span className="grid size-7 shrink-0 place-items-center rounded-full bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))]"><Bot className="size-4"/></span>}<div className={['max-w-[88%] whitespace-pre-line rounded-2xl px-4 py-3 text-xs leading-6',m.role==='user'?'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]':'bg-[hsl(var(--muted)/0.65)] text-[hsl(var(--foreground))]'].join(' ')}>{m.content}</div>{m.role==='user'&&<span className="grid size-7 shrink-0 place-items-center rounded-full bg-[hsl(var(--muted))]"><UserRound className="size-4"/></span>}</div>)}</div><form onSubmit={e=>{e.preventDefault();ask(question);}} className="flex gap-2"><input value={question} onChange={e=>setQuestion(e.target.value)} placeholder="Ask about revenue, marketing, stock, tasks or profit..." className={inputClass+' min-w-0 flex-1'}/><button type="submit" disabled={!question.trim()} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-4 text-xs font-semibold text-[hsl(var(--primary-foreground))] disabled:opacity-50"><Send className="size-3.5"/>Ask</button></form></SectionCard>
    <div className="mb-3 flex items-center gap-2"><Sparkles className="size-4 text-[hsl(var(--primary))]"/><h3 className="text-sm font-semibold">Recommended actions</h3></div>
    <div className="grid gap-3 lg:grid-cols-2">{findings.map(item=><SectionCard key={item.title}><div className="flex items-start gap-3"><span className={['grid size-9 shrink-0 place-items-center rounded-lg',item.tone==='positive'?'bg-emerald-500/10 text-emerald-600':item.tone==='warning'?'bg-amber-500/10 text-amber-600':'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]'].join(' ')}>{item.tone==='positive'?<CheckCircle2 className="size-4"/>:item.tone==='warning'?<AlertTriangle className="size-4"/>:<Lightbulb className="size-4"/>}</span><div className="min-w-0 flex-1"><p className="text-sm font-semibold">{item.title}</p><p className="mt-2 text-xs leading-5 text-[hsl(var(--muted-foreground))]">{item.detail}</p><div className="mt-3 rounded-lg bg-[hsl(var(--muted)/0.55)] p-3"><p className="text-[10px] font-bold uppercase tracking-wide text-[hsl(var(--muted-foreground))]">Suggested next step</p><p className="mt-1 text-xs leading-5">{item.action}</p></div><Link href={item.href} className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-[hsl(var(--accent-foreground))]">Open module <span aria-hidden="true">→</span></Link></div></div></SectionCard>)}</div>
    <p className="mt-4 text-[11px] leading-5 text-[hsl(var(--muted-foreground))]">This is a rules-based assistant, not a connected large language model. Financial figures are operational estimates from recorded data, not accounting, tax, legal or investment advice.</p>
  </PageFrame>;
}
