import * as React from "react";
import { Download, Plus } from "lucide-react";
import { toast } from "sonner";
import { AppPage, PageHeader, SearchField } from "@/components/app-shell";
import { SavedViewControls } from "@/components/saved-view-controls";
import { BottomSheet } from "@/components/sheet";
import { Badge, Button, Card, EmptyState, Field, Input, Select, Stat, Textarea } from "@/components/ui";
import type { Purchase, RecordedPaymentMethod } from "@/lib/domain";
import { downloadCsv } from "@/lib/csv";
import { formatDateTime, money } from "@/lib/format";
import { createPurchase, updatePurchasePayment } from "@/lib/services";
import { useAppStore, useBusiness } from "@/lib/store";
import { roundMoney } from "@/lib/utils";

type PurchaseLine = { productId: string; quantity: number; unitCost: number };
const blankLine = (): PurchaseLine => ({ productId: "", quantity: 1, unitCost: 0 });

export function PurchasesScreen() {
  const business = useBusiness();
  const db = useAppStore((state) => state.db);
  const apply = useAppStore((state) => state.apply);
  const [query, setQuery] = React.useState("");
  const [filter, setFilter] = React.useState<"all" | "due">("all");
  const [createOpen, setCreateOpen] = React.useState(false);
  const [supplierId, setSupplierId] = React.useState("");
  const [lines, setLines] = React.useState<PurchaseLine[]>([blankLine()]);
  const [paidAmount, setPaidAmount] = React.useState("0");
  const [initialPaymentMethod, setInitialPaymentMethod] = React.useState<RecordedPaymentMethod>("bank");
  const [initialPaymentReference, setInitialPaymentReference] = React.useState("");
  const [note, setNote] = React.useState("");
  const [selected, setSelected] = React.useState<Purchase | null>(null);
  const [payment, setPayment] = React.useState("");
  const [paymentMethod, setPaymentMethod] = React.useState<RecordedPaymentMethod>("bank");
  const [paymentReference, setPaymentReference] = React.useState("");

  if (!business) return null;
  const businessId = business.id;
  const suppliers = db.suppliers.filter((supplier) => supplier.businessId === businessId);
  const activeSuppliers = suppliers.filter((supplier) => supplier.status === "active");
  const products = db.products.filter((product) => product.businessId === businessId && !product.archived);
  const purchases = db.purchases.filter((purchase) => purchase.businessId === businessId);
  const totalValue = purchases.reduce((sum, purchase) => sum + purchase.total, 0);
  const totalPaid = purchases.reduce((sum, purchase) => sum + purchase.paidAmount, 0);
  const totalDue = purchases.reduce((sum, purchase) => sum + purchase.balance, 0);
  const safeSearch = query.trim().toLowerCase();
  const list = purchases
    .filter((purchase) => filter === "all" || purchase.balance > 0)
    .filter((purchase) =>
      !safeSearch ||
      purchase.supplierName.toLowerCase().includes(safeSearch) ||
      purchase.id.toLowerCase().includes(safeSearch),
    )
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const subtotal = roundMoney(lines.reduce((sum, line) => sum + Math.max(0, line.quantity) * Math.max(0, line.unitCost), 0));
  const paidPreview = Number(paidAmount);
  const selectedSupplier = suppliers.find((supplier) => supplier.id === supplierId);

  function exportPurchases() {
    downloadCsv("business-sutra-purchases.csv",
      ["Purchase reference", "Date", "Supplier", "Items", "Subtotal", "Total", "Paid", "Balance", "Payment status", "Note"],
      list.map((purchase) => [purchase.id, purchase.createdAt, purchase.supplierName, purchase.items.map((item) => item.name + " x " + item.quantity).join("; "), purchase.subtotal, purchase.total, purchase.paidAmount, purchase.balance, purchase.paymentStatus, purchase.note]));
    toast.success("Exported " + list.length + " purchases");
  }

  function startPurchase() {
    setSupplierId(activeSuppliers[0]?.id ?? "");
    setLines([blankLine()]);
    setPaidAmount("0");
    setInitialPaymentMethod("bank");
    setInitialPaymentReference("");
    setNote("");
    setCreateOpen(true);
  }

  function changeLine(index: number, patch: Partial<PurchaseLine>) {
    setLines((current) => current.map((line, lineIndex) => lineIndex === index ? { ...line, ...patch } : line));
  }

  function selectProduct(index: number, productId: string) {
    const product = products.find((item) => item.id === productId);
    changeLine(index, { productId, unitCost: product?.costPrice ?? 0 });
  }

  function savePurchase() {
    try {
      const result = createPurchase(useAppStore.getState().db, {
        businessId: businessId,
        supplierId,
        items: lines.filter((line) => line.productId),
        paidAmount: Number(paidAmount),
        initialPaymentMethod,
        initialPaymentReference,
        note,
      });
      apply(result.db);
      toast.success("Purchase recorded and stock updated");
      setCreateOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not record purchase");
    }
  }

  function collectPayment() {
    if (!selected) return;
    try {
      const currentDb = useAppStore.getState().db;
      const updatedDb = updatePurchasePayment(currentDb, selected.id, Number(payment), paymentMethod, paymentReference);
      apply(updatedDb);
      const updated = updatedDb.purchases.find((purchase) => purchase.id === selected.id) ?? null;
      setSelected(updated);
      setPayment("");
      setPaymentReference("");
      toast.success("Supplier payment recorded");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not record payment");
    }
  }

  return (
    <AppPage>
      <PageHeader
        title="Purchases"
        subtitle="Goods received, supplier payments and stock reconciliation"
        action={<div className="flex gap-2"><Button size="sm" variant="secondary" onClick={exportPurchases} disabled={!list.length}><Download className="size-4" />Export</Button><Button size="sm" onClick={startPurchase}><Plus className="size-4" />Record purchase</Button></div>}
      />
      <div className="mb-4 grid grid-cols-2 gap-2 lg:grid-cols-3">
        <Card><Stat label="Purchase value" value={money(totalValue, business.currency)} /></Card>
        <Card><Stat label="Paid to suppliers" value={money(totalPaid, business.currency)} /></Card>
        <Card className="col-span-2 lg:col-span-1"><Stat label="Outstanding" value={money(totalDue, business.currency)} tone={totalDue > 0 ? "bad" : "good"} /></Card>
      </div>
      <SearchField value={query} onChange={setQuery} placeholder="Search supplier or purchase reference" />
      <SavedViewControls businessId={businessId} moduleKey="purchases" filters={{ query, filter }} onApply={(saved) => {
        setQuery(saved.query ?? "");
        setFilter((saved.filter as "all" | "due") ?? "all");
      }} />
      <div className="mb-3 flex gap-2">
        <Button size="sm" variant={filter === "all" ? "default" : "secondary"} onClick={() => setFilter("all")}>All purchases</Button>
        <Button size="sm" variant={filter === "due" ? "default" : "secondary"} onClick={() => setFilter("due")}>Outstanding</Button>
      </div>
      {purchases.length === 0 ? (
        <EmptyState
          title="No purchases recorded"
          body="Record a goods receipt to add stock and track how much is still payable to the supplier."
          action={<Button onClick={startPurchase}>Record first purchase</Button>}
        />
      ) : list.length === 0 ? (
        <EmptyState title="No matching purchases" body="Try another reference or change the payment filter." />
      ) : (
        <ul className="space-y-2">
          {list.map((purchase) => (
            <li key={purchase.id}>
              <button type="button" onClick={() => { setSelected(purchase); setPayment(""); }} className="w-full text-left">
                <Card className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{purchase.supplierName}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{purchase.id.slice(-8).toUpperCase()} · {formatDateTime(purchase.createdAt)} · {purchase.items.length} lines</p>
                    <div className="mt-2"><Badge tone={purchase.paymentStatus === "paid" ? "good" : purchase.paymentStatus === "partial" ? "warn" : "bad"}>{purchase.paymentStatus}</Badge></div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold tabular">{money(purchase.total, business.currency)}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{purchase.balance > 0 ? `${money(purchase.balance, business.currency)} due` : "Settled"}</p>
                  </div>
                </Card>
              </button>
            </li>
          ))}
        </ul>
      )}

      <BottomSheet
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="Record purchase"
        description="Stock is added only when this purchase is saved successfully."
        footer={<Button className="w-full" onClick={savePurchase} disabled={!activeSuppliers.length || !products.length}>Save purchase · {money(subtotal, business.currency)}</Button>}
      >
        {activeSuppliers.length === 0 || products.length === 0 ? (
          <EmptyState
            title="Set up suppliers and products first"
            body="Create at least one active supplier and one product before recording a purchase."
          />
        ) : (
          <div className="space-y-3">
            <Field label="Supplier">
              <Select value={supplierId} onChange={(event) => setSupplierId(event.target.value)}>
                {activeSuppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}
              </Select>
            </Field>
            {lines.map((line, index) => (
              <Card key={index} className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">Item {index + 1}</p>
                  {lines.length > 1 ? <Button size="sm" variant="ghost" className="text-danger" onClick={() => setLines((current) => current.filter((_, lineIndex) => lineIndex !== index))}>Remove</Button> : null}
                </div>
                <Field label="Product">
                  <Select value={line.productId} onChange={(event) => selectProduct(index, event.target.value)}>
                    <option value="">Select product</option>
                    {products.map((product) => <option key={product.id} value={product.id}>{product.name} · Stock {product.stock}</option>)}
                  </Select>
                </Field>
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Quantity">
                    <Input type="number" min="0.01" step="0.01" value={line.quantity} onChange={(event) => changeLine(index, { quantity: Number(event.target.value) })} />
                  </Field>
                  <Field label="Unit cost">
                    <Input type="number" min="0" step="0.01" value={line.unitCost} onChange={(event) => changeLine(index, { unitCost: Number(event.target.value) })} />
                  </Field>
                </div>
                <p className="text-right text-sm font-semibold tabular">Line total: {money(roundMoney(line.quantity * line.unitCost), business.currency)}</p>
              </Card>
            ))}
            <Button variant="secondary" className="w-full" onClick={() => setLines((current) => [...current, blankLine()])}><Plus className="size-4" />Add another item</Button>
            <Field label="Amount paid now">
              <Input type="number" min="0" max={subtotal} step="0.01" value={paidAmount} onChange={(event) => setPaidAmount(event.target.value)} />
            </Field>
            {Number(paidAmount) > 0 ? <>
              <Field label="Payment method"><Select value={initialPaymentMethod} onChange={(event) => setInitialPaymentMethod(event.target.value as RecordedPaymentMethod)}>
                <option value="bank">Bank transfer</option><option value="upi">UPI</option><option value="cash">Cash</option><option value="card">Card</option><option value="other">Other</option>
              </Select></Field>
              <Field label="Payment reference (optional)"><Input value={initialPaymentReference} onChange={(event) => setInitialPaymentReference(event.target.value)} placeholder="UTR / transaction ID" /></Field>
            </> : null}
            <div className="grid grid-cols-2 gap-2 rounded-xl bg-muted/50 p-3">
              <div><p className="text-xs text-muted-foreground">Total</p><p className="mt-1 font-semibold tabular">{money(subtotal, business.currency)}</p></div>
              <div><p className="text-xs text-muted-foreground">Balance after payment</p><p className="mt-1 font-semibold tabular">{money(Math.max(0, subtotal - (Number.isFinite(paidPreview) ? paidPreview : 0)), business.currency)}</p></div>
            </div>
            <Field label="Purchase note">
              <Textarea rows={2} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Supplier invoice reference, delivery note…" />
            </Field>
            {selectedSupplier ? <p className="text-xs text-muted-foreground">Supplier: {selectedSupplier.name}. Saving updates each selected product's stock and writes a purchase movement.</p> : null}
          </div>
        )}
      </BottomSheet>

      <BottomSheet
        open={!!selected}
        onOpenChange={(open) => !open && setSelected(null)}
        title={selected?.supplierName ?? "Purchase"}
        description={selected ? `Purchase ${selected.id.slice(-8).toUpperCase()} · ${formatDateTime(selected.createdAt)}` : undefined}
        footer={
          selected && selected.balance > 0 ? (
            <div className="space-y-2">
              <Field label={`Record supplier payment · ${money(selected.balance, business.currency)} due`}>
                <Input type="number" min="0.01" max={selected.balance} step="0.01" value={payment} onChange={(event) => setPayment(event.target.value)} placeholder="Payment amount" />
              </Field>
              <Field label="Payment method"><Select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value as RecordedPaymentMethod)}>
                <option value="bank">Bank transfer</option><option value="upi">UPI</option><option value="cash">Cash</option><option value="card">Card</option><option value="other">Other</option>
              </Select></Field>
              <Field label="Payment reference (optional)"><Input value={paymentReference} onChange={(event) => setPaymentReference(event.target.value)} placeholder="UTR / transaction ID" /></Field>
              <Button className="w-full" onClick={collectPayment} disabled={!payment.trim()}>Record payment</Button>
            </div>
          ) : <Button className="w-full" variant="secondary" onClick={() => setSelected(null)}>Close</Button>
        }
      >
        {selected ? (
          <div className="space-y-3">
            <div className="space-y-2">
              {selected.items.map((item, index) => (
                <div key={`${item.productId}-${index}`} className="flex justify-between gap-3 text-sm">
                  <span>{item.name} × {item.quantity}</span>
                  <span className="tabular">{money(item.total, business.currency)}</span>
                </div>
              ))}
            </div>
            <div className="space-y-2 border-t border-border pt-3 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Purchase total</span><span className="tabular font-semibold">{money(selected.total, business.currency)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Paid</span><span className="tabular">{money(selected.paidAmount, business.currency)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Outstanding</span><span className="tabular font-semibold">{money(selected.balance, business.currency)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Status</span><Badge tone={selected.paymentStatus === "paid" ? "good" : selected.paymentStatus === "partial" ? "warn" : "bad"}>{selected.paymentStatus}</Badge></div>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-semibold">Supplier payment history</p>
              {(selected.payments ?? []).length ? selected.payments!.map((entry) => (
                <div key={entry.id} className="flex justify-between gap-3 border-b border-border py-2 text-xs">
                  <span>{money(entry.amount, business.currency)} · {entry.method.toUpperCase()}{entry.reference ? ` · ${entry.reference}` : ""}</span>
                  <span className="text-muted-foreground">{formatDateTime(entry.paidAt)}</span>
                </div>
              )) : selected.paidAmount > 0 ? <p className="text-xs text-muted-foreground">Previously recorded payment · {money(selected.paidAmount, business.currency)} (method history not available).</p> : <p className="text-xs text-muted-foreground">No supplier payments recorded yet.</p>}
            </div>
            {selected.note ? <p className="text-sm text-muted-foreground">{selected.note}</p> : null}
          </div>
        ) : null}
      </BottomSheet>
    </AppPage>
  );
}
