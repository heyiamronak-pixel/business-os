import * as React from "react";
import { Download, Filter, Plus, RotateCcw, Trash2 } from "lucide-react";
import { AppPage, PageHeader } from "@/components/app-shell";
import { Badge, Button, Card, EmptyState, Input, Select, Segmented, Stat } from "@/components/ui";
import {
  filterReportRecords,
  type ReportFilterField,
  type ReportFilterLogic,
  type ReportFilterRecord,
  type ReportFilterRule,
} from "@/lib/report-filters";
import { financeSnapshot, marketingTotals, productProfits, type DateRange } from "@/lib/engines";
import { money, pct } from "@/lib/format";
import { useAppStore, useBusiness } from "@/lib/store";

type Period = "month" | "quarter" | "year" | "custom";

function dateInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getRange(period: Period, customFrom: string, customTo: string, now = new Date()): DateRange {
  if (period === "custom") {
    const from = new Date(`${customFrom}T00:00:00`);
    const to = new Date(`${customTo}T23:59:59.999`);
    const label = Number.isFinite(from.getTime()) && Number.isFinite(to.getTime())
      ? `${from.toLocaleDateString()} – ${to.toLocaleDateString()}`
      : "Custom date range";
    return { from, to, label };
  }

  let from: Date;
  if (period === "year") from = new Date(now.getFullYear(), 0, 1);
  else if (period === "quarter") from = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
  else from = new Date(now.getFullYear(), now.getMonth(), 1);

  const to = period === "year"
    ? new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999)
    : period === "quarter"
      ? new Date(from.getFullYear(), from.getMonth() + 3, 0, 23, 59, 59, 999)
      : new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  const label = period === "year"
    ? String(now.getFullYear())
    : period === "quarter"
      ? `Q${Math.floor(now.getMonth() / 3) + 1} ${now.getFullYear()}`
      : now.toLocaleString(undefined, { month: "long", year: "numeric" });
  return { from, to, label };
}

function dateIsInRange(value: string, range: DateRange): boolean {
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) && timestamp >= range.from.getTime() && timestamp <= range.to.getTime();
}

const FIELD_LABELS: Record<ReportFilterField, string> = {
  recordType: "Record type",
  amount: "Amount / spend",
  status: "Payment status",
  paymentMethod: "Payment method",
  category: "Category / channel",
  contact: "Customer / supplier / name",
  details: "Item / notes",
};

function operatorOptions(field: ReportFilterField) {
  return field === "amount"
    ? [{ value: "equals", label: "Is equal to" }, { value: "greater_than", label: "Is greater than" }, { value: "less_than", label: "Is less than" }]
    : [{ value: "equals", label: "Is" }, { value: "contains", label: "Contains" }];
}

export function ReportsScreen() {
  const business = useBusiness();
  const db = useAppStore((s) => s.db);
  const [period, setPeriod] = React.useState<Period>("month");
  const [customFrom, setCustomFrom] = React.useState(() => {
    const now = new Date();
    return dateInputValue(new Date(now.getFullYear(), now.getMonth(), 1));
  });
  const [customTo, setCustomTo] = React.useState(() => dateInputValue(new Date()));
  const [filtersOpen, setFiltersOpen] = React.useState(false);
  const [rules, setRules] = React.useState<ReportFilterRule[]>([]);
  const [logic, setLogic] = React.useState<ReportFilterLogic>("all");
  const nextRuleId = React.useRef(1);

  if (!business) return null;

  const range = getRange(period, customFrom, customTo);
  const validRange = Number.isFinite(range.from.getTime()) &&
    Number.isFinite(range.to.getTime()) &&
    range.from.getTime() <= range.to.getTime();

  const baseSales = validRange
    ? db.sales.filter((sale) => sale.businessId === business.id && dateIsInRange(sale.createdAt, range))
    : [];
  const baseExpenses = validRange
    ? db.expenses.filter((expense) => expense.businessId === business.id && dateIsInRange(expense.date, range))
    : [];
  const basePurchases = validRange
    ? db.purchases.filter((purchase) => purchase.businessId === business.id && dateIsInRange(purchase.createdAt, range))
    : [];
  const baseCampaigns = validRange
    ? db.campaigns.filter((campaign) => campaign.businessId === business.id && dateIsInRange(campaign.date, range))
    : [];

  const reportRecords: ReportFilterRecord[] = [
    ...baseSales.map((sale) => ({
      id: sale.id,
      recordType: "sale" as const,
      amount: sale.total,
      status: sale.paymentStatus,
      paymentMethod: sale.paymentMethod,
      category: "Sales",
      contact: sale.customerName || "Walk-in customer",
      details: [sale.note, ...sale.items.map((item) => item.name)].filter(Boolean).join(" "),
    })),
    ...baseExpenses.map((expense) => ({
      id: expense.id,
      recordType: "expense" as const,
      amount: expense.amount,
      status: "recorded",
      paymentMethod: "",
      category: expense.category,
      contact: expense.vendor || "",
      details: expense.notes || "",
    })),
    ...basePurchases.map((purchase) => ({
      id: purchase.id,
      recordType: "purchase" as const,
      amount: purchase.total,
      status: purchase.paymentStatus,
      paymentMethod: "",
      category: "Purchases",
      contact: purchase.supplierName,
      details: [purchase.note, ...purchase.items.map((item) => item.name)].filter(Boolean).join(" "),
    })),
    ...baseCampaigns.map((campaign) => ({
      id: campaign.id,
      recordType: "campaign" as const,
      amount: campaign.adSpend,
      status: "recorded",
      paymentMethod: "",
      category: campaign.channel,
      contact: campaign.name,
      details: campaign.name,
    })),
  ];

  const filteredRecords = filterReportRecords(reportRecords, rules, logic);
  const saleIds = new Set(filteredRecords.filter((record) => record.recordType === "sale").map((record) => record.id));
  const expenseIds = new Set(filteredRecords.filter((record) => record.recordType === "expense").map((record) => record.id));
  const purchaseIds = new Set(filteredRecords.filter((record) => record.recordType === "purchase").map((record) => record.id));
  const campaignIds = new Set(filteredRecords.filter((record) => record.recordType === "campaign").map((record) => record.id));

  const sales = baseSales.filter((sale) => saleIds.has(sale.id));
  const expenses = baseExpenses.filter((expense) => expenseIds.has(expense.id));
  const purchases = basePurchases.filter((purchase) => purchaseIds.has(purchase.id));
  const campaigns = baseCampaigns.filter((campaign) => campaignIds.has(campaign.id));

  const purchaseValue = purchases.reduce((sum, purchase) => sum + purchase.total, 0);
  const supplierPaid = purchases.reduce((sum, purchase) => sum + purchase.paidAmount, 0);
  const supplierOutstanding = purchases.reduce((sum, purchase) => sum + purchase.balance, 0);
  const openPurchases = purchases.filter((purchase) => purchase.balance > 0).length;
  const finance = financeSnapshot({ ...db, sales, expenses }, business.id, range);
  const marketing = marketingTotals(campaigns);
  const topProducts = productProfits(sales).slice(0, 5);
  const currency = business.currency;
  const activeRuleCount = rules.filter((rule) => rule.value.trim().length > 0).length;

  function addRule() {
    setRules((current) => [
      ...current,
      { id: `report-filter-${nextRuleId.current++}`, field: "recordType", operator: "equals", value: "sale" },
    ]);
  }

  function updateRule(id: string, patch: Partial<ReportFilterRule>) {
    setRules((current) => current.map((rule) => rule.id === id ? { ...rule, ...patch } : rule));
  }

  function removeRule(id: string) {
    setRules((current) => current.filter((rule) => rule.id !== id));
  }

  function resetFilters() {
    setRules([]);
    setLogic("all");
    setPeriod("month");
    const now = new Date();
    setCustomFrom(dateInputValue(new Date(now.getFullYear(), now.getMonth(), 1)));
    setCustomTo(dateInputValue(now));
  }

  function exportCsv() {
    const rows = [
      ["Business Sutra Report", business.name],
      ["Period", range.label],
      ["Custom filter logic", logic === "all" ? "Match all rules (AND)" : "Match any rule (OR)"],
      ["Active custom rules", activeRuleCount],
      ["Matching records", filteredRecords.length],
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
      ...topProducts.map((product) => [product.name, product.qty, product.revenue, product.profit]),
    ];
    const csv = rows.map((row) => row.map((value) => `"${String(value ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `business-sutra-report-${period}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <AppPage>
      <PageHeader
        title="Reports & Analytics"
        subtitle={`Business performance · ${range.label}`}
        action={<Button size="sm" variant="secondary" onClick={exportCsv}><Download className="mr-1 size-4" />Export CSV</Button>}
      />

      <div className="mb-3 flex flex-wrap items-center gap-2">
        {([
          ["month", "This month"],
          ["quarter", "This quarter"],
          ["year", "This year"],
          ["custom", "Custom dates"],
        ] as [Period, string][]).map(([value, label]) => (
          <Button key={value} size="sm" variant={period === value ? "default" : "secondary"} onClick={() => { setPeriod(value); if (value === "custom") setFiltersOpen(true); }}>{label}</Button>
        ))}
        <Button size="sm" variant={filtersOpen ? "default" : "secondary"} onClick={() => setFiltersOpen((open) => !open)}>
          <Filter className="size-4" />
          Custom filters
          {activeRuleCount > 0 ? <span className="ml-1 rounded-full bg-white/20 px-1.5 text-[10px]">{activeRuleCount}</span> : null}
        </Button>
      </div>

      {filtersOpen ? (
        <Card className="mb-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold">Build your report</h2>
              <p className="mt-1 text-xs text-muted-foreground">Combine date range and conditions. Every report metric and CSV export follows these filters.</p>
            </div>
            <Button size="sm" variant="secondary" onClick={addRule}><Plus className="size-4" />Add condition</Button>
          </div>

          {period === "custom" ? (
            <div className="grid grid-cols-1 gap-3 rounded-xl bg-muted/40 p-3 sm:grid-cols-2">
              <label className="text-xs font-medium text-muted-foreground">From date
                <Input className="mt-1.5" type="date" value={customFrom} max={customTo || undefined} onChange={(event) => setCustomFrom(event.target.value)} />
              </label>
              <label className="text-xs font-medium text-muted-foreground">To date
                <Input className="mt-1.5" type="date" value={customTo} min={customFrom || undefined} onChange={(event) => setCustomTo(event.target.value)} />
              </label>
            </div>
          ) : (
            <p className="rounded-xl bg-muted/40 px-3 py-2 text-xs text-muted-foreground">Date range: <span className="font-semibold text-foreground">{range.label}</span>. Choose Custom dates above to set an exact start and end date.</p>
          )}

          {!validRange ? <p className="text-xs font-medium text-danger">Please select a valid date range. The start date must be before the end date.</p> : null}

          {rules.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border px-4 py-5 text-center">
              <p className="text-sm font-medium">No custom conditions added</p>
              <p className="mt-1 text-xs text-muted-foreground">Add a condition to filter by record type, amount, payment status, payment method, category, contact, or item details.</p>
              <Button className="mt-3" size="sm" variant="secondary" onClick={addRule}><Plus className="size-4" />Add your first condition</Button>
            </div>
          ) : (
            <div className="space-y-2">
              {rules.map((rule, index) => (
                <div key={rule.id} className="grid grid-cols-1 items-end gap-2 rounded-xl border border-border/80 bg-card p-3 sm:grid-cols-[1fr_1fr_1.25fr_auto]">
                  <label className="text-xs font-medium text-muted-foreground">Field
                    <Select
                      className="mt-1.5"
                      value={rule.field}
                      onChange={(event) => updateRule(rule.id, {
                        field: event.target.value as ReportFilterField,
                        operator: "equals",
                        value: event.target.value === "recordType" ? "sale" : "",
                      })}
                    >
                      {Object.entries(FIELD_LABELS).map(([field, label]) => <option key={field} value={field}>{label}</option>)}
                    </Select>
                  </label>
                  <label className="text-xs font-medium text-muted-foreground">Condition
                    <Select className="mt-1.5" value={rule.operator} onChange={(event) => updateRule(rule.id, { operator: event.target.value as ReportFilterRule["operator"] })}>
                      {operatorOptions(rule.field).map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                    </Select>
                  </label>
                  <label className="text-xs font-medium text-muted-foreground">Value
                    {rule.field === "recordType" ? (
                      <Select className="mt-1.5" value={rule.value} onChange={(event) => updateRule(rule.id, { value: event.target.value })}>
                        <option value="sale">Sale</option><option value="expense">Expense</option><option value="purchase">Purchase</option><option value="campaign">Marketing campaign</option>
                      </Select>
                    ) : rule.field === "status" ? (
                      <Select className="mt-1.5" value={rule.value} onChange={(event) => updateRule(rule.id, { value: event.target.value })}>
                        <option value="">Any status</option><option value="paid">Paid</option><option value="partial">Partially paid</option><option value="unpaid">Unpaid</option><option value="pending">Pending</option><option value="recorded">Recorded</option>
                      </Select>
                    ) : rule.field === "paymentMethod" ? (
                      <Select className="mt-1.5" value={rule.value} onChange={(event) => updateRule(rule.id, { value: event.target.value })}>
                        <option value="">Any method</option><option value="cash">Cash</option><option value="card">Card</option><option value="upi">UPI</option><option value="bank">Bank transfer</option><option value="credit">On credit</option><option value="other">Other</option>
                      </Select>
                    ) : (
                      <Input
                        className="mt-1.5"
                        type={rule.field === "amount" ? "number" : "text"}
                        min={rule.field === "amount" ? 0 : undefined}
                        step={rule.field === "amount" ? "0.01" : undefined}
                        value={rule.value}
                        placeholder={rule.field === "amount" ? "Enter amount" : "Type to match"}
                        onChange={(event) => updateRule(rule.id, { value: event.target.value })}
                      />
                    )}
                  </label>
                  <Button className="w-full sm:w-10" size="icon" variant="ghost" aria-label={`Remove condition ${index + 1}`} onClick={() => removeRule(rule.id)}><Trash2 className="size-4" /></Button>
                </div>
              ))}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-medium text-muted-foreground">Match</span>
                <Segmented
                  value={logic}
                  onChange={setLogic}
                  options={[{ id: "all", label: "All conditions (AND)" }, { id: "any", label: "Any condition (OR)" }]}
                />
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
            <p className="text-xs text-muted-foreground">
              Showing <span className="font-semibold text-foreground">{filteredRecords.length}</span> of {reportRecords.length} matching records
              {activeRuleCount > 0 ? ` · ${activeRuleCount} active condition${activeRuleCount === 1 ? "" : "s"}` : ""}
            </p>
            <Button size="sm" variant="ghost" onClick={resetFilters}><RotateCcw className="size-3.5" />Reset filters</Button>
          </div>
        </Card>
      ) : null}

      {sales.length === 0 && expenses.length === 0 && purchases.length === 0 && campaigns.length === 0 ? (
        <EmptyState
          title={validRange ? "No records match this report" : "Choose a valid date range"}
          body={validRange ? "Try a wider date range or remove some custom conditions. The report only uses records saved in this workspace." : "Set a start date that is on or before your end date to view report data."}
        />
      ) : null}

      <section className="mb-5">
        <div className="mb-2 flex items-center justify-between"><h2 className="text-sm font-semibold">Financial performance</h2><Badge tone="neutral">{sales.length} sales · {expenses.length} expenses</Badge></div>
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
          <Card><Stat label="Customers" value={String(new Set(sales.map((sale) => sale.customerId).filter(Boolean)).size)} /></Card>
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
            {topProducts.map((product, index) => (
              <div key={product.productId} className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="grid size-7 shrink-0 place-items-center rounded-full bg-muted text-xs font-semibold">{index + 1}</span>
                  <div className="min-w-0"><p className="truncate text-sm font-medium">{product.name}</p><p className="text-xs text-muted-foreground">{product.qty} units · Revenue {money(product.revenue, currency)}</p></div>
                </div>
                <p className="shrink-0 text-sm font-semibold tabular">{money(product.profit, currency)}</p>
              </div>
            ))}
          </Card>
        ) : <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">Product profit ranking will appear after matching sales are recorded.</p>}
      </section>

      <p className="mt-5 text-xs text-muted-foreground">All figures use records in the selected date range and custom filters. Unavailable metrics are shown as — rather than estimated.</p>
    </AppPage>
  );
}
