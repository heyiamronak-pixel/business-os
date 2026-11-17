import * as React from "react";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { AppPage, PageHeader, SearchField } from "@/components/app-shell";
import { SavedViewControls } from "@/components/saved-view-controls";
import { BottomSheet } from "@/components/sheet";
import { Badge, Button, EmptyState, Field, Input, Segmented, Select } from "@/components/ui";
import type { MovementType, Product } from "@/lib/domain";
import { downloadCsv } from "@/lib/csv";
import { formatDateTime } from "@/lib/format";
import { adjustStock } from "@/lib/services";
import { useAppStore, useBusiness } from "@/lib/store";
import { Thumb } from "@/screens/sell";

export function InventoryScreen() {
  const business = useBusiness();
  const db = useAppStore((s) => s.db);
  const apply = useAppStore((s) => s.apply);
  const [q, setQ] = React.useState("");
  const [filter, setFilter] = React.useState<"all" | "low" | "out">("all");
  const [product, setProduct] = React.useState<Product | null>(null);
  const [mode, setMode] = React.useState<"in" | "out" | "adjustment">("in");
  const [qty, setQty] = React.useState("");
  const [reason, setReason] = React.useState("");

  if (!business) return null;
  const products = db.products.filter((p) => p.businessId === business.id && !p.archived);
  const list = products.filter((p) => {
    const s = q.toLowerCase();
    const matchesQ = !s || p.name.toLowerCase().includes(s) || p.sku.toLowerCase().includes(s);
    const matchesF = filter === "all" || (filter === "low" && p.stock > 0 && p.stock <= p.minStock) || (filter === "out" && p.stock <= 0);
    return matchesQ && matchesF;
  });

  function exportInventory() {
    downloadCsv("business-sutra-inventory.csv",
      ["Product", "SKU", "Category", "Current stock", "Minimum stock", "Unit", "Stock status"],
      list.map((product) => [product.name, product.sku, product.category, product.stock, product.minStock, product.unit, product.stock <= 0 ? "Out of stock" : product.stock <= product.minStock ? "Low stock" : "In stock"]));
    toast.success("Exported " + list.length + " inventory rows");
  }

  function submit() {
    if (!business || !product) return;
    try {
      apply(
        adjustStock(useAppStore.getState().db, {
          businessId: business.id,
          productId: product.id,
          type: mode,
          quantity: Number(qty),
          reason,
        }),
      );
      toast.success("Stock updated");
      setProduct(null);
      setQty("");
      setReason("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update stock");
    }
  }

  return (
    <AppPage>
      <PageHeader title="Inventory" subtitle="Stock in, out, and adjustments" action={<Button size="sm" variant="secondary" onClick={exportInventory} disabled={!list.length}><Download className="size-4" />Export</Button>} />
      <SearchField value={q} onChange={setQ} placeholder="Search stock" />
      <SavedViewControls businessId={business.id} moduleKey="inventory" filters={{ q, filter }} onApply={(saved) => {
        setQ(saved.q ?? "");
        setFilter((saved.filter as typeof filter) ?? "all");
      }} />
      <div className="mb-3">
        <Segmented
          value={filter}
          onChange={(value) => setFilter(value as typeof filter)}
          options={[
            { id: "all", label: "All" },
            { id: "low", label: "Low" },
            { id: "out", label: "Out" },
          ]}
        />
      </div>
      {products.length === 0 ? (
        <EmptyState title="Add your products to start monitoring stock" body="Opening stock is set when you create a product. Sales reduce it automatically." />
      ) : list.length === 0 ? (
        <EmptyState title="Nothing in this filter" body="No products match the current stock view." />
      ) : (
        <ul className="space-y-2">
          {list.map((p) => (
            <li key={p.id}>
              <button type="button" className="flex w-full items-center gap-3 rounded-[var(--radius-xl)] border border-border bg-card p-3 text-left" onClick={() => setProduct(p)}>
                <Thumb src={p.imageDataUrl} label={p.name} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{p.name}</p>
                  <p className="text-xs text-muted-foreground">Min {p.minStock} {p.unit}</p>
                </div>
                <Badge tone={p.stock <= 0 ? "bad" : p.stock <= p.minStock ? "warn" : "good"}>
                  {p.stock} {p.unit}
                </Badge>
              </button>
            </li>
          ))}
        </ul>
      )}
      <BottomSheet
        open={!!product}
        onOpenChange={(o) => !o && setProduct(null)}
        title={product?.name ?? "Stock"}
        description="Record a movement. Sales already deduct stock on their own."
        footer={
          <Button className="w-full" onClick={submit} disabled={!qty.trim() || reason.trim().length < 3}>
            Save movement
          </Button>
        }
      >
        {product ? (
          <div className="space-y-3">
            <Field label="Type">
              <Select value={mode} onChange={(e) => setMode(e.target.value as "in" | "out" | "adjustment")}>
                <option value="in">Stock in</option>
                <option value="out">Stock out</option>
                <option value="adjustment">Set to quantity</option>
              </Select>
            </Field>
            <Field label={mode === "adjustment" ? "New quantity" : "Quantity"}>
              <Input type="number" inputMode="decimal" value={qty} onChange={(e) => setQty(e.target.value)} />
            </Field>
            <Field label="Reason" hint="Required for stock audit history">
              <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Purchase, damage, count…" />
            </Field>
            <p className="text-xs font-medium uppercase tracking-wide text-subtle">Movement history</p>
            <ul className="space-y-2">
              {db.movements
                .filter((m) => m.productId === product.id)
                .slice(0, 20)
                .map((m) => (
                  <li key={m.id} className="flex justify-between text-sm">
                    <span>
                      {labelType(m.type)} {m.quantity > 0 ? "+" : ""}
                      {m.quantity} · {m.resultingStock} after
                      {m.reason ? ` · ${m.reason}` : ""}
                    </span>
                    <span className="text-muted-foreground">{formatDateTime(m.createdAt)}</span>
                  </li>
                ))}
            </ul>
          </div>
        ) : null}
      </BottomSheet>
    </AppPage>
  );
}

function labelType(t: MovementType): string {
  if (t === "in") return "In";
  if (t === "out") return "Out";
  if (t === "sale") return "Sale";
  return "Adj";
}
