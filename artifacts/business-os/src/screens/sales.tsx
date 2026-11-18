import * as React from "react";
import { Download, Printer } from "lucide-react";
import { toast } from "sonner";
import { AppPage, ConfirmBar, PageHeader, SearchField } from "@/components/app-shell";
import { SavedViewControls } from "@/components/saved-view-controls";
import { BottomSheet } from "@/components/sheet";
import { Badge, Button, Card, EmptyState, Field, Input, Select, Segmented, Stat } from "@/components/ui";
import type { RecordedPaymentMethod, Sale } from "@/lib/domain";
import { formatDateTime, money } from "@/lib/format";
import { recordPayment, recordSaleReturn, reverseSale } from "@/lib/services";
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
  const [paymentMethod, setPaymentMethod] = React.useState<RecordedPaymentMethod>("upi");
  const [paymentReference, setPaymentReference] = React.useState("");
  const [confirm, setConfirm] = React.useState(false);
  const [reverseReason, setReverseReason] = React.useState("");
  const [refundMethod, setRefundMethod] = React.useState<RecordedPaymentMethod | "">("");
  const [refundReference, setRefundReference] = React.useState("");
  const [returnSale, setReturnSale] = React.useState<Sale | null>(null);
  const [returnQuantities, setReturnQuantities] = React.useState<Record<string, string>>({});
  const [returnReason, setReturnReason] = React.useState("");
  const [returnMethod, setReturnMethod] = React.useState<RecordedPaymentMethod | "">("");
  const [returnReference, setReturnReference] = React.useState("");

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
      if (record.status === "reversed" && paymentFilter !== "all") return false;
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

  const activeSalesInView = sales.filter((record) => record.status !== "reversed");
  const booked = activeSalesInView.reduce((sum, record) => sum + record.total, 0);
  const collected = activeSalesInView.reduce((sum, record) => sum + record.paidAmount, 0);
  const due = activeSalesInView.reduce((sum, record) => sum + record.outstanding, 0);

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
      const updated = recordPayment(useAppStore.getState().db, sale.id, Number(payment), paymentMethod, paymentReference);
      apply(updated);
      setSale(updated.sales.find((item) => item.id === sale.id) ?? null);
      toast.success("Payment recorded");
      setPayment("");
      setPaymentReference("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not record payment");
    }
  }

  function printReceipt(record: Sale) {
    if (!business) return;
    const printWindow = window.open("", "_blank", "width=420,height=720");
    if (!printWindow) {
      toast.error("Allow pop-ups to print the receipt.");
      return;
    }
    const htmlEscapeMap: Record<string, string> = {
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    };
    const escapeHtml = (value: unknown) => String(value ?? "").replace(/[&<>"']/g, (character) => htmlEscapeMap[character] ?? character);
    const businessName = escapeHtml(business.name);
    const address = escapeHtml([business.address, business.location, business.state, business.postalCode].filter(Boolean).join(", "));
    const payments = (record.payments ?? []).map((entry) =>
      "<p>" + escapeHtml(money(entry.amount, currency)) + " · " + escapeHtml(entry.method.toUpperCase()) +
      (entry.reference ? " · " + escapeHtml(entry.reference) : "") + "</p>"
    ).join("");
    const returned = (db.returns ?? []).filter((entry) => entry.saleId === record.id).map((entry) =>
      "<p>" + escapeHtml(entry.items.map((item) => item.name + " × " + item.quantity).join(", ")) +
      " — " + escapeHtml(money(entry.amount, currency)) + "</p>"
    ).join("");
    const itemRows = record.items.map((item) =>
      "<tr><td>" + escapeHtml(item.name) + "<small>" + escapeHtml(item.sku) + "</small></td>" +
      "<td>" + escapeHtml(item.qty) + "</td><td>" + escapeHtml(money(item.unitPrice, currency)) + "</td>" +
      "<td>" + escapeHtml(money(item.unitPrice * item.qty - item.discount, currency)) + "</td></tr>"
    ).join("");
    const documentHtml = `<!doctype html><html><head><meta charset="utf-8"><title>Receipt ${escapeHtml(record.id.slice(-7).toUpperCase())}</title>
      <style>
        *{box-sizing:border-box}body{font:13px/1.45 Arial,sans-serif;color:#111;margin:0;padding:24px}
        .receipt{max-width:360px;margin:0 auto}.center{text-align:center}.muted{color:#666}
        h1{font-size:19px;margin:0 0 4px}h2{font-size:14px;margin:18px 0 6px}
        .rule{border-top:1px dashed #999;margin:14px 0}
        table{width:100%;border-collapse:collapse;font-size:12px}th,td{text-align:left;padding:7px 3px;border-bottom:1px solid #ddd}
        th:last-child,td:last-child{text-align:right}td:nth-child(2),td:nth-child(3){text-align:right}
        small{display:block;color:#666;font-size:10px}.totals p{display:flex;justify-content:space-between;margin:5px 0}
        .grand{font-weight:700;font-size:16px;border-top:1px solid #111;padding-top:8px}
        @media print{body{padding:0}.receipt{max-width:none}}
      </style></head><body><main class="receipt">
        <header class="center"><h1>${businessName}</h1>${address ? "<p>" + address + "</p>" : ""}
          ${business.phone ? "<p>" + escapeHtml(business.phone) + "</p>" : ""}
          ${business.gstRegistered && business.gstin ? "<p>GSTIN: " + escapeHtml(business.gstin) + "</p>" : ""}
          <div class="rule"></div><strong>${record.status === "reversed" ? "REVERSED SALE" : "SALES RECEIPT"}</strong>
          <p class="muted">${escapeHtml(record.id.slice(-7).toUpperCase())}<br>${escapeHtml(formatDateTime(record.createdAt))}</p>
        </header>
        <p>Customer: <strong>${escapeHtml(record.customerName ?? "Walk-in")}</strong></p>
        <table><thead><tr><th>Item</th><th>Qty</th><th>Rate</th><th>Amount</th></tr></thead><tbody>${itemRows || '<tr><td colspan="4">No remaining sale items</td></tr>'}</tbody></table>
        <section class="totals">
          <p><span>Subtotal</span><span>${escapeHtml(money(record.subtotal, currency))}</span></p>
          <p><span>Discount</span><span>${escapeHtml(money(record.discount, currency))}</span></p>
          <p class="grand"><span>Total</span><span>${escapeHtml(money(record.total, currency))}</span></p>
          <p><span>Paid</span><span>${escapeHtml(money(record.paidAmount, currency))}</span></p>
          <p><span>Outstanding</span><span>${escapeHtml(money(record.outstanding, currency))}</span></p>
        </section>
        ${payments ? "<h2>Payment history</h2>" + payments : ""}
        ${returned ? "<h2>Returns</h2>" + returned : ""}
        ${record.status === "reversed" ? "<p><strong>Reason:</strong> " + escapeHtml(record.reversalReason ?? "Not recorded") + "</p>" : ""}
        <div class="rule"></div><p class="center">Thank you for your business.</p>
      </main></body></html>`;
    printWindow.document.open();
    printWindow.document.write(documentHtml);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  }

  function openReturn(record: Sale) {
    setReturnSale(record);
    setReturnQuantities(Object.fromEntries(record.items.map((item) => [item.productId, "0"])));
    setReturnReason("");
    setReturnMethod("");
    setReturnReference("");
    setSale(null);
  }

  function submitReturn() {
    if (!business || !returnSale) return;
    const items = returnSale.items
      .map((item) => ({ productId: item.productId, quantity: Number(returnQuantities[item.productId] ?? 0) }))
      .filter((item) => item.quantity > 0);
    try {
      const updated = recordSaleReturn(useAppStore.getState().db, returnSale.id, {
        businessId: business.id,
        items,
        reason: returnReason,
        refundMethod: returnMethod || undefined,
        refundReference: returnReference,
      });
      apply(updated);
      toast.success("Return recorded and stock reconciled");
      setReturnSale(null);
      setReturnQuantities({});
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not record return");
    }
  }

  return (
    <AppPage>
      <PageHeader
        title="Sales"
        subtitle={`${allSales.filter((record) => record.status !== "reversed").length} completed · ${allSales.filter((record) => record.status === "reversed").length} reversed`}
        action={<Button size="sm" variant="secondary" onClick={exportCsv} disabled={!sales.length}><Download className="size-4" />Export</Button>}
      />
      <div className="mb-4 grid grid-cols-2 gap-2">
        <Card><Stat label="Sales in view" value={String(activeSalesInView.length)} /></Card>
        <Card><Stat label="Booked revenue" value={money(booked, currency)} /></Card>
        <Card><Stat label="Cash collected" value={money(collected, currency)} tone="good" /></Card>
        <Card><Stat label="Outstanding" value={money(due, currency)} tone={due > 0 ? "bad" : "good"} /></Card>
      </div>

      <SearchField value={query} onChange={setQuery} placeholder="Search customer, sale ID, product or SKU" />
      <SavedViewControls businessId={business.id} moduleKey="sales" filters={{ query, dateFilter, paymentFilter }} onApply={(saved) => {
        setQuery(saved.query ?? "");
        setDateFilter((saved.dateFilter as DateFilter) ?? "month");
        setPaymentFilter((saved.paymentFilter as PaymentFilter) ?? "all");
      }} />
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
                    <Badge tone={record.status === "reversed" ? "bad" : record.paymentStatus === "paid" ? "good" : record.paymentStatus === "partial" ? "warn" : "bad"}>
                      {record.status === "reversed" ? "reversed" : record.paymentStatus}
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
              <Button variant="secondary" className="w-full" onClick={() => sale && printReceipt(sale)}><Printer className="size-4" />Print / Save receipt</Button>
              {sale.status !== "reversed" && sale.outstanding > 0 ? (
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
                  <Field label="Payment method"><Select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value as RecordedPaymentMethod)}>
                    <option value="upi">UPI</option><option value="cash">Cash</option><option value="bank">Bank transfer</option><option value="card">Card</option><option value="other">Other</option>
                  </Select></Field>
                  <Field label="Reference (optional)"><Input value={paymentReference} onChange={(event) => setPaymentReference(event.target.value)} placeholder="UTR / transaction ID" /></Field>
                  <Button className="w-full" onClick={collectPayment} disabled={!payment.trim()}>Record payment</Button>
                </>
              ) : null}
              {sale.status !== "reversed" ? (
                <>
                  <Button variant="secondary" className="w-full" onClick={() => openReturn(sale)}>Return items</Button>
                  <Button variant="ghost" className="w-full text-danger" onClick={() => { setReverseReason(""); setRefundMethod(""); setRefundReference(""); setConfirm(true); }}>
                    Reverse sale
                  </Button>
                </>
              ) : <p className="text-sm text-danger">Reversed · {sale.reversalReason ?? "Reason not recorded"}</p>}
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
            <div className="space-y-2">
              <p className="text-xs font-semibold">Payment history</p>
              {(sale.payments ?? []).length ? sale.payments!.map((entry) => (
                <div key={entry.id} className="flex justify-between gap-3 border-b border-border py-2 text-xs">
                  <span>{money(entry.amount, currency)} · {entry.method.toUpperCase()}{entry.reference ? ` · ${entry.reference}` : ""}</span>
                  <span className="text-muted-foreground">{formatDateTime(entry.receivedAt)}</span>
                </div>
              )) : sale.paidAmount > 0 ? <p className="text-xs text-muted-foreground">Previously recorded payment · {money(sale.paidAmount, currency)} (method history not available).</p> : <p className="text-xs text-muted-foreground">No payments recorded yet.</p>}
              {(sale.refunds ?? []).length ? <>
                <p className="pt-2 text-xs font-semibold">Refund history</p>
                {sale.refunds!.map((entry) => <div key={entry.id} className="flex justify-between gap-3 border-b border-border py-2 text-xs">
                  <span>{money(entry.amount, currency)} · {entry.method.toUpperCase()}{entry.reference ? ` · ${entry.reference}` : ""}</span>
                  <span className="text-muted-foreground">{formatDateTime(entry.refundedAt)}</span>
                </div>)}
              </> : null}
              {(db.returns ?? []).filter((entry) => entry.saleId === sale.id).length ? <>
                <p className="pt-2 text-xs font-semibold">Return history</p>
                {(db.returns ?? []).filter((entry) => entry.saleId === sale.id).map((entry) => (
                  <div key={entry.id} className="rounded-lg border border-border p-2 text-xs">
                    <div className="flex justify-between gap-2"><span>{entry.items.map((item) => `${item.name} × ${item.quantity}`).join(", ")}</span><span className="tabular">{money(entry.amount, currency)}</span></div>
                    <p className="mt-1 text-muted-foreground">{entry.reason} · {formatDateTime(entry.createdAt)}{entry.refundAmount > 0 ? ` · refunded ${money(entry.refundAmount, currency)}` : ""}</p>
                  </div>
                ))}
              </> : null}
            </div>
            {sale.note ? <p className="text-sm text-muted-foreground">{sale.note}</p> : null}
          </div>
        ) : null}
      </BottomSheet>

      <BottomSheet
        open={confirm}
        onOpenChange={setConfirm}
        title="Reverse this sale?"
        description="Stock will be returned to inventory. The original sale stays in the ledger."
        footer={
          <ConfirmBar
            danger
            confirmLabel="Reverse"
            onCancel={() => setConfirm(false)}
            onConfirm={() => {
              if (!sale) return;
              try {
                const refund = sale.paidAmount > 0
                  ? (refundMethod ? { method: refundMethod, reference: refundReference } : undefined)
                  : undefined;
                apply(reverseSale(useAppStore.getState().db, sale.id, reverseReason, refund));
                toast.success("Sale reversed and refund recorded");
                setConfirm(false);
                setSale(null);
                setReverseReason("");
              } catch (error) {
                toast.error(error instanceof Error ? error.message : "Could not reverse sale");
              }
            }}
          />
        }
      >
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">Reversals restore stock and retain the original transaction. This does not transfer money; record refund details only after you have actually refunded the customer.</p>
          <Input value={reverseReason} onChange={(event) => setReverseReason(event.target.value)} placeholder="Reason for reversal (required)" />
          {sale?.paidAmount ? <>
            <Field label={`Refund amount · ${money(sale.paidAmount, currency)}`}><Input value={money(sale.paidAmount, currency)} disabled /></Field>
            <Field label="Refund method (required)"><Select value={refundMethod} onChange={(event) => setRefundMethod(event.target.value as RecordedPaymentMethod | "")}>
              <option value="">Select refund method</option><option value="upi">UPI</option><option value="cash">Cash</option><option value="bank">Bank transfer</option><option value="card">Card</option><option value="other">Other</option>
            </Select></Field>
            <Field label="Refund reference (optional)"><Input value={refundReference} onChange={(event) => setRefundReference(event.target.value)} placeholder="UTR / refund reference" /></Field>
          </> : null}
        </div>
      </BottomSheet>

      <BottomSheet
        open={!!returnSale}
        onOpenChange={(open) => !open && setReturnSale(null)}
        title="Return sale items"
        description={returnSale ? `Sale ${returnSale.id.slice(-7).toUpperCase()} · revised total and any refund are calculated automatically` : undefined}
        footer={<Button className="w-full" onClick={submitReturn} disabled={!returnSale || returnReason.trim().length < 3 || !returnSale.items.some((item) => Number(returnQuantities[item.productId] ?? 0) > 0)}>Record return</Button>}
      >
        {returnSale ? (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">Enter the quantity physically received back. Returned stock is added to inventory. Any refund is recorded only after you have actually sent it to the customer.</p>
            {returnSale.items.map((item) => (
              <div key={item.productId} className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{item.name}</p>
                  <p className="text-xs text-muted-foreground">{item.sku} · {item.qty} still sold</p>
                </div>
                <div className="w-24 shrink-0">
                  <Input type="number" min="0" max={item.qty} step="0.01" inputMode="decimal" value={returnQuantities[item.productId] ?? "0"} onChange={(event) => setReturnQuantities((current) => ({ ...current, [item.productId]: event.target.value }))} />
                </div>
              </div>
            ))}
            <Field label="Return reason"><Input value={returnReason} onChange={(event) => setReturnReason(event.target.value)} placeholder="Damaged, incorrect item, customer return…" /></Field>
            <Field label="Refund method (only when a refund is due)"><Select value={returnMethod} onChange={(event) => setReturnMethod(event.target.value as RecordedPaymentMethod | "")}>
              <option value="">No refund / not yet recorded</option><option value="upi">UPI</option><option value="cash">Cash</option><option value="bank">Bank transfer</option><option value="card">Card</option><option value="other">Other</option>
            </Select></Field>
            <Field label="Refund reference (optional)"><Input value={returnReference} onChange={(event) => setReturnReference(event.target.value)} placeholder="UTR / refund reference" /></Field>
          </div>
        ) : null}
      </BottomSheet>
    </AppPage>
  );
}
