import * as React from "react";
import {
  Bookmark,
  CalendarRange,
  Check,
  Download,
  Filter,
  Search,
  SlidersHorizontal,
  Trash2,
  X,
} from "lucide-react";
import { AppPage, PageHeader } from "@/components/app-shell";
import { PlanFeatureGate } from "@/components/plan-feature-gate";
import { Badge, Button, Card, EmptyState, Input, Select, Stat } from "@/components/ui";
import {
  activeReportFilterCount,
  emptyReportFilters,
  filterReportRecords,
  type ReportFilterRecord,
  type ReportFilters,
  type ReportRecordType,
} from "@/lib/report-filters";
import { financeSnapshot, marketingTotals, productProfits, type DateRange } from "@/lib/engines";
import { money, pct } from "@/lib/format";
import { useAppStore, useBusiness } from "@/lib/store";
import { createId } from "@/lib/utils";
import { businessHasFeature } from "@/lib/subscription";

type Period = "today" | "last7" | "last30" | "month" | "quarter" | "year" | "custom";

interface SavedReportView {
  id: string;
  name: string;
  period: Period;
  customFrom: string;
  customTo: string;
  filters: ReportFilters;
}

const PERIOD_OPTIONS: { value: Period; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "last7", label: "Last 7 days" },
  { value: "last30", label: "Last 30 days" },
  { value: "month", label: "This month" },
  { value: "quarter", label: "This quarter" },
  { value: "year", label: "This year" },
  { value: "custom", label: "Custom range" },
];

const RECORD_TYPES: { value: ReportRecordType; label: string }[] = [
  { value: "sale", label: "Sales" },
  { value: "purchase", label: "Purchases" },
  { value: "expense", label: "Expenses" },
  { value: "campaign", label: "Marketing" },
];

const STATUS_LABELS: Record<string, string> = {
  paid: "Paid",
  partial: "Partially paid",
  unpaid: "Unpaid",
  pending: "Pending",
  recorded: "Recorded",
};

const METHOD_LABELS: Record<string, string> = {
  cash: "Cash",
  card: "Card",
  upi: "UPI",
  bank: "Bank transfer",
  credit: "On credit",
  other: "Other",
};

function dateInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getRange(period: Period, customFrom: string, customTo: string, now = new Date()): DateRange {
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  if (period === "custom") {
    const from = new Date(`${customFrom}T00:00:00`);
    const to = new Date(`${customTo}T23:59:59.999`);
    const label = Number.isFinite(from.getTime()) && Number.isFinite(to.getTime())
      ? `${from.toLocaleDateString()} – ${to.toLocaleDateString()}`
      : "Choose dates";
    return { from, to, label };
  }

  if (period === "today") {
    const to = new Date(today);
    to.setHours(23, 59, 59, 999);
    return { from: today, to, label: "Today" };
  }

  if (period === "last7" || period === "last30") {
    const from = new Date(today);
    from.setDate(from.getDate() - (period === "last7" ? 6 : 29));
    const to = new Date(today);
    to.setHours(23, 59, 59, 999);
    return { from, to, label: period === "last7" ? "Last 7 days" : "Last 30 days" };
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
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);
  const timestamp = dateOnly
    ? (() => {
        const [year, month, day] = value.split("-").map(Number);
        return new Date(year, month - 1, day).getTime();
      })()
    : new Date(value).getTime();
  return Number.isFinite(timestamp) && timestamp >= range.from.getTime() && timestamp <= range.to.getTime();
}

function readSavedViews(businessId: string): SavedReportView[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(`business-sutra.report-views.${businessId}`);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((view): view is SavedReportView =>
      !!view &&
      typeof view === "object" &&
      typeof view.id === "string" &&
      typeof view.name === "string" &&
      PERIOD_OPTIONS.some((option) => option.value === (view as SavedReportView).period) &&
      !!(view as SavedReportView).filters &&
      typeof (view as SavedReportView).filters === "object",
    );
  } catch {
    return [];
  }
}

function writeSavedViews(businessId: string, views: SavedReportView[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(`business-sutra.report-views.${businessId}`, JSON.stringify(views));
  } catch {
    // The current filter session still works if browser storage is full.
  }
}

function FilterChoice({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm transition-colors ${checked
      ? "border-primary/35 bg-primary/[0.07] text-foreground"
      : "border-border bg-card text-muted-foreground hover:border-primary/20 hover:text-foreground"}`}>
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="size-4 shrink-0 accent-[var(--primary)]"
      />
      <span className="min-w-0 truncate">{label}</span>
    </label>
  );
}

function FilterSection({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="min-w-0 rounded-2xl border border-border/80 bg-muted/[0.18] p-3.5">
      <div className="mb-3">
        <h3 className="text-[13px] font-semibold tracking-[-0.01em] text-foreground">{title}</h3>
        <p className="mt-0.5 text-[11px] text-muted-foreground">{description}</p>
      </div>
      {children}
    </section>
  );
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
  const [filters, setFilters] = React.useState<ReportFilters>(() => emptyReportFilters());
  const [productSearch, setProductSearch] = React.useState("");
  const [savedViews, setSavedViews] = React.useState<SavedReportView[]>([]);
  const [selectedSavedViewId, setSelectedSavedViewId] = React.useState("");
  const [saveViewOpen, setSaveViewOpen] = React.useState(false);
  const [saveViewName, setSaveViewName] = React.useState("");

  React.useEffect(() => {
    if (!business?.id) {
      setSavedViews([]);
      return;
    }
    setSavedViews(readSavedViews(business.id));
    setSelectedSavedViewId("");
  }, [business?.id]);

  if (!business) return null;
  const businessId = business.id;
  const businessName = business.name;

  const range = getRange(period, customFrom, customTo);
  const validRange =
    Number.isFinite(range.from.getTime()) &&
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
      details: [sale.note, ...sale.items.map((item) => `${item.name} ${item.sku}`)].filter(Boolean).join(" "),
      productIds: sale.items.map((item) => item.productId),
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
      productIds: [],
    })),
    ...basePurchases.map((purchase) => ({
      id: purchase.id,
      recordType: "purchase" as const,
      amount: purchase.total,
      status: purchase.paymentStatus,
      paymentMethod: "",
      category: "Purchases",
      contact: purchase.supplierName,
      details: [purchase.note, ...purchase.items.map((item) => `${item.name} ${item.sku}`)].filter(Boolean).join(" "),
      productIds: purchase.items.map((item) => item.productId),
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
      productIds: [],
    })),
  ];

  const filteredRecords = filterReportRecords(reportRecords, filters);
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
  const finance = financeSnapshot({ ...db, sales, expenses }, business.id);
  const marketing = marketingTotals(campaigns);
  const topProducts = productProfits(sales).slice(0, 5);
  const currency = business.currency;
  const activeFilterCount = activeReportFilterCount(filters);

  const productOptions = db.products
    .filter((product) => product.businessId === business.id && !product.archived)
    .sort((a, b) => a.name.localeCompare(b.name));
  const visibleProducts = productOptions.filter((product) => {
    const query = productSearch.trim().toLocaleLowerCase();
    return !query || product.name.toLocaleLowerCase().includes(query) || product.sku.toLocaleLowerCase().includes(query);
  });
  const statusOptions = Array.from(new Set(reportRecords.map((record) => record.status))).sort();
  const paymentOptions = Array.from(new Set(reportRecords.map((record) => record.paymentMethod).filter(Boolean))).sort();
  const categoryOptions = Array.from(new Set(reportRecords.map((record) => record.category))).sort();

  function updateFilters(patch: Partial<ReportFilters>) {
    setFilters((current) => ({ ...current, ...patch }));
    setSelectedSavedViewId("");
  }

  function toggleRecordType(value: ReportRecordType) {
    setFilters((current) => ({
      ...current,
      recordTypes: current.recordTypes.includes(value)
        ? current.recordTypes.filter((item) => item !== value)
        : [...current.recordTypes, value],
    }));
    setSelectedSavedViewId("");
  }

  function toggleProduct(value: string) {
    setFilters((current) => ({
      ...current,
      productIds: current.productIds.includes(value)
        ? current.productIds.filter((item) => item !== value)
        : [...current.productIds, value],
    }));
    setSelectedSavedViewId("");
  }

  function toggleStringFilter(field: "statuses" | "paymentMethods" | "categories", value: string) {
    setFilters((current) => ({
      ...current,
      [field]: current[field].includes(value)
        ? current[field].filter((item) => item !== value)
        : [...current[field], value],
    }));
    setSelectedSavedViewId("");
  }

  function changePeriod(value: Period) {
    setPeriod(value);
    setSelectedSavedViewId("");
    if (value === "custom") setFiltersOpen(true);
  }

  function resetFilters() {
    setFilters(emptyReportFilters());
    setPeriod("month");
    const now = new Date();
    setCustomFrom(dateInputValue(new Date(now.getFullYear(), now.getMonth(), 1)));
    setCustomTo(dateInputValue(now));
    setProductSearch("");
    setSelectedSavedViewId("");
  }

  function applySavedView(id: string) {
    setSelectedSavedViewId(id);
    const view = savedViews.find((saved) => saved.id === id);
    if (!view) return;
    setPeriod(view.period);
    setCustomFrom(view.customFrom);
    setCustomTo(view.customTo);
    setFilters({
      ...emptyReportFilters(),
      ...view.filters,
      recordTypes: [...(view.filters.recordTypes ?? [])],
      productIds: [...(view.filters.productIds ?? [])],
      statuses: [...(view.filters.statuses ?? [])],
      paymentMethods: [...(view.filters.paymentMethods ?? [])],
      categories: [...(view.filters.categories ?? [])],
    });
    setFiltersOpen(true);
  }

  function saveCurrentView() {
    if (!businessHasFeature(business, "savedViews")) return;
    const name = saveViewName.trim();
    if (!name) return;
    const view: SavedReportView = {
      id: createId("report-view"),
      name,
      period,
      customFrom,
      customTo,
      filters: {
        ...filters,
        recordTypes: [...filters.recordTypes],
        productIds: [...filters.productIds],
        statuses: [...filters.statuses],
        paymentMethods: [...filters.paymentMethods],
        categories: [...filters.categories],
      },
    };
    const next = [view, ...savedViews.filter((saved) => saved.name.toLocaleLowerCase() !== name.toLocaleLowerCase())];
    setSavedViews(next);
    writeSavedViews(businessId, next);
    setSelectedSavedViewId(view.id);
    setSaveViewName("");
    setSaveViewOpen(false);
  }

  function deleteSelectedView() {
    if (!selectedSavedViewId) return;
    const next = savedViews.filter((view) => view.id !== selectedSavedViewId);
    setSavedViews(next);
    writeSavedViews(businessId, next);
    setSelectedSavedViewId("");
  }

  function exportCsv() {
    const rows = [
      ["Business Sutra Report", businessName],
      ["Period", range.label],
      ["Saved view", savedViews.find((view) => view.id === selectedSavedViewId)?.name ?? ""],
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

  const chips: { id: string; label: string; remove: () => void }[] = [
    ...filters.recordTypes.map((value) => ({
      id: `type:${value}`,
      label: RECORD_TYPES.find((item) => item.value === value)?.label ?? value,
      remove: () => toggleRecordType(value),
    })),
    ...filters.productIds.map((value) => ({
      id: `product:${value}`,
      label: productOptions.find((product) => product.id === value)?.name ?? "Archived product",
      remove: () => toggleProduct(value),
    })),
    ...filters.statuses.map((value) => ({
      id: `status:${value}`,
      label: STATUS_LABELS[value] ?? value,
      remove: () => toggleStringFilter("statuses", value),
    })),
    ...filters.paymentMethods.map((value) => ({
      id: `method:${value}`,
      label: METHOD_LABELS[value] ?? value,
      remove: () => toggleStringFilter("paymentMethods", value),
    })),
    ...filters.categories.map((value) => ({
      id: `category:${value}`,
      label: value,
      remove: () => toggleStringFilter("categories", value),
    })),
    ...(filters.contactQuery.trim() ? [{
      id: "contact",
      label: `Contact: ${filters.contactQuery}`,
      remove: () => updateFilters({ contactQuery: "" }),
    }] : []),
    ...(filters.minAmount.trim() ? [{
      id: "min-amount",
      label: `Min ${money(Number(filters.minAmount), currency)}`,
      remove: () => updateFilters({ minAmount: "" }),
    }] : []),
    ...(filters.maxAmount.trim() ? [{
      id: "max-amount",
      label: `Max ${money(Number(filters.maxAmount), currency)}`,
      remove: () => updateFilters({ maxAmount: "" }),
    }] : []),
  ];

  return (
    <AppPage>
      <PageHeader
        title="Reports & Analytics"
        subtitle={`Business performance · ${range.label}`}
        action={<Button size="sm" variant="secondary" onClick={exportCsv}><Download className="mr-1 size-4" />Export CSV</Button>}
      />

      <Card className="mb-5 space-y-3 border-border/80 bg-card/95 p-4 shadow-[0_8px_28px_rgba(15,35,55,0.045)] sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
              <SlidersHorizontal className="size-[18px]" />
            </span>
            <div className="min-w-0">
              <h2 className="text-sm font-semibold tracking-[-0.02em]">Report filters</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">Choose what you want to see. Results update automatically.</p>
            </div>
          </div>
          <PlanFeatureGate feature="savedViews" compact title="Saved report views are in Growth" description="Upgrade to Growth to save and reuse report filter combinations.">
          <div className="flex flex-wrap items-center gap-2">
            <Select
              aria-label="Saved report views"
              value={selectedSavedViewId}
              onChange={(event) => applySavedView(event.target.value)}
              className="h-9 min-h-9 w-[170px] rounded-xl text-xs"
            >
              <option value="">Saved views</option>
              {savedViews.map((view) => <option key={view.id} value={view.id}>{view.name}</option>)}
            </Select>
            {selectedSavedViewId ? (
              <Button size="icon" variant="ghost" aria-label="Delete saved view" onClick={deleteSelectedView}>
                <Trash2 className="size-4" />
              </Button>
            ) : null}
            <Button size="sm" variant="secondary" onClick={() => setSaveViewOpen((open) => !open)}>
              <Bookmark className="size-4" />Save view
            </Button>
          </div>
          </PlanFeatureGate>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t border-border/70 pt-3">
          <label className="flex h-10 items-center gap-2 rounded-xl border border-border bg-muted/25 px-3">
            <CalendarRange className="size-4 shrink-0 text-muted-foreground" />
            <Select
              aria-label="Report date range"
              value={period}
              onChange={(event) => changePeriod(event.target.value as Period)}
              className="h-8 min-h-8 w-auto min-w-[125px] border-0 bg-transparent px-1 text-xs shadow-none focus:ring-0"
            >
              {PERIOD_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </Select>
          </label>
          <Button size="sm" variant={filtersOpen ? "default" : "secondary"} onClick={() => setFiltersOpen((open) => !open)}>
            <Filter className="size-4" />
            Filters
            {activeFilterCount > 0 ? <span className="ml-1 rounded-full bg-white/20 px-1.5 py-0.5 text-[10px]">{activeFilterCount}</span> : null}
          </Button>
          <div className="ml-auto text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">{filteredRecords.length}</span> of {reportRecords.length} records
          </div>
        </div>

        {period === "custom" ? (
          <div className="grid grid-cols-1 gap-2 rounded-xl bg-muted/25 p-3 sm:grid-cols-[1fr_auto_1fr] sm:items-end">
            <label className="text-xs font-medium text-muted-foreground">
              From
              <Input className="mt-1.5 h-10" type="date" value={customFrom} max={customTo || undefined} onChange={(event) => { setCustomFrom(event.target.value); setSelectedSavedViewId(""); }} />
            </label>
            <span className="hidden pb-3 text-xs text-muted-foreground sm:block">to</span>
            <label className="text-xs font-medium text-muted-foreground">
              To
              <Input className="mt-1.5 h-10" type="date" value={customTo} min={customFrom || undefined} onChange={(event) => { setCustomTo(event.target.value); setSelectedSavedViewId(""); }} />
            </label>
          </div>
        ) : null}

        {saveViewOpen ? (
          <PlanFeatureGate feature="savedViews" compact>
          <div className="flex flex-col gap-2 rounded-xl border border-primary/20 bg-primary/[0.035] p-3 sm:flex-row sm:items-center">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-foreground">Save this filter setup</p>
              <Input
                className="mt-2 h-10 bg-card"
                value={saveViewName}
                onChange={(event) => setSaveViewName(event.target.value)}
                placeholder="e.g. Unpaid sales, Best-selling products"
                maxLength={50}
                onKeyDown={(event) => { if (event.key === "Enter") saveCurrentView(); }}
              />
            </div>
            <div className="flex gap-2 sm:pt-5">
              <Button size="sm" variant="secondary" onClick={() => { setSaveViewOpen(false); setSaveViewName(""); }}>Cancel</Button>
              <Button size="sm" onClick={saveCurrentView} disabled={!saveViewName.trim()}>
                <Check className="size-4" />Save
              </Button>
            </div>
          </div>
          </PlanFeatureGate>
        ) : null}

        {chips.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2 border-t border-border/70 pt-3">
            <span className="mr-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Applied</span>
            {chips.map((chip) => (
              <button
                key={chip.id}
                type="button"
                onClick={chip.remove}
                className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-primary/15 bg-primary/[0.055] py-1 pl-3 pr-2 text-xs font-medium text-foreground transition-colors hover:border-primary/35 hover:bg-primary/10"
              >
                <span className="max-w-[180px] truncate">{chip.label}</span>
                <X className="size-3.5 shrink-0 text-muted-foreground" />
              </button>
            ))}
            <button type="button" className="ml-1 text-xs font-semibold text-muted-foreground underline-offset-4 hover:text-foreground hover:underline" onClick={resetFilters}>
              Clear all
            </button>
          </div>
        ) : null}

        {filtersOpen ? (
          <div className="space-y-4 border-t border-border/70 pt-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-semibold">Filter your report</h3>
                <p className="mt-0.5 text-xs text-muted-foreground">Select one or more options. All selected groups work together.</p>
              </div>
              {activeFilterCount > 0 ? <Button size="sm" variant="ghost" onClick={resetFilters}>Clear filters</Button> : null}
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              <FilterSection title="Transaction type" description="Include only selected activity">
                <div className="flex flex-wrap gap-2">
                  {RECORD_TYPES.map((item) => (
                    <FilterChoice key={item.value} label={item.label} checked={filters.recordTypes.includes(item.value)} onChange={() => toggleRecordType(item.value)} />
                  ))}
                </div>
              </FilterSection>

              <FilterSection title="Products" description="Show sales or purchases containing these products">
                <div className="relative mb-2">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input className="h-9 pl-9 text-xs" value={productSearch} onChange={(event) => setProductSearch(event.target.value)} placeholder="Search products or SKU" />
                </div>
                <div className="max-h-44 space-y-1 overflow-y-auto pr-1">
                  {visibleProducts.length ? visibleProducts.map((product) => (
                    <FilterChoice
                      key={product.id}
                      label={product.name}
                      checked={filters.productIds.includes(product.id)}
                      onChange={() => toggleProduct(product.id)}
                    />
                  )) : <p className="rounded-lg border border-dashed border-border px-3 py-4 text-center text-xs text-muted-foreground">No matching products found</p>}
                </div>
                {filters.productIds.length > 0 ? <p className="mt-2 text-[11px] text-muted-foreground">{filters.productIds.length} product{filters.productIds.length === 1 ? "" : "s"} selected</p> : null}
              </FilterSection>

              <FilterSection title="Payment status" description="Narrow results by collection status">
                <div className="flex flex-wrap gap-2">
                  {statusOptions.map((value) => (
                    <FilterChoice key={value} label={STATUS_LABELS[value] ?? value} checked={filters.statuses.includes(value)} onChange={() => toggleStringFilter("statuses", value)} />
                  ))}
                  {statusOptions.length === 0 ? <p className="text-xs text-muted-foreground">No payment records in this date range</p> : null}
                </div>
              </FilterSection>

              <FilterSection title="Payment method" description="Choose how payments were made">
                <div className="flex flex-wrap gap-2">
                  {paymentOptions.map((value) => (
                    <FilterChoice key={value} label={METHOD_LABELS[value] ?? value} checked={filters.paymentMethods.includes(value)} onChange={() => toggleStringFilter("paymentMethods", value)} />
                  ))}
                  {paymentOptions.length === 0 ? <p className="text-xs text-muted-foreground">No payment methods in this date range</p> : null}
                </div>
              </FilterSection>

              <FilterSection title="Category & channel" description="Filter expenses, purchases and campaigns">
                <div className="max-h-44 space-y-1 overflow-y-auto pr-1">
                  {categoryOptions.map((value) => (
                    <FilterChoice key={value} label={value} checked={filters.categories.includes(value)} onChange={() => toggleStringFilter("categories", value)} />
                  ))}
                  {categoryOptions.length === 0 ? <p className="text-xs text-muted-foreground">No categories in this date range</p> : null}
                </div>
              </FilterSection>

              <FilterSection title="Customer or supplier" description="Find activity linked to a contact">
                <Input
                  className="h-10"
                  value={filters.contactQuery}
                  onChange={(event) => updateFilters({ contactQuery: event.target.value })}
                  placeholder="Search customer or supplier name"
                />
              </FilterSection>

              <FilterSection title="Amount range" description="Set a minimum, maximum or both">
                <div className="grid grid-cols-2 gap-2">
                  <label className="text-xs font-medium text-muted-foreground">
                    Minimum
                    <Input className="mt-1.5 h-10" type="number" min="0" step="0.01" value={filters.minAmount} onChange={(event) => updateFilters({ minAmount: event.target.value })} placeholder="0.00" />
                  </label>
                  <label className="text-xs font-medium text-muted-foreground">
                    Maximum
                    <Input className="mt-1.5 h-10" type="number" min="0" step="0.01" value={filters.maxAmount} onChange={(event) => updateFilters({ maxAmount: event.target.value })} placeholder="Any" />
                  </label>
                </div>
              </FilterSection>
            </div>
          </div>
        ) : null}

        {!validRange ? <p className="text-xs font-medium text-danger">Please choose a valid date range. The start date must be before the end date.</p> : null}
      </Card>

      {sales.length === 0 && expenses.length === 0 && purchases.length === 0 && campaigns.length === 0 ? (
        <div className="mb-5">
          <EmptyState
            title={validRange ? "No records match these filters" : "Choose a valid date range"}
            body={validRange ? "Try removing a filter or expanding the date range. Reports only include records saved in this workspace." : "Set a start date that is on or before the end date to view report data."}
          />
        </div>
      ) : null}

      <section className="mb-5">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Financial performance</h2>
          <Badge tone="neutral">{sales.length} sales · {expenses.length} expenses</Badge>
        </div>
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

      <PlanFeatureGate feature="advancedReports" title="Advanced reports are included in Growth" description="Starter keeps standard financial, sales and purchase summaries. Upgrade to Growth to unlock detailed marketing performance and product profitability reports.">
      <section className="mb-5">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Marketing performance</h2>
          <Badge tone="neutral">{campaigns.length} campaigns</Badge>
        </div>
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
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{product.name}</p>
                    <p className="text-xs text-muted-foreground">{product.qty} units · Revenue {money(product.revenue, currency)}</p>
                  </div>
                </div>
                <p className="shrink-0 text-sm font-semibold tabular">{money(product.profit, currency)}</p>
              </div>
            ))}
          </Card>
        ) : <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">Product profit ranking will appear after matching sales are recorded.</p>}
      </section>
      </PlanFeatureGate>

      <p className="mt-5 text-xs text-muted-foreground">All figures use the selected date range and applied report filters. Saved views are stored in this browser for this workspace.</p>
    </AppPage>
  );
}
