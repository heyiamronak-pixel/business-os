import * as React from "react";
import { toast } from "sonner";
import { Minus, Plus, Trash2, UserRound } from "lucide-react";
import { AppPage, PageHeader } from "@/components/app-shell";
import { SearchField } from "@/components/app-shell";
import { BottomSheet } from "@/components/sheet";
import { Badge, Button, EmptyState, Field, Input, Select } from "@/components/ui";
import { PAYMENT_METHODS, type PaymentMethod, type Product } from "@/lib/domain";
import { money } from "@/lib/format";
import { attachKeyboardWedgeScanner } from "@/lib/sku";
import { completeSale } from "@/lib/services";
import { useAppStore, useBusiness } from "@/lib/store";
import { cn, roundMoney } from "@/lib/utils";

interface Line {
  product: Product;
  qty: number;
  unitPrice: number;
  discount: number;
}

export function SellScreen() {
  const business = useBusiness();
  const db = useAppStore((s) => s.db);
  const apply = useAppStore((s) => s.apply);
  const [q, setQ] = React.useState("");
  const [cart, setCart] = React.useState<Line[]>([]);
  const [open, setOpen] = React.useState(false);
  const [customerId, setCustomerId] = React.useState("");
  const [method, setMethod] = React.useState<PaymentMethod>("cash");
  const [paid, setPaid] = React.useState("");
  const [cartDiscount, setCartDiscount] = React.useState("0");
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    return attachKeyboardWedgeScanner((code) => {
      const product = db.products.find(
        (p) => p.businessId === business?.id && (p.barcode === code || p.sku.toLowerCase() === code.toLowerCase()),
      );
      if (product) {
        add(product);
        toast.success(`Added ${product.name}`);
      } else {
        toast.error("No product matches that code");
      }
    });
  }, [db.products, business?.id]);

  if (!business) return null;
  const products = db.products.filter((p) => p.businessId === business.id && !p.archived);
  const customers = db.customers.filter((c) => c.businessId === business.id && !c.archived);
  const filtered = products.filter((p) => {
    const s = q.toLowerCase();
    return !s || p.name.toLowerCase().includes(s) || p.sku.toLowerCase().includes(s) || p.barcode?.includes(s);
  });

  function add(product: Product) {
    setCart((prev) => {
      const i = prev.findIndex((l) => l.product.id === product.id);
      if (i >= 0) {
        const next = [...prev];
        if (next[i].qty + 1 > product.stock) {
          toast.error(`Only ${product.stock} in stock`);
          return prev;
        }
        next[i] = { ...next[i], qty: next[i].qty + 1 };
        return next;
      }
      if (product.stock <= 0) {
        toast.error(`${product.name} is out of stock`);
        return prev;
      }
      return [...prev, { product, qty: 1, unitPrice: product.sellingPrice, discount: 0 }];
    });
  }

  function updateLine(id: string, patch: Partial<Line>) {
    setCart((prev) => prev.map((l) => (l.product.id === id ? { ...l, ...patch } : l)));
  }

  const subtotal = roundMoney(cart.reduce((s, l) => s + l.unitPrice * l.qty - l.discount, 0));
  const disc = roundMoney(Number(cartDiscount) || 0);
  const total = roundMoney(Math.max(0, subtotal - disc));
  const paidAmount = method === "credit" ? Number(paid || 0) : Number(paid === "" ? total : paid);

  function checkout() {
    if (!business) return;
    setError("");
    try {
      const result = completeSale(useAppStore.getState().db, {
        businessId: business.id,
        customerId: customerId || undefined,
        lines: cart.map((l) => ({
          productId: l.product.id,
          qty: l.qty,
          unitPrice: l.unitPrice,
          discount: l.discount,
        })),
        cartDiscount: disc,
        paymentMethod: method,
        paidAmount,
      });
      apply(result.db);
      toast.success("Sale recorded");
      setCart([]);
      setOpen(false);
      setCustomerId("");
      setPaid("");
      setCartDiscount("0");
      setMethod("cash");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not complete sale");
    }
  }

  return (
    <AppPage>
      <PageHeader title="Sell" subtitle="Search, add, take payment" />
      <SearchField value={q} onChange={setQ} placeholder="Search name, SKU, or scan" />
      {products.length === 0 ? (
        <EmptyState
          title="Add your products to start taking sales"
          body="A sale updates stock, revenue, profit and customer history in one step."
        />
      ) : filtered.length === 0 ? (
        <EmptyState title="No matching products" body="Try a different name or SKU." />
      ) : (
        <ul className="space-y-2">
          {filtered.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => add(p)}
                className="flex w-full items-center gap-3 rounded-[var(--radius-xl)] border border-border bg-card p-3 text-left"
              >
                <Thumb src={p.imageDataUrl} label={p.name} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{p.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {p.sku} · {p.stock} {p.unit}
                  </p>
                </div>
                <div className="text-right">
                  <p className="tabular text-sm font-semibold">{money(p.sellingPrice, business.currency)}</p>
                  {p.stock <= 0 ? <Badge tone="bad">Out</Badge> : p.stock <= p.minStock ? <Badge tone="warn">Low</Badge> : null}
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}

      {cart.length > 0 ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="fixed bottom-[calc(var(--nav-h)+var(--safe-b)+12px)] left-1/2 z-30 flex w-[min(calc(100%-32px),28rem)] -translate-x-1/2 items-center justify-between rounded-full bg-primary px-5 py-3 text-primary-foreground shadow-lg"
        >
          <span className="text-sm font-medium">
            {cart.reduce((s, l) => s + l.qty, 0)} items
          </span>
          <span className="tabular font-semibold">{money(total, business.currency)}</span>
        </button>
      ) : null}

      <BottomSheet
        open={open}
        onOpenChange={setOpen}
        title="Cart"
        description="Quantity, price, customer, payment"
        footer={
          <Button className="w-full" size="lg" onClick={checkout} disabled={!cart.length}>
            Complete sale · {money(total, business.currency)}
          </Button>
        }
      >
        <ul className="space-y-3">
          {cart.map((l) => (
            <li key={l.product.id} className="rounded-[var(--radius-lg)] border border-border p-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium">{l.product.name}</p>
                  <p className="text-xs text-muted-foreground">{l.product.stock} in stock</p>
                </div>
                <button type="button" onClick={() => setCart((c) => c.filter((x) => x.product.id !== l.product.id))} aria-label="Remove">
                  <Trash2 className="size-4 text-danger" />
                </button>
              </div>
              <div className="mt-2 grid grid-cols-3 gap-2">
                <Field label="Qty">
                  <div className="flex h-11 items-center rounded-[var(--radius-md)] border border-border">
                    <button type="button" className="size-11" onClick={() => updateLine(l.product.id, { qty: Math.max(1, l.qty - 1) })}>
                      <Minus className="mx-auto size-4" />
                    </button>
                    <span className="flex-1 text-center tabular">{l.qty}</span>
                    <button
                      type="button"
                      className="size-11"
                      onClick={() => updateLine(l.product.id, { qty: Math.min(l.product.stock, l.qty + 1) })}
                    >
                      <Plus className="mx-auto size-4" />
                    </button>
                  </div>
                </Field>
                <Field label="Price">
                  <Input
                    type="number"
                    inputMode="decimal"
                    value={l.unitPrice}
                    onChange={(e) => updateLine(l.product.id, { unitPrice: Number(e.target.value) })}
                  />
                </Field>
                <Field label="Line off">
                  <Input
                    type="number"
                    inputMode="decimal"
                    value={l.discount}
                    onChange={(e) => updateLine(l.product.id, { discount: Number(e.target.value) })}
                  />
                </Field>
              </div>
            </li>
          ))}
        </ul>
        <div className="mt-4 space-y-3">
          <Field label="Cart discount">
            <Input type="number" inputMode="decimal" value={cartDiscount} onChange={(e) => setCartDiscount(e.target.value)} />
          </Field>
          <Field label="Customer">
            <div className="flex items-center gap-2">
              <UserRound className="size-4 text-muted-foreground" />
              <Select value={customerId} onChange={(e) => setCustomerId(e.target.value)} className="flex-1">
                <option value="">Walk-in</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </div>
          </Field>
          <Field label="Payment">
            <Select value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)}>
              {PAYMENT_METHODS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </Select>
          </Field>
          {method === "credit" ? (
            <Field label="Amount paid now">
              <Input type="number" inputMode="decimal" value={paid} onChange={(e) => setPaid(e.target.value)} placeholder="0" />
            </Field>
          ) : null}
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="tabular">{money(subtotal, business.currency)}</span>
          </div>
          <div className="flex justify-between text-base font-semibold">
            <span>Total</span>
            <span className="tabular">{money(total, business.currency)}</span>
          </div>
          {error ? <p className="text-sm text-danger">{error}</p> : null}
        </div>
      </BottomSheet>
    </AppPage>
  );
}

export function Thumb({ src, label }: { src?: string; label: string }) {
  if (src) return <img src={src} alt="" className="size-12 rounded-[var(--radius-sm)] object-cover" />;
  return (
    <span className="flex size-12 items-center justify-center rounded-[var(--radius-sm)] bg-muted text-sm font-semibold text-muted-foreground">
      {label.slice(0, 1).toUpperCase()}
    </span>
  );
}

export function stockTone(p: Product) {
  if (p.stock <= 0) return "bad" as const;
  if (p.stock <= p.minStock) return "warn" as const;
  return "good" as const;
}

export { cn };
