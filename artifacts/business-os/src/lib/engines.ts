import type {
  AppNotification,
  AppHref,
  Business,
  Campaign,
  Customer,
  Lead,
  Expense,
  Product,
  Sale,
  Target,
  TaskItem,
  WorkspaceDB,
} from "@/lib/domain";
import { createId, nowIso, roundMoney, startOfDay } from "@/lib/utils";
import { isLeadFollowUpDue } from "@/lib/lead-utils";

export interface DateRange {
  from: Date;
  to: Date;
  label: string;
}

export function monthRange(now = new Date()): DateRange {
  const from = new Date(now.getFullYear(), now.getMonth(), 1);
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  const label = from.toLocaleString(undefined, { month: "long", year: "numeric" });
  return { from, to, label };
}

export function inRange(iso: string, range: DateRange): boolean {
  const t = new Date(iso).getTime();
  return t >= range.from.getTime() && t <= range.to.getTime();
}

function salesIn(db: WorkspaceDB, businessId: string, range?: DateRange): Sale[] {
  return db.sales.filter((s) => s.businessId === businessId && s.status !== "reversed" && (!range || inRange(s.createdAt, range)));
}

function expensesIn(db: WorkspaceDB, businessId: string, range?: DateRange): Expense[] {
  return db.expenses.filter((e) => e.businessId === businessId && !e.archived && (!range || inRange(e.date, range)));
}

export interface FinanceSnapshot {
  revenue: number;
  cashIn: number;
  outstanding: number;
  expenses: number;
  grossProfit: number;
  netProfit: number;
  margin: number;
  orderCount: number;
  aov: number;
  unitsSold: number;
}

export function financeSnapshot(db: WorkspaceDB, businessId: string, range?: DateRange): FinanceSnapshot {
  const sales = salesIn(db, businessId, range);
  const expenses = expensesIn(db, businessId, range);
  const revenue = roundMoney(sales.reduce((s, x) => s + x.total, 0));
  const cashMovementSales = db.sales.filter((sale) => sale.businessId === businessId);
  const cashIn = roundMoney(cashMovementSales.reduce((sum, sale) => {
    const legacyPayments = sale.payments ?? (sale.paidAmount > 0 ? [{ amount: sale.paidAmount, receivedAt: sale.createdAt }] : []);
    const received = legacyPayments.filter((payment) => !range || inRange(payment.receivedAt, range))
      .reduce((value, payment) => value + payment.amount, 0);
    const refunded = (sale.refunds ?? []).filter((refund) => !range || inRange(refund.refundedAt, range))
      .reduce((value, refund) => value + refund.amount, 0);
    return sum + received - refunded;
  }, 0));
  const outstanding = roundMoney(sales.reduce((s, x) => s + x.outstanding, 0));
  const expenseTotal = roundMoney(expenses.reduce((s, x) => s + x.amount, 0));
  const grossProfit = roundMoney(sales.reduce((s, x) => s + x.grossProfit, 0));
  const netProfit = roundMoney(grossProfit - expenseTotal);
  const margin = revenue > 0 ? roundMoney((netProfit / revenue) * 100) : 0;
  const orderCount = sales.length;
  const aov = orderCount ? roundMoney(revenue / orderCount) : 0;
  const unitsSold = sales.reduce((s, x) => s + x.items.reduce((a, i) => a + i.qty, 0), 0);
  return { revenue, cashIn, outstanding, expenses: expenseTotal, grossProfit, netProfit, margin, orderCount, aov, unitsSold };
}

export interface TargetPace {
  target: Target;
  achieved: number;
  remaining: number;
  pct: number;
  daysElapsed: number;
  daysLeft: number;
  daysTotal: number;
  requiredDaily: number;
  requiredWeekly: number;
  currentDailyPace: number;
  projected: number;
  onTrack: boolean;
}

export function currentTarget(db: WorkspaceDB, businessId: string, now = new Date()): Target | undefined {
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  const q = Math.floor(now.getMonth() / 3) + 1;
  const monthly = db.targets.find((t) => t.businessId === businessId && t.period === "monthly" && t.year === y && t.month === m);
  if (monthly) return monthly;
  const quarterly = db.targets.find((t) => t.businessId === businessId && t.period === "quarterly" && t.year === y && t.quarter === q);
  if (quarterly) return quarterly;
  return db.targets.find((t) => t.businessId === businessId && t.period === "annual" && t.year === y);
}

export function targetRange(target: Target): DateRange {
  if (target.period === "monthly" && target.month) {
    const from = new Date(target.year, target.month - 1, 1);
    const to = new Date(target.year, target.month, 0, 23, 59, 59, 999);
    return { from, to, label: from.toLocaleString(undefined, { month: "long", year: "numeric" }) };
  }
  if (target.period === "quarterly" && target.quarter) {
    const from = new Date(target.year, (target.quarter - 1) * 3, 1);
    const to = new Date(target.year, target.quarter * 3, 0, 23, 59, 59, 999);
    return { from, to, label: `Q${target.quarter} ${target.year}` };
  }
  const from = new Date(target.year, 0, 1);
  const to = new Date(target.year, 11, 31, 23, 59, 59, 999);
  return { from, to, label: String(target.year) };
}

export function computePace(db: WorkspaceDB, businessId: string, target: Target, now = new Date()): TargetPace {
  const range = targetRange(target);
  const achieved = financeSnapshot(db, businessId, range).revenue;
  const remaining = roundMoney(Math.max(0, target.amount - achieved));
  const daysTotal = Math.max(1, Math.round((range.to.getTime() - range.from.getTime()) / 86400000) + 1);
  const daysElapsed = Math.max(1, Math.min(daysTotal, Math.round((startOfDay(now).getTime() - startOfDay(range.from).getTime()) / 86400000) + 1));
  const daysLeft = Math.max(0, daysTotal - daysElapsed);
  const requiredDaily = daysLeft > 0 ? roundMoney(remaining / daysLeft) : remaining;
  const requiredWeekly = roundMoney(requiredDaily * 7);
  const currentDailyPace = roundMoney(achieved / daysElapsed);
  const projected = roundMoney(currentDailyPace * daysTotal);
  const expectedByNow = (target.amount / daysTotal) * daysElapsed;
  return {
    target,
    achieved,
    remaining,
    pct: target.amount > 0 ? roundMoney((achieved / target.amount) * 100) : 0,
    daysElapsed,
    daysLeft,
    daysTotal,
    requiredDaily,
    requiredWeekly,
    currentDailyPace,
    projected,
    onTrack: achieved + 0.0001 >= expectedByNow,
  };
}

export interface MarketingTotals {
  spend: number;
  clicks: number;
  impressions: number;
  leads: number;
  customers: number;
  revenue: number;
  cpc: number | null;
  cpl: number | null;
  cac: number | null;
  ctr: number | null;
  convLead: number | null;
  convCustomer: number | null;
  roas: number | null;
}

export function marketingTotals(campaigns: Campaign[]): MarketingTotals {
  const spend = roundMoney(campaigns.reduce((s, c) => s + c.adSpend, 0));
  const clicks = campaigns.reduce((s, c) => s + c.clicks, 0);
  const impressions = campaigns.reduce((s, c) => s + c.impressions, 0);
  const leads = campaigns.reduce((s, c) => s + c.leads, 0);
  const customers = campaigns.reduce((s, c) => s + c.customers, 0);
  const revenue = roundMoney(campaigns.reduce((s, c) => s + c.revenue, 0));
  return {
    spend,
    clicks,
    impressions,
    leads,
    customers,
    revenue,
    cpc: clicks > 0 ? roundMoney(spend / clicks) : null,
    cpl: leads > 0 ? roundMoney(spend / leads) : null,
    cac: customers > 0 ? roundMoney(spend / customers) : null,
    ctr: impressions > 0 ? roundMoney((clicks / impressions) * 100) : null,
    convLead: clicks > 0 ? roundMoney((leads / clicks) * 100) : null,
    convCustomer: leads > 0 ? roundMoney((customers / leads) * 100) : null,
    roas: spend > 0 ? roundMoney(revenue / spend) : null,
  };
}

export interface ProductProfit {
  productId: string;
  name: string;
  qty: number;
  revenue: number;
  profit: number;
}

export function productProfits(sales: Sale[]): ProductProfit[] {
  const map = new Map<string, ProductProfit>();
  for (const sale of sales) {
    const share = sale.subtotal > 0 ? (sale.total / sale.subtotal) : 1;
    for (const item of sale.items) {
      const lineRev = roundMoney((item.unitPrice * item.qty - item.discount) * share);
      const lineCost = item.costPrice * item.qty;
      const prev = map.get(item.productId) ?? { productId: item.productId, name: item.name, qty: 0, revenue: 0, profit: 0 };
      prev.qty += item.qty;
      prev.revenue = roundMoney(prev.revenue + lineRev);
      prev.profit = roundMoney(prev.profit + (lineRev - lineCost));
      map.set(item.productId, prev);
    }
  }
  return Array.from(map.values()).sort((a, b) => b.profit - a.profit);
}

export interface CustomerStats {
  customer: Customer;
  spend: number;
  orders: number;
  lastPurchase?: string;
  outstanding: number;
  segment: "new" | "active" | "high_value" | "inactive" | "follow_up";
}

export function customerStats(db: WorkspaceDB, customer: Customer, now = new Date()): CustomerStats {
  const sales = db.sales.filter((s) => s.customerId === customer.id && s.status !== "reversed");
  const spend = roundMoney(sales.reduce((s, x) => s + x.total, 0));
  const outstanding = roundMoney(sales.reduce((s, x) => s + x.outstanding, 0));
  const lastPurchase = sales[0]?.createdAt;
  const all = db.sales.filter((s) => s.businessId === customer.businessId && s.status !== "reversed");
  const avg = all.length ? all.reduce((s, x) => s + x.total, 0) / Math.max(1, new Set(all.map((s) => s.customerId).filter(Boolean)).size) : 0;
  const daysSince = lastPurchase ? (now.getTime() - new Date(lastPurchase).getTime()) / 86400000 : 999;
  let segment: CustomerStats["segment"] = "new";
  if (outstanding > 0 || (sales.length >= 1 && daysSince > 45)) segment = "follow_up";
  else if (!sales.length) segment = "new";
  else if (daysSince > 60) segment = "inactive";
  else if (spend >= avg * 1.5 && spend > 0 && sales.length >= 2) segment = "high_value";
  else segment = "active";
  return { customer, spend, orders: sales.length, lastPurchase, outstanding, segment };
}

export interface DailyPoint {
  date: string;
  revenue: number;
  expenses: number;
}

export function lastNDaysSeries(db: WorkspaceDB, businessId: string, days = 14, now = new Date()): DailyPoint[] {
  const points: DailyPoint[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const revenue = db.sales
      .filter((s) => s.businessId === businessId && s.status !== "reversed" && s.createdAt.slice(0, 10) === key)
      .reduce((s, x) => s + x.total, 0);
    const expenses = db.expenses
      .filter((e) => e.businessId === businessId && e.date.slice(0, 10) === key)
      .reduce((s, x) => s + x.amount, 0);
    points.push({ date: key, revenue: roundMoney(revenue), expenses: roundMoney(expenses) });
  }
  return points;
}

export interface Insight {
  id: string;
  tone: "info" | "good" | "warn" | "bad";
  title: string;
  body: string;
}

export interface ActionItem {
  id: string;
  severity: "high" | "medium" | "low";
  title: string;
  body: string;
  href: AppHref;
  cta: string;
  entityId?: string;
}

export interface BusinessContext {
  business: Pick<Business, "id" | "name" | "industry" | "currency" | "country">;
  period: { label: string };
  kpis: FinanceSnapshot;
  previous?: FinanceSnapshot;
  target?: TargetPace;
  stock: { low: Product[]; out: Product[] };
  tasks: { dueToday: TaskItem[]; overdue: TaskItem[]; open: number };
  payments: { count: number; amount: number };
  marketing?: MarketingTotals;
  topProducts: ProductProfit[];
  topCustomers: CustomerStats[];
  followUpCustomers: CustomerStats[];
  followUpLeads: Lead[];
  activeLeads: Lead[];
  procurement: {
    supplierCount: number;
    purchaseCount: number;
    total: number;
    paid: number;
    outstanding: number;
    openCount: number;
  };
  expenseBreakdown: { category: string; amount: number }[];
  series: DailyPoint[];
  customerCount: number;
  productCount: number;
}

export function buildContext(db: WorkspaceDB, business: Business, now = new Date()): BusinessContext {
  const range = monthRange(now);
  const prevFrom = new Date(range.from);
  prevFrom.setMonth(prevFrom.getMonth() - 1);
  const prevTo = new Date(range.from);
  prevTo.setMilliseconds(-1);
  const prevRange: DateRange = {
    from: prevFrom,
    to: prevTo,
    label: prevFrom.toLocaleString(undefined, { month: "long" }),
  };
  const kpis = financeSnapshot(db, business.id, range);
  const previous = financeSnapshot(db, business.id, prevRange);
  const target = currentTarget(db, business.id, now);
  const products = db.products.filter((p) => p.businessId === business.id && !p.archived);
  const low = products.filter((p) => p.stock > 0 && p.stock <= p.minStock);
  const out = products.filter((p) => p.stock <= 0);
  const tasks = db.tasks.filter((t) => t.businessId === business.id && t.status !== "done");
  const today = startOfDay(now).toISOString().slice(0, 10);
  const dueToday = tasks.filter((t) => t.dueDate && t.dueDate.slice(0, 10) === today);
  const overdue = tasks.filter((t) => t.dueDate && t.dueDate.slice(0, 10) < today);
  const unpaid = db.sales.filter((s) => s.businessId === business.id && s.status !== "reversed" && s.outstanding > 0);
  const campaigns = db.campaigns.filter((c) => c.businessId === business.id && inRange(c.date, range));
  const monthSales = salesIn(db, business.id, range);
  const customers = db.customers.filter((c) => c.businessId === business.id);
  const stats = customers.map((c) => customerStats(db, c, now)).sort((a, b) => b.spend - a.spend);
  const followUpLeads = db.leads.filter((lead) => lead.businessId === business.id && isLeadFollowUpDue(lead, now));
  const activeLeads = db.leads.filter((lead) => lead.businessId === business.id && lead.stage !== "won" && lead.stage !== "lost");
  const expenseBreakdownMap = new Map<string, number>();
  for (const e of expensesIn(db, business.id, range)) {
    expenseBreakdownMap.set(e.category, roundMoney((expenseBreakdownMap.get(e.category) ?? 0) + e.amount));
  }
  return {
    business: {
      id: business.id,
      name: business.name,
      industry: business.industry,
      currency: business.currency,
      country: business.country,
    },
    period: { label: range.label },
    kpis,
    previous,
    target: target ? computePace(db, business.id, target, now) : undefined,
    stock: { low, out },
    tasks: { dueToday, overdue, open: tasks.length },
    payments: {
      count: unpaid.length,
      amount: roundMoney(unpaid.reduce((s, x) => s + x.outstanding, 0)),
    },
    marketing: campaigns.length ? marketingTotals(campaigns) : undefined,
    topProducts: productProfits(monthSales).slice(0, 5),
    topCustomers: stats.slice(0, 5),
    followUpCustomers: stats
      .filter((customer) => customer.segment === "follow_up" || customer.segment === "inactive" || customer.outstanding > 0)
      .sort((a, b) => b.outstanding - a.outstanding || b.spend - a.spend),
    followUpLeads,
    activeLeads,
    procurement: (() => {
      const suppliers = db.suppliers.filter((supplier) => supplier.businessId === business.id);
      const purchases = db.purchases.filter((purchase) => purchase.businessId === business.id);
      return {
        supplierCount: suppliers.length,
        purchaseCount: purchases.length,
        total: roundMoney(purchases.reduce((sum, purchase) => sum + purchase.total, 0)),
        paid: roundMoney(purchases.reduce((sum, purchase) => sum + purchase.paidAmount, 0)),
        outstanding: roundMoney(purchases.reduce((sum, purchase) => sum + purchase.balance, 0)),
        openCount: purchases.filter((purchase) => purchase.balance > 0).length,
      };
    })(),
    expenseBreakdown: Array.from(expenseBreakdownMap.entries())
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount),
    series: lastNDaysSeries(db, business.id, 14, now),
    customerCount: customers.length,
    productCount: products.length,
  };
}

export function deriveInsights(ctx: BusinessContext): Insight[] {
  const insights: Insight[] = [];
  const { kpis, previous, target, stock, tasks, payments, marketing } = ctx;

  if (kpis.orderCount === 0 && kpis.expenses === 0) {
    insights.push({
      id: "empty",
      tone: "info",
      title: "No activity recorded this month",
      body: "Add a product and record your first sale to start tracking revenue, profit, and pace.",
    });
    return insights;
  }

  if (target) {
    if (!target.onTrack) {
      insights.push({
        id: "target-pace",
        tone: "warn",
        title: "Revenue is below target pace",
        body: `You have made ${fmt(target.achieved, ctx)} of a ${fmt(target.target.amount, ctx)} target. At the current daily pace of ${fmt(target.currentDailyPace, ctx)}, the period projects to ${fmt(target.projected, ctx)}.`,
      });
    } else if (target.pct >= 100) {
      insights.push({
        id: "target-hit",
        tone: "good",
        title: "Target already reached",
        body: `Revenue is ${fmt(target.achieved, ctx)} against a ${fmt(target.target.amount, ctx)} target for ${ctx.period.label}.`,
      });
    } else {
      insights.push({
        id: "target-ontrack",
        tone: "good",
        title: "On track for the revenue target",
        body: `${Math.round(target.pct)}% achieved. Required remaining pace is ${fmt(target.requiredDaily, ctx)} per day.`,
      });
    }
  }

  if (previous && (kpis.revenue > 0 || previous.revenue > 0 || kpis.expenses > 0 || previous.expenses > 0)) {
    if (kpis.margin < previous.margin - 0.5 && kpis.expenses > previous.expenses && kpis.revenue <= previous.revenue) {
      insights.push({
        id: "margin-drop",
        tone: "bad",
        title: "Profit margin decreased",
        body: `Margin moved from ${previous.margin.toFixed(1)}% to ${kpis.margin.toFixed(1)}% because expenses increased faster than revenue.`,
      });
    } else if (kpis.expenses > previous.expenses && previous.expenses > 0) {
      const lift = ((kpis.expenses - previous.expenses) / previous.expenses) * 100;
      if (lift >= 15) {
        const top = ctx.expenseBreakdown[0];
        insights.push({
          id: "cost-up",
          tone: "warn",
          title: "Costs are rising",
          body: `Expenses are up ${lift.toFixed(0)}% versus last month${top ? `, led by ${top.category}` : ""}.`,
        });
      }
    }
  }

  for (const p of stock.out.slice(0, 3)) {
    insights.push({
      id: `out-${p.id}`,
      tone: "bad",
      title: `${p.name} is out of stock`,
      body: `SKU ${p.sku} has 0 ${p.unit} remaining.`,
    });
  }
  for (const p of stock.low.slice(0, 3)) {
    insights.push({
      id: `low-${p.id}`,
      tone: "warn",
      title: `${p.name} is selling through`,
      body: `${p.name} has reached its minimum stock level (${p.stock} ${p.unit} left, minimum ${p.minStock}).`,
    });
  }

  if (ctx.procurement.outstanding > 0) {
    insights.push({
      id: "supplier-payables",
      tone: "warn",
      title: "Supplier payments are outstanding",
      body: `${fmt(ctx.procurement.outstanding, ctx)} remains payable across ${ctx.procurement.openCount} purchases.`,
    });
  }

  if (payments.count > 0) {
    insights.push({
      id: "unpaid",
      tone: "warn",
      title: `${payments.count} ${payments.count === 1 ? "invoice is" : "invoices are"} unpaid`,
      body: `${fmt(payments.amount, ctx)} is still outstanding.`,
    });
  }

  if (tasks.overdue.length > 0) {
    insights.push({
      id: "overdue-tasks",
      tone: "warn",
      title: `${tasks.overdue.length} overdue ${tasks.overdue.length === 1 ? "task" : "tasks"}`,
      body: tasks.overdue.slice(0, 3).map((t) => t.title).join(", ") + (tasks.overdue.length > 3 ? "…" : ""),
    });
  }

  if (marketing && marketing.spend > 0) {
    if (marketing.roas !== null && marketing.roas < 1) {
      insights.push({
        id: "roas-low",
        tone: "bad",
        title: "Marketing is not covering its cost",
        body: `Ad spend is ${fmt(marketing.spend, ctx)} against ${fmt(marketing.revenue, ctx)} attributed revenue (ROAS ${marketing.roas.toFixed(2)}x).`,
      });
    } else if (marketing.customers === 0 && marketing.spend > 0) {
      insights.push({
        id: "ads-no-cust",
        tone: "warn",
        title: "Ad spend has not produced customers yet",
        body: `${fmt(marketing.spend, ctx)} spent this month with ${marketing.leads} leads and 0 attributed customers.`,
      });
    } else if (marketing.cac !== null && kpis.aov > 0 && marketing.cac > kpis.aov) {
      insights.push({
        id: "cac-high",
        tone: "warn",
        title: "Customer acquisition is more expensive than average order value",
        body: `CAC is ${fmt(marketing.cac, ctx)} while AOV is ${fmt(kpis.aov, ctx)}.`,
      });
    }
  }

  const top = ctx.topProducts[0];
  if (top && top.profit > 0) {
    insights.push({
      id: "top-product",
      tone: "good",
      title: `${top.name} is the most profitable product this month`,
      body: `${fmt(top.profit, ctx)} gross profit on ${top.qty} sold.`,
    });
  }

  return insights.slice(0, 8);
}

export function deriveActions(ctx: BusinessContext): ActionItem[] {
  const actions: ActionItem[] = [];
  for (const p of ctx.stock.out) {
    actions.push({
      id: `reorder-out-${p.id}`,
      severity: "high",
      title: `${p.name} is out of stock`,
      body: "Restock before the next sale.",
      href: "/inventory",
      cta: "Reorder",
      entityId: p.id,
    });
  }
  for (const p of ctx.stock.low) {
    actions.push({
      id: `reorder-low-${p.id}`,
      severity: "medium",
      title: `${p.name} is below minimum stock`,
      body: `${p.stock} ${p.unit} left · min ${p.minStock}`,
      href: "/inventory",
      cta: "Reorder",
      entityId: p.id,
    });
  }
  if (ctx.payments.count > 0) {
    actions.push({
      id: "collect-payments",
      severity: "high",
      title: `Collect ${ctx.payments.count} pending ${ctx.payments.count === 1 ? "payment" : "payments"}`,
      body: `${fmt(ctx.payments.amount, ctx)} outstanding`,
      href: "/sales",
      cta: "Follow up",
    });
  }
  for (const t of ctx.tasks.overdue) {
    actions.push({
      id: `task-${t.id}`,
      severity: "high",
      title: `Overdue: ${t.title}`,
      body: t.dueDate ? `Due ${t.dueDate.slice(0, 10)}` : "Past due",
      href: "/tasks",
      cta: "Complete",
      entityId: t.id,
    });
  }
  for (const t of ctx.tasks.dueToday) {
    actions.push({
      id: `today-${t.id}`,
      severity: "medium",
      title: `Due today: ${t.title}`,
      body: t.description || "Open the task to update it.",
      href: "/tasks",
      cta: "Open",
      entityId: t.id,
    });
  }
  if (ctx.procurement.outstanding > 0) {
    actions.push({
      id: "supplier-payables",
      severity: "medium",
      title: `Review ${ctx.procurement.openCount} open supplier purchases`,
      body: `${fmt(ctx.procurement.outstanding, ctx)} payable across recorded purchases.`,
      href: "/purchases",
      cta: "Review payables",
    });
  }
  if (ctx.target && !ctx.target.onTrack) {
    actions.push({
      id: "pace",
      severity: "medium",
      title: "Revenue is behind target pace",
      body: `${fmt(ctx.target.requiredDaily, ctx)} needed per day to finish on target.`,
      href: "/targets",
      cta: "View plan",
    });
  }
  if (ctx.marketing && ctx.marketing.spend > 0 && (ctx.marketing.roas === null || ctx.marketing.roas < 1)) {
    actions.push({
      id: "review-ads",
      severity: "medium",
      title: "Review campaigns with weak return",
      body: `Spend ${fmt(ctx.marketing.spend, ctx)} · attributed revenue ${fmt(ctx.marketing.revenue, ctx)}`,
      href: "/marketing",
      cta: "Review",
    });
  }
  for (const c of ctx.followUpCustomers.slice(0, 5)) {
    actions.push({
      id: `follow-${c.customer.id}`,
      severity: "low",
      title: `Follow up with ${c.customer.name}`,
      body: c.outstanding > 0 ? `${fmt(c.outstanding, ctx)} outstanding` : "No recent purchase",
      href: "/customers",
      cta: "Open",
      entityId: c.customer.id,
    });
  }
  if (!actions.length && ctx.kpis.orderCount === 0) {
    actions.push({
      id: "first-sale",
      severity: "low",
      title: "Record your first sale",
      body: "Sales update inventory, revenue, profit, and customer history automatically.",
      href: "/sell",
      cta: "Start sale",
    });
  }
  if (!actions.length && ctx.productCount === 0) {
    actions.push({
      id: "first-product",
      severity: "low",
      title: "Add your first product",
      body: "Products are required to monitor stock and take sales.",
      href: "/products",
      cta: "Add product",
    });
  }
  return actions;
}

export function deriveNotifications(ctx: BusinessContext): AppNotification[] {
  const now = nowIso();
  const notes: AppNotification[] = [];
  const push = (n: Omit<AppNotification, "id" | "businessId" | "read" | "createdAt">) => {
    notes.push({
      id: createId("ntf"),
      businessId: ctx.business.id,
      read: false,
      createdAt: now,
      ...n,
    });
  };
  for (const p of ctx.stock.out) {
    push({
      key: `out:${p.id}`,
      type: "out_of_stock",
      title: `${p.name} is out of stock`,
      body: `SKU ${p.sku} has no remaining units.`,
      href: "/inventory",
      actionLabel: "Restock",
    });
  }
  for (const p of ctx.stock.low) {
    push({
      key: `low:${p.id}`,
      type: "low_stock",
      title: `Low stock: ${p.name}`,
      body: `${p.stock} ${p.unit} left (minimum ${p.minStock}).`,
      href: "/inventory",
      actionLabel: "Reorder",
    });
  }
  for (const t of ctx.tasks.overdue) {
    push({
      key: `task:${t.id}`,
      type: "overdue_task",
      title: `Overdue task: ${t.title}`,
      body: "This task is past its due date.",
      href: "/tasks",
      actionLabel: "Update",
    });
  }
  for (const lead of ctx.followUpLeads) {
    push({
      key: `lead-followup:${lead.id}`,
      type: "customer_followup",
      title: `Lead follow-up due: ${lead.name}`,
      body: lead.company ? `Follow up with ${lead.company}.` : "This lead has a follow-up scheduled.",
      href: "/leads",
      actionLabel: "Open lead",
    });
  }
  for (const item of ctx.followUpCustomers.slice(0, 5)) {
    const customer = item.customer;
    push({
      key: `customer-followup:${customer.id}`,
      type: "customer_followup",
      title: `Customer follow-up: ${customer.name}`,
      body: item.outstanding > 0 ? `Outstanding balance: ${fmt(item.outstanding, ctx)}.` : "Review this customer relationship and plan the next touchpoint.",
      href: "/customers",
      actionLabel: "View customer",
    });
  }
  if (ctx.target && !ctx.target.onTrack && ctx.target.pct < 90) {
    push({
      key: `target:${ctx.target.target.id}:${ctx.period.label}`,
      type: "target_risk",
      title: "Revenue target at risk",
      body: `Projected ${fmt(ctx.target.projected, ctx)} against ${fmt(ctx.target.target.amount, ctx)}.`,
      href: "/targets",
      actionLabel: "View target",
    });
  }
  if (ctx.payments.count > 0) {
    push({
      key: `pay:${ctx.payments.count}:${Math.round(ctx.payments.amount)}`,
      type: "pending_payment",
      title: "Pending payments",
      body: `${ctx.payments.count} sales still have outstanding balances.`,
      href: "/sales",
      actionLabel: "Follow up",
    });
  }
  if (ctx.marketing && ctx.marketing.spend > 0 && ctx.marketing.roas !== null && ctx.marketing.roas < 1) {
    push({
      key: `mkt:${ctx.period.label}:${ctx.marketing.spend}`,
      type: "marketing_change",
      title: "Marketing return dropped below 1x",
      body: `ROAS is ${ctx.marketing.roas.toFixed(2)}x this month.`,
      href: "/marketing",
      actionLabel: "Review",
    });
  }
  return notes;
}

function fmt(n: number, ctx: BusinessContext): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: ctx.business.currency,
      maximumFractionDigits: 0,
    }).format(n);
  } catch {
    return `${ctx.business.currency} ${Math.round(n)}`;
  }
}

export interface AdvisorReply {
  question: string;
  facts: string[];
  calculations: string[];
  recommendations: string[];
}

const ADVISOR_PROMPTS = [
  "Give me a business health summary",
  "Show this month's sales performance",
  "How much customer payment is pending?",
  "Which products are low or out of stock?",
  "Which product makes the most profit?",
  "How are my marketing campaigns performing?",
  "Show supplier payments and purchase balance",
  "Which customers need follow-up?",
  "Which leads need follow-up?",
  "What is the value of my active sales pipeline?",
  "What should I focus on today?",
  "Will I hit my revenue target?",
  "Why is my profit falling?",
  "Where am I losing money?",
  "Aaj mujhe kis par focus karna chahiye?",
  "Kitna customer payment lena baaki hai?",
  "Mera stock kahan kam ho raha hai?",
];

export { ADVISOR_PROMPTS };

function salesSummary(ctx: BusinessContext, question: string): AdvisorReply {
  const facts = [
    `Booked revenue: ${fmt(ctx.kpis.revenue, ctx)} across ${ctx.kpis.orderCount} sales.`,
    `Cash collected: ${fmt(ctx.kpis.cashIn, ctx)}; customer balances outstanding: ${fmt(ctx.kpis.outstanding, ctx)}.`,
    `Average order value: ${fmt(ctx.kpis.aov, ctx)} across ${ctx.kpis.orderCount} orders.`,
    `Units sold: ${ctx.kpis.unitsSold}.`,
  ];
  const calculations = ctx.previous ? [
    `Revenue versus previous month: ${delta(ctx.kpis.revenue, ctx.previous.revenue, ctx)}.`,
    `Order count: ${ctx.kpis.orderCount} now versus ${ctx.previous.orderCount} previously.`,
  ] : [`No previous month comparison is available yet.`];
  const recommendations: string[] = [];
  if (ctx.kpis.outstanding > 0) recommendations.push(`Follow up on ${fmt(ctx.kpis.outstanding, ctx)} in unpaid customer balances.`);
  if (ctx.kpis.orderCount > 0 && ctx.kpis.aov > 0) recommendations.push(`Use ${fmt(ctx.kpis.aov, ctx)} as the current average order benchmark; test bundles or add-ons to improve it.`);
  if (!ctx.kpis.orderCount) recommendations.push("Record sales against products and customers to build a reliable sales trend.");
  return { question, facts, calculations, recommendations };
}

function collectionAdvice(ctx: BusinessContext, question: string): AdvisorReply {
  const facts = [
    `Customer receivables: ${fmt(ctx.payments.amount, ctx)} across ${ctx.payments.count} unpaid or partially paid sales.`,
    `Cash received this month: ${fmt(ctx.kpis.cashIn, ctx)} from ${fmt(ctx.kpis.revenue, ctx)} in booked sales.`,
  ];
  const calculations = [
    `Collection ratio this month: ${ctx.kpis.revenue > 0 ? ((ctx.kpis.cashIn / ctx.kpis.revenue) * 100).toFixed(1) : "0.0"}% of booked revenue.`,
  ];
  if (ctx.procurement.outstanding > 0) {
    facts.push(`Supplier payables: ${fmt(ctx.procurement.outstanding, ctx)} across ${ctx.procurement.openCount} open purchases.`);
  }
  const recommendations = ctx.payments.count
    ? ["Open Sales and contact customers with the oldest outstanding balances first.", "Record each collection against the correct sale so the balance and reports stay accurate."]
    : ["No unpaid customer sales are currently recorded."];
  return { question, facts, calculations, recommendations };
}

function inventoryAdvice(ctx: BusinessContext, question: string): AdvisorReply {
  const facts = [
    `${ctx.productCount} active products are in the catalogue.`,
    `${ctx.stock.out.length} products are out of stock and ${ctx.stock.low.length} are at or below minimum stock.`,
  ];
  const calculations: string[] = [];
  const recommendations: string[] = [];
  if (ctx.stock.out.length) {
    facts.push(`Out of stock: ${ctx.stock.out.slice(0, 5).map((product) => product.name).join(", ")}.`);
    recommendations.push("Prioritise out-of-stock items that have recent sales before ordering slower products.");
  }
  if (ctx.stock.low.length) {
    facts.push(`Low stock: ${ctx.stock.low.slice(0, 5).map((product) => `${product.name} (${product.stock} left; minimum ${product.minStock})`).join("; ")}.`);
    recommendations.push("Use Purchases to record confirmed supplier orders; stock will update when goods are received.");
  }
  if (!recommendations.length) recommendations.push("No stock alerts are active. Review stock levels after each goods receipt and sale.");
  return { question, facts, calculations, recommendations };
}

function leadAdvice(ctx: BusinessContext, question: string): AdvisorReply {
  const value = ctx.activeLeads.reduce((sum, lead) => sum + lead.value, 0);
  const facts = [
    `${ctx.activeLeads.length} active leads in the pipeline, with a combined potential value of ${fmt(value, ctx)}.`,
    ctx.followUpLeads.length
      ? `Follow-up due: ${ctx.followUpLeads.slice(0, 6).map((lead) => lead.name + (lead.company ? ' (' + lead.company + ')' : '')).join(', ')}.`
      : "No open lead follow-ups are due right now.",
  ];
  const recommendations = ctx.followUpLeads.length
    ? ["Contact leads with due follow-ups first, then record the outcome and set the next follow-up date."]
    : ["Review New and Proposal stage leads and set a specific next follow-up date for each active opportunity."];
  return { question, facts, calculations: [], recommendations };
}

function marketingAdvice(ctx: BusinessContext, question: string): AdvisorReply {
  if (!ctx.marketing) {
    return {
      question,
      facts: ["No marketing campaign metrics are recorded for the current month."],
      calculations: [],
      recommendations: ["Add campaign spend, impressions, clicks, leads, customers and attributed revenue in Marketing before judging performance."],
    };
  }
  const m = ctx.marketing;
  return {
    question,
    facts: [
      `Spend ${fmt(m.spend, ctx)}; attributed revenue ${fmt(m.revenue, ctx)}.`,
      `${m.impressions} impressions, ${m.clicks} clicks, ${m.leads} leads and ${m.customers} attributed customers.`,
    ],
    calculations: [
      `CTR: ${m.ctr === null ? "not available" : m.ctr.toFixed(2) + "%"}; CPL: ${m.cpl === null ? "not available" : fmt(m.cpl, ctx)}; CAC: ${m.cac === null ? "not available" : fmt(m.cac, ctx)}.`,
      `ROAS: ${m.roas === null ? "not available" : m.roas.toFixed(2) + "x"}.`,
    ],
    recommendations: m.leads === 0
      ? ["Check tracking and campaign lead capture before increasing spend."]
      : m.roas !== null && m.roas < 1
        ? ["Break results down by campaign and channel; reduce spend only after checking lead quality and the attribution window."]
        : ["Compare cost per lead and lead-to-customer conversion by channel, then move budget toward the source with the best qualified outcomes."],
  };
}

function procurementAdvice(ctx: BusinessContext, question: string): AdvisorReply {
  const p = ctx.procurement;
  if (!p.purchaseCount) {
    return {
      question,
      facts: [`${p.supplierCount} suppliers are saved, but no purchases have been recorded yet.`],
      calculations: [],
      recommendations: ["Record goods receipts in Purchases to increase stock and track supplier payments. Do not add received stock manually as well, or it may be counted twice."],
    };
  }
  return {
    question,
    facts: [
      `${p.purchaseCount} purchase records worth ${fmt(p.total, ctx)}.`,
      `Paid to suppliers: ${fmt(p.paid, ctx)}; outstanding: ${fmt(p.outstanding, ctx)} across ${p.openCount} open purchases.`,
      `${p.supplierCount} suppliers on file.`,
    ],
    calculations: [
      `Supplier payment ratio: ${p.total > 0 ? ((p.paid / p.total) * 100).toFixed(1) : "0.0"}%.`,
    ],
    recommendations: p.outstanding > 0
      ? ["Review the open purchase records and agree payment dates with suppliers before making a payment."]
      : ["All recorded purchases are settled. Keep recording each goods receipt against its supplier for a complete stock and payable trail."],
  };
}

export function advise(question: string, ctx: BusinessContext): AdvisorReply {
  const q = question.toLowerCase().normalize("NFKC").replace(/\s+/g, " ").trim();
  if (!q) return {
    question,
    facts: [],
    calculations: [],
    recommendations: ["Ask about sales, profit, collections, stock, customers, marketing, purchases or today's priorities."],
  };

  // Rule-based intent routing remains deterministic until a hosted AI provider
  // is connected. Include common Hindi/Hinglish terms because operators rarely
  // phrase every business question in formal English.
  if (/(purchase|supplier|vendor|payable|maal mang|khareed|kharid|supplier ko|vendor ko)/.test(q)) {
    return procurementAdvice(ctx, question);
  }
  if (/(collection|collect|outstanding|unpaid|receivable|payment due|payment lena|lena baaki|udhaar|paise lene|payment pending)/.test(q)) {
    return collectionAdvice(ctx, question);
  }
  if (/(stock|inventory|reorder|restock|out of stock|low stock|maal kitna|stock kitna)/.test(q)) {
    return inventoryAdvice(ctx, question);
  }
  if (/(lead follow.?up|which leads|leads need|sales pipeline|prospect|enquir|pipeline value)/.test(q)) {
    return leadAdvice(ctx, question);
  }
  if (/(marketing|campaign|ads|ad spend|roas|cpl|cac|lead|advertising|facebook|google ad)/.test(q)) {
    return marketingAdvice(ctx, question);
  }
  if (/(sales|sale|revenue|bikri|kitni sale|kitna revenue|average order|aov)/.test(q)) {
    return salesSummary(ctx, question);
  }
  if (q.includes("profit falling") || q.includes("profit fall") || (q.includes("why") && q.includes("profit")) || q.includes("munafa kyu")) {
    return profitWhy(ctx, question);
  }
  if (q.includes("which product") || q.includes("most profit") || q.includes("best product") || q.includes("sabse profitable")) {
    return productBest(ctx, question);
  }
  if (q.includes("losing money") || q.includes("where am i losing") || q.includes("loss kaha")) {
    return losingMoney(ctx, question);
  }
  if (q.includes("follow-up") || q.includes("follow up") || q.includes("which customers") || q.includes("customer kisko call")) {
    return customersNeed(ctx, question);
  }
  if (q.includes("focus") || q.includes("today") || q.includes("aaj kya")) {
    return focusToday(ctx, question);
  }
  if ((q.includes("hit") && q.includes("target")) || q.includes("will i hit") || q.includes("revenue target") || q.includes("target achieve")) {
    return targetOutlook(ctx, question);
  }
  if (q.includes("cost") && (q.includes("increase") || q.includes("rising") || q.includes("causing")) || q.includes("kharcha")) {
    return costDrivers(ctx, question);
  }
  return analyze(ctx, question);
}

function analyze(ctx: BusinessContext, question: string): AdvisorReply {
  const facts: string[] = [
    `${ctx.business.name} · ${ctx.period.label}`,
    `Revenue ${fmt(ctx.kpis.revenue, ctx)} from ${ctx.kpis.orderCount} sales.`,
    `Expenses ${fmt(ctx.kpis.expenses, ctx)}. Net profit ${fmt(ctx.kpis.netProfit, ctx)} (${ctx.kpis.margin.toFixed(1)}% margin).`,
  ];
  if (ctx.kpis.outstanding > 0) facts.push(`${fmt(ctx.kpis.outstanding, ctx)} outstanding on unpaid sales.`);
  const calculations: string[] = [];
  if (ctx.previous) {
    calculations.push(
      `Versus last month: revenue ${delta(ctx.kpis.revenue, ctx.previous.revenue, ctx)}, expenses ${delta(ctx.kpis.expenses, ctx.previous.expenses, ctx)}, net profit ${delta(ctx.kpis.netProfit, ctx.previous.netProfit, ctx)}.`,
    );
  }
  if (ctx.target) {
    calculations.push(
      `Target ${fmt(ctx.target.target.amount, ctx)} · achieved ${fmt(ctx.target.achieved, ctx)} (${Math.round(ctx.target.pct)}%) · projected ${fmt(ctx.target.projected, ctx)}.`,
    );
  }
  const recommendations: string[] = deriveActions(ctx).slice(0, 4).map((a) => `${a.title} — ${a.cta}.`);
  if (!recommendations.length) {
    recommendations.push("Keep recording every sale and expense so the cockpit can explain changes.");
  }
  if (ctx.kpis.orderCount === 0) {
    return {
      question,
      facts: [`No sales are recorded for ${ctx.period.label}.`],
      calculations: ctx.kpis.expenses > 0 ? [`Expenses of ${fmt(ctx.kpis.expenses, ctx)} are already on the books, so net profit is negative.`] : [],
      recommendations: ["Add products, then record a sale. Insights stay empty until there is real activity."],
    };
  }
  return { question, facts, calculations, recommendations };
}

function profitWhy(ctx: BusinessContext, question: string): AdvisorReply {
  if (!ctx.previous) {
    return {
      question,
      facts: [`Net profit this month is ${fmt(ctx.kpis.netProfit, ctx)}.`],
      calculations: ["There is no previous month of data to compare against."],
      recommendations: ["Record another month of sales and expenses to see profit movement."],
    };
  }
  const facts = [
    `Net profit ${fmt(ctx.kpis.netProfit, ctx)} this month vs ${fmt(ctx.previous.netProfit, ctx)} last month.`,
    `Revenue ${fmt(ctx.kpis.revenue, ctx)} vs ${fmt(ctx.previous.revenue, ctx)}.`,
    `Expenses ${fmt(ctx.kpis.expenses, ctx)} vs ${fmt(ctx.previous.expenses, ctx)}.`,
    `Gross profit ${fmt(ctx.kpis.grossProfit, ctx)} vs ${fmt(ctx.previous.grossProfit, ctx)}.`,
  ];
  const calculations: string[] = [];
  const recs: string[] = [];
  if (ctx.kpis.netProfit >= ctx.previous.netProfit) {
    calculations.push("Profit is not falling versus last month in the recorded data.");
  } else {
    const revDrop = ctx.previous.revenue - ctx.kpis.revenue;
    const expUp = ctx.kpis.expenses - ctx.previous.expenses;
    const gpDrop = ctx.previous.grossProfit - ctx.kpis.grossProfit;
    if (expUp > 0 && expUp >= revDrop) {
      calculations.push(`Expenses rose by ${fmt(expUp, ctx)}, which accounts for most of the profit decline.`);
      recs.push("Open expenses and review the largest category this month.");
    }
    if (revDrop > 0) {
      calculations.push(`Revenue is down ${fmt(revDrop, ctx)}.`);
      recs.push("Check sales volume and average order value.");
    }
    if (gpDrop > 0 && ctx.kpis.revenue >= ctx.previous.revenue) {
      calculations.push("Revenue held, but gross profit fell — discounts or cost prices may have increased.");
    }
  }
  if (!recs.length) recs.push("No profit decline is visible in this month versus last month.");
  return { question, facts, calculations, recommendations: recs };
}

function productBest(ctx: BusinessContext, question: string): AdvisorReply {
  if (!ctx.topProducts.length) {
    return {
      question,
      facts: ["No product sales are recorded this month."],
      calculations: [],
      recommendations: ["Record a sale that includes products to rank profitability."],
    };
  }
  const top = ctx.topProducts[0];
  return {
    question,
    facts: ctx.topProducts.slice(0, 3).map((p, i) => `${i + 1}. ${p.name} — ${fmt(p.profit, ctx)} profit, ${fmt(p.revenue, ctx)} revenue, ${p.qty} sold.`),
    calculations: [`${top.name} leads on gross profit after line discounts and allocated cart discounts.`],
    recommendations: [
      ctx.stock.low.some((p) => p.id === top.productId) || ctx.stock.out.some((p) => p.id === top.productId)
        ? `Protect stock of ${top.name} — it is already at or below the minimum.`
        : `Keep ${top.name} in stock; it is the current profit engine.`,
    ],
  };
}

function losingMoney(ctx: BusinessContext, question: string): AdvisorReply {
  const facts = [
    `Net profit ${fmt(ctx.kpis.netProfit, ctx)} (${ctx.kpis.margin.toFixed(1)}% margin).`,
  ];
  const calculations: string[] = [];
  const recs: string[] = [];
  const losers = ctx.topProducts.filter((p) => p.profit < 0);
  if (losers.length) {
    facts.push(`${losers.length} product ${losers.length === 1 ? "line is" : "lines are"} selling below cost this month.`);
    calculations.push(losers.slice(0, 3).map((p) => `${p.name}: ${fmt(p.profit, ctx)}`).join("; "));
    recs.push("Raise price or lower cost on negative-profit products.");
  }
  if (ctx.expenseBreakdown[0]) {
    facts.push(`Largest expense category: ${ctx.expenseBreakdown[0].category} at ${fmt(ctx.expenseBreakdown[0].amount, ctx)}.`);
  }
  if (ctx.marketing && ctx.marketing.spend > ctx.marketing.revenue) {
    calculations.push(`Marketing spend ${fmt(ctx.marketing.spend, ctx)} exceeds attributed revenue ${fmt(ctx.marketing.revenue, ctx)}.`);
    recs.push("Pause or rewrite campaigns with ROAS below 1x.");
  }
  if (ctx.kpis.outstanding > 0) {
    recs.push(`Collect ${fmt(ctx.kpis.outstanding, ctx)} outstanding — it is earned revenue not yet in cash.`);
  }
  if (!recs.length) recs.push("No loss centers are visible beyond ordinary operating expenses.");
  return { question, facts, calculations, recommendations: recs };
}

function customersNeed(ctx: BusinessContext, question: string): AdvisorReply {
  const follow = ctx.followUpCustomers;
  if (!follow.length) {
    return {
      question,
      facts: [`${ctx.customerCount} customers on file. None currently meet the follow-up rules (outstanding balance or 45+ days since purchase).`],
      calculations: [],
      recommendations: ["Follow-up lists stay empty until a customer goes quiet or carries a balance."],
    };
  }
  return {
    question,
    facts: follow.slice(0, 5).map((c) => `${c.customer.name} · ${c.segment.replace("_", " ")} · spend ${fmt(c.spend, ctx)} · outstanding ${fmt(c.outstanding, ctx)}`),
    calculations: ["Follow-up = outstanding balance, or last purchase more than 45 days ago."],
    recommendations: follow.slice(0, 3).map((c) => `Contact ${c.customer.name}.`),
  };
}

function focusToday(ctx: BusinessContext, question: string): AdvisorReply {
  const actions = deriveActions(ctx);
  return {
    question,
    facts: [
      `${ctx.tasks.dueToday.length} tasks due today, ${ctx.tasks.overdue.length} overdue.`,
      `${ctx.stock.out.length} out of stock, ${ctx.stock.low.length} low.`,
      `${ctx.payments.count} pending payments.`,
    ],
    calculations: [],
    recommendations: actions.length ? actions.slice(0, 5).map((a) => a.title) : ["No urgent items — record today's sales as they happen."],
  };
}

function targetOutlook(ctx: BusinessContext, question: string): AdvisorReply {
  if (!ctx.target) {
    return {
      question,
      facts: ["No revenue target is set for the current period."],
      calculations: [],
      recommendations: ["Set a monthly target to unlock pace and projection."],
    };
  }
  const t = ctx.target;
  return {
    question,
    facts: [
      `Target ${fmt(t.target.amount, ctx)} for the current ${t.target.period} period.`,
      `Achieved ${fmt(t.achieved, ctx)} (${Math.round(t.pct)}%).`,
      `${t.daysLeft} days left of ${t.daysTotal}.`,
    ],
    calculations: [
      `Required remaining pace: ${fmt(t.requiredDaily, ctx)} / day (${fmt(t.requiredWeekly, ctx)} / week).`,
      `Current pace ${fmt(t.currentDailyPace, ctx)} / day projects to ${fmt(t.projected, ctx)}.`,
      t.onTrack ? "On track relative to elapsed time." : "Behind the elapsed-time pace.",
    ],
    recommendations: t.onTrack
      ? ["Hold the current sales rate to finish at or above target."]
      : [`Close about ${fmt(t.requiredDaily, ctx)} in sales each remaining day, or lower the target if it is no longer realistic.`],
  };
}

function costDrivers(ctx: BusinessContext, question: string): AdvisorReply {
  if (!ctx.expenseBreakdown.length) {
    return {
      question,
      facts: ["No expenses are recorded this month."],
      calculations: [],
      recommendations: ["Log expenses so cost movement can be explained."],
    };
  }
  const facts = ctx.expenseBreakdown.slice(0, 5).map((e) => `${e.category}: ${fmt(e.amount, ctx)}`);
  const calculations: string[] = [];
  if (ctx.previous && ctx.previous.expenses > 0) {
    calculations.push(`Expenses ${delta(ctx.kpis.expenses, ctx.previous.expenses, ctx)} versus last month.`);
  }
  return {
    question,
    facts,
    calculations,
    recommendations: [`Review ${ctx.expenseBreakdown[0].category} first — it is the largest recorded cost this month.`],
  };
}

function delta(curr: number, prev: number, ctx: BusinessContext): string {
  const d = curr - prev;
  const sign = d > 0 ? "+" : "";
  return `${sign}${fmt(d, ctx)}`;
}
