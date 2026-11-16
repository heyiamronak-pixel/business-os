import * as React from "react";
import { Download } from "lucide-react";
import { AppPage, PageHeader } from "@/components/app-shell";
import { Badge, Button, Card, EmptyState, Stat } from "@/components/ui";
import { financeSnapshot, marketingTotals, productProfits, type DateRange } from "@/lib/engines";
import { money, pct } from "@/lib/format";
import { useAppStore, useBusiness } from "@/lib/store";

type Period = "month" | "quarter" | "year";

function getRange(period: Period, now = new Date()): DateRange {
  let from: Date;
  if (period === "year") from = new Date(now.getFullYear(), 0, 1);
  else if (period === "quarter") from = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
  else from = new Date(now.getFullYear(), now.getMonth(), 1);
  const to = period === "year"
    ? new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999)
    : period === "quarter"
      ? new Date(from.getFullYear(), from.getMonth() + 3, 0, 23, 59, 59, 999)
      : new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  return { from, to, label: period === "year" ? String(now.getFullYear()) : period === "quarter" ? `Q${Math.floor(now.getMonth() / 3) + 1} ${now.getFullYear()}` : now.toLocaleString(undefined, { month: "long", year: "numeric" }) };
}

export function ReportsScreen() {
  const business = useBusiness();
  const db = useAppStore((s) => s.db);
  const [period, setPeriod] = React.useState<Period>("month");
  if (!business) return null;
  const range = getRange(period);
  const sales = db.sales.filter((s) => s.businessId === business.id && new Date(s.createdAt) >= range.from && new Date(s.createdAt) <= range.to);
  const purchases = db.purchases.filter((purchase) => purchase.businessId === business.id && new Date(purchase.createdAt) >= range.from && new Date(purchase.createdAt) <= range.to);
  const purchaseValue = purchases.reduce((sum, purchase) => sum + purchase.total, 0);
  const supplierPaid = purchases.reduce((sum, purchase) => sum + purchase.paidAmount, 0);
  const supplierOutstanding = purchases.reduce((sum, purchase) => sum + purchase.balance, 0);
  const openPurchases = purchases.filter((purchase) => purchase.balance > 0).length;
  const expenses = db.expenses.filter((e) => e.businessId === business.id && new Date(e.date) >= range.from && new Date(e.date) <= range.to);
  const campaigns = db.campaigns.filter((c) => c.businessId === business.id && new Date(c.date) >= range.from && new Date(c.date) <= range.to);
  const finance = financeSnapshot(db, business.id, range);
  const marketing = marketingTotals(campaigns);
  const topProducts = productProfits(sales).slice(0, 5);
  const currency = business.currency;

  function exportCsv() {
    const rows = [
      ["Business Sutra Report", business?.name ?? "Unknown business"],
      ["Period", range.label],
      [],
      ["Metric", "Value"],
      ["Revenue", finance.revenue],
      ["Cash collected", finance.cashIn],
      ["Outstanding", finance.outstanding],
      ["Expenses", finance.expenses],
      ["Gross profit", finance.grossProfit],
      ["Net profit", finance.netProfit],
      ["Profit margin %", finance.margin],
      ["Orders", finance.orderCount],
      ["Average order value", finance.aov],
      ["Marketing spend", marketing.spend],
      ["Marketing leads", marketing.leads],
      ["Marketing revenue", marketing.revenue],
      ["ROAS", marketing.roas ?? "Not available"],
      ["Purchase value", purchaseValue],
      ["Paid to suppliers", supplierPaid],
      ["Supplier payables", supplierOutstanding],
      ["Open purchases", openPurchases],
      [],
      ["Top products", "Units sold", "Revenue", "Profit"],
      ...topProducts.map((p) => [p.name, p.qty, p.revenue, p.profit]),
    ];
    const csv = rows.map((row) => row.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `business-sutra-report-${period}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <AppPage>
      <PageHeader title="Reports & Analytics" subtitle={`Business performance · ${range.label}`} action={<Button size="sm" variant="secondary" onClick={exportCsv}><Download className="mr-1 size-4" />Export CSV</Button>} />
      <div className="mb-4 flex gap-2">
        {(["month", "quarter", "year"] as Period[]).map((p) => (
          <Button key={p} size="sm" variant={period === p ? "default" : "secondary"} onClick={() => setPeriod(p)}>{p === "month" ? "This month" : p === "quarter" ? "This quarter" : "This year"}</Button>
        ))}
      </div>
      {sales.length === 0 && expenses.length === 0 && purchases.length === 0 && campaigns.length === 0 ? (
        <EmptyState title="Reports will appear as you record activity" body="Add sales, expenses and campaign results. This report will calculate performance only from the data saved in this workspace." />
      ) : null}
      <section className="mb-5">
        <h2 className="mb-2 text-sm font-semibold">Financial performance</h2>
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
          <Card><Stat label="Revenue" value={money(finance.revenue, currency)} /></Card>
          <Card><Stat label="Cash collected" value={money(finance.cashIn, currency)} /></Card>
          <Card><Stat label="Outstanding" value={money(finance.outstanding, currency)} /></Card>
          <Card><Stat label="Expenses" value={money(finance.expenses, currency)} /></Card>
          <Card><Stat label="Gross profit" value={money(finance.grossProfit, currency)} /></Card>
          <Card><Stat label="Net profit" value={money(finance.netProfit, currency)} tone={finance.netProfit >= 0 ? "good" : "bad"} /></Card>
          <Card><Stat label="Profit margin" value={pct(finance.margin, 1)} /></Card>
          <Card><Stat label="Average order" value={money(finance.aov, currency)} /></Card>
        </div>
      </section>
      <section className="mb-5">
        <h2 className="mb-2 text-sm font-semibold">Sales overview</h2>
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
          <Card><Stat label="Orders" value={String(finance.orderCount)} /></Card>
          <Card><Stat label="Units sold" value={String(finance.unitsSold)} /></Card>
          <Card><Stat label="Customers" value={String(new Set(sales.map((s) => s.customerId).filter(Boolean)).size)} /></Card>
          <Card><Stat label="Average order value" value={money(finance.aov, currency)} /></Card>
        </div>
      </section>
      <section className="mb-5">
        <div className="mb-2 flex items-center justify-between"><h2 className="text-sm font-semibold">Marketing performance</h2><Badge tone="neutral">{campaigns.length} campaigns</Badge></div>
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-3">
          <Card><Stat label="Ad spend" value={money(marketing.spend, currency)} /></Card>
          <Card><Stat label="Leads" value={String(marketing.leads)} /></Card>
          <Card><Stat label="Customers" value={String(marketing.customers)} /></Card>
          <Card><Stat label="Cost per lead" value={marketing.cpl == null ? "—" : money(marketing.cpl, currency)} /></Card>
          <Card><Stat label="Customer acquisition cost" value={marketing.cac == null ? "—" : money(marketing.cac, currency)} /></Card>
          <Card><Stat label="ROAS" value={marketing.roas == null ? "—" : `${marketing.roas.toFixed(2)}x`} /></Card>
        </div>
      </section>
      <section className="mb-5">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Purchases & supplier balances</h2>
          <Badge tone={supplierOutstanding > 0 ? "warn" : "good"}>{openPurchases} open purchases</Badge>
        </div>
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
          <Card><Stat label="Purchase value" value={money(purchaseValue, currency)} /></Card>
          <Card><Stat label="Paid to suppliers" value={money(supplierPaid, currency)} /></Card>
          <Card><Stat label="Outstanding payables" value={money(supplierOutstanding, currency)} tone={supplierOutstanding > 0 ? "bad" : "good"} /></Card>
          <Card><Stat label="Purchase records" value={String(purchases.length)} /></Card>
        </div>
      </section>
      <section>
        <h2 className="mb-2 text-sm font-semibold">Top products by profit</h2>
        {topProducts.length ? (
          <Card className="space-y-3">
            {topProducts.map((p, index) => (
              <div key={p.productId} className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3"><span className="grid size-7 shrink-0 place-items-center rounded-full bg-muted text-xs font-semibold">{index + 1}</span><div className="min-w-0"><p className="truncate text-sm font-medium">{p.name}</p><p className="text-xs text-muted-foreground">{p.qty} units · Revenue {money(p.revenue, currency)}</p></div></div>
                <p className="shrink-0 text-sm font-semibold tabular">{money(p.profit, currency)}</p>
              </div>
            ))}
          </Card>
        ) : <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">Product profit ranking will appear after sales are recorded.</p>}
      </section>
      <p className="mt-5 text-xs text-muted-foreground">All figures are calculated from records currently saved in this workspace. Unavailable metrics are shown as — rather than estimated.</p>
    </AppPage>
  );
}
