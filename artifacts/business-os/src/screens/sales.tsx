import * as React from "react";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { AppPage, ConfirmBar, PageHeader, SearchField } from "@/components/app-shell";
import { BottomSheet } from "@/components/sheet";
import { Badge, Button, Card, EmptyState, Input, Segmented, Stat } from "@/components/ui";
import type { Sale } from "@/lib/domain";
import { formatDateTime, money } from "@/lib/format";
import { deleteSale, recordPayment } from "@/lib/services";
import { useAppStore, useBusiness } from "@/lib/store";

type DateFilter = "all" | "today" | "7d" | "month";
type PaymentFilter = "all" | "due" | "paid";

export function SalesScreen() {
  const business = useBusiness();
  const db = useAppStore((state) => state.db);
  const apply = useAppStore((state) => state.apply);
  const [query, setQuery] = React.useState("");
  const [dateFilter, setDateFilter] = React.useState<DateFilter>("month");
  const [paymentFilter, setPaymentFilter] = React.useState<PaymentFilter>("all");
  const [sale, setSale] = React.useState<Sale | null>(null);
  const [payment, setPayment] = React.useState("");
  const [confirm, setConfirm] = React.useState(false);

  if (!business) return null;
  const currency = business.currency;
  const allSales = db.sales.filter((record) => record.businessId === business.id);
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const weekStart = new Date(todayStart);
  weekStart.setDate(weekStart.getDate() - 6);

  const safeQuery = query.trim().toLowerCase();
  const sales = allSales
    .filter((record) => {
      const created = new Date(record.createdAt).getTime();
      if (dateFilter === "today" && created < todayStart.getTime()) return false;
      if (dateFilter === "7d" && created < weekStart.getTime()) return false;
      if (dateFilter === "month" && created < monthStart.getTime()) return false;
      if (paymentFilter === "due" && record.outstanding <= 0) return false;
      if (paymentFilter === "paid" && record.outstanding > 0) return false;
      if (!safeQuery) return true;
      return [
        record.customerName,
        record.id,
        ...record.items.flatMap((item) => [item.name, item.sku]),
      ].some((value) => value?.toLowerCase().includes(safeQuery));
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const booked = sales.reduce((sum, record) => sum + record.total, 0);
  const collected = sales.reduce((sum, record) => sum + record.paidAmount, 0);
  const due = sales.reduce((sum, record) => sum + record.outstanding, 0);

  function exportCsv() {
    const rows = [
      ["Sale ID", "Date", "Customer", "Items", "Booked total", "Paid", "Outstanding", "Payment status", "Payment method"],
      ...sales.map((record) => [
        record.id,
        record.createdAt,
        record.customerName ?? "Walk-in",
        record.items.map((item) => `${item.name} x ${item.qty}`).join("; "),
        String(record.total),
        String(record.paidAmount),
        String(record.outstanding),
        record.paymentStatus,
        record.paymentMethod,
      ]),
    ];
    const csv = rows.map((row) => row.map((value) => `"${String(value ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "business-sutra-sales.csv";
    anchor.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${sales.length} sales`);
  }

  function collectPayment() {
    if (!sale) return;
    try {
      const updated = recordPayment(useAppStore.getState().db, sale.id, Number(payment));
      apply(updated);
      toast.success("Payment recorded");
      setPayment("");
      setSale(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not record payment");
    }
  }

  return (
    <AppPage>
      <PageHeader
        title="Sales"
        subtitle={`${allSales.length} completed checkouts`}
        action={<Button size="sm" variant="secondary" onClick={exportCsv} disabled={!sales.length}><Download className="size-4" />Export</Button>}
      />
      <div className="mb-4 grid grid-cols-2 gap-2">
        <Card><Stat label="Sales in view" value={String(sales.length)} /></Card>
        <Card><Stat label="Booked revenue" value={money(booked, currency)} /></Card>
        <Card><Stat label="Cash collected" value={money(collected, currency)} tone="good" /></Card>
        <Card><Stat label="Outstanding" value={money(due, currency)} tone={due > 0 ? "bad" : "good"} /></Card>
      </div>

      <SearchField value={query} onChange={setQuery} placeholder="Search customer, sale ID, product or SKU" />
      <p className="mb-2 mt-3 text-[11px] font-semibold uppercase tracking-wide text-subtle">Date range</p>
      <div className="mb-3">
        <Segmented
          value={dateFilter}
          onChange={(value) => setDateFilter(value as DateFilter)}
          options={[
            { id: "today", label: "Today" },
            { id: "7d", label: "7 days" },
            { id: "month", label: "This month" },
            { id: "all", label: "All time" },
          ]}
        />
      </div>
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-subtle">Payment status</p>
      <div className="mb-3">
        <Segmented
          value={paymentFilter}
          onChange={(value) => setPaymentFilter(value as PaymentFilter)}
          options={[
            { id: "all", label: "All" },
            { id: "due", label: "Outstanding" },
            { id: "paid", label: "Settled" },
          ]}
        />
      </div>

      {allSales.length === 0 ? (
        <EmptyState
          title="No sales recorded yet"
          body="Use Sell to check out. Inventory, revenue and customer history update together."
        />
      ) : sales.length === 0 ? (
        <EmptyState title="No matching sales" body="Change the date or payment filters, or clear your search." />
      ) : (
        <ul className="space-y-2">
          {sales.map((record) => (
            <li key={record.id}>
              <button
                type="button"
                className="flex w-full items-center justify-between gap-3 rounded-[var(--radius-xl)] border border-border bg-card p-3 text-left"
                onClick={() => { setSale(record); setPayment(""); }}
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{record.customerName ?? "Walk-in"}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatDateTime(record.createdAt)} · {record.items.length} items · {record.id.slice(-7).toUpperCase()}
                  </p>
                  <div className="mt-2">
                    <Badge tone={record.paymentStatus === "paid" ? "good" : record.paymentStatus === "partial" ? "warn" : "bad"}>
                      {record.paymentStatus}
                    </Badge>
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <p className="tabular text-sm font-semibold">{money(record.total, currency)}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {record.outstanding > 0 ? `${money(record.outstanding, currency)} due` : "Settled"}
                  </p>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}

      <BottomSheet
        open={!!sale}
        onOpenChange={(open) => !open && setSale(null)}
        title={sale ? money(sale.total, currency) : "Sale"}
        description={sale ? `${sale.customerName ?? "Walk-in"} · ${sale.paymentMethod} · ${formatDateTime(sale.createdAt)}` : undefined}
        footer={
          sale ? (
            <div className="space-y-2">
              {sale.outstanding > 0 ? (
                <>
                  <Input
                    type="number"
                    min="0.01"
                    max={sale.outstanding}
                    step="0.01"
                    inputMode="decimal"
                    value={payment}
                    onChange={(event) => setPayment(event.target.value)}
                    placeholder={`Collect up to ${money(sale.outstanding, currency)}`}
                  />
                  <Button className="w-full" onClick={collectPayment} disabled={!payment.trim()}>Record payment</Button>
                </>
              ) : null}
              <Button variant="ghost" className="w-full text-danger" onClick={() => setConfirm(true)}>
                Reverse sale
              </Button>
            </div>
          ) : null
        }
      >
        {sale ? (
          <div className="space-y-3">
            <ul className="space-y-2">
              {sale.items.map((item, index) => (
                <li key={`${item.productId}-${index}`} className="flex justify-between gap-3 text-sm">
                  <span>{item.name} × {item.qty}</span>
                  <span className="tabular">{money(item.unitPrice * item.qty - item.discount, currency)}</span>
                </li>
              ))}
            </ul>
            <div className="space-y-2 border-t border-border pt-3 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span className="tabular">{money(sale.subtotal, currency)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Discount</span><span className="tabular">{money(sale.discount, currency)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Gross profit</span><span className="tabular">{money(sale.grossProfit, currency)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Paid</span><span className="tabular">{money(sale.paidAmount, currency)}</span></div>
              <div className="flex justify-between font-semibold"><span>Outstanding</span><span className="tabular">{money(sale.outstanding, currency)}</span></div>
            </div>
            {sale.note ? <p className="text-sm text-muted-foreground">{sale.note}</p> : null}
          </div>
        ) : null}
      </BottomSheet>

      <BottomSheet
        open={confirm}
        onOpenChange={setConfirm}
        title="Reverse this sale?"
        description="Stock will be returned to inventory."
        footer={
          <ConfirmBar
            danger
            confirmLabel="Reverse"
            onCancel={() => setConfirm(false)}
            onConfirm={() => {
              if (!sale) return;
              apply(deleteSale(useAppStore.getState().db, sale.id));
              toast.success("Sale reversed");
              setConfirm(false);
              setSale(null);
            }}
          />
        }
      >
        <p className="text-sm text-muted-foreground">Use this only when the checkout was a mistake.</p>
      </BottomSheet>
    </AppPage>
  );
}
