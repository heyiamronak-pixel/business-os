import * as React from "react";
import { toast } from "sonner";
import { AppPage, ConfirmBar, PageHeader, SearchField } from "@/components/app-shell";
import { BottomSheet } from "@/components/sheet";
import { Badge, Button, EmptyState, Input, Segmented } from "@/components/ui";
import type { Sale } from "@/lib/domain";
import { formatDateTime, money } from "@/lib/format";
import { deleteSale, recordPayment } from "@/lib/services";
import { useAppStore, useBusiness } from "@/lib/store";

export function SalesScreen() {
  const business = useBusiness();
  const db = useAppStore((s) => s.db);
  const apply = useAppStore((s) => s.apply);
  const [q, setQ] = React.useState("");
  const [filter, setFilter] = React.useState<"all" | "unpaid">("all");
  const [sale, setSale] = React.useState<Sale | null>(null);
  const [pay, setPay] = React.useState("");
  const [confirm, setConfirm] = React.useState(false);

  if (!business) return null;
  const sales = db.sales.filter((s) => s.businessId === business.id);
  const list = sales.filter((s) => {
    const t = q.toLowerCase();
    const matchesQ =
      !t ||
      s.customerName?.toLowerCase().includes(t) ||
      s.items.some((i) => i.name.toLowerCase().includes(t)) ||
      s.id.toLowerCase().includes(t);
    const matchesF = filter === "all" || s.outstanding > 0;
    return matchesQ && matchesF;
  });

  return (
    <AppPage>
      <PageHeader title="Sales" subtitle="Every completed checkout" />
      <SearchField value={q} onChange={setQ} placeholder="Search sales" />
      <div className="mb-3">
        <Segmented
          value={filter}
          onChange={(value) => setFilter(value as typeof filter)}
          options={[
            { id: "all", label: "All" },
            { id: "unpaid", label: "Unpaid" },
          ]}
        />
      </div>
      {sales.length === 0 ? (
        <EmptyState title="No sales recorded yet" body="Use Sell to check out. Inventory, revenue and customer history update together." />
      ) : list.length === 0 ? (
        <EmptyState title="No matching sales" body="Clear filters to see the full ledger." />
      ) : (
        <ul className="space-y-2">
          {list.map((s) => (
            <li key={s.id}>
              <button type="button" className="flex w-full items-center justify-between rounded-[var(--radius-xl)] border border-border bg-card p-3 text-left" onClick={() => setSale(s)}>
                <div>
                  <p className="font-medium">{s.customerName ?? "Walk-in"}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDateTime(s.createdAt)} · {s.items.length} items
                  </p>
                </div>
                <div className="text-right">
                  <p className="tabular text-sm font-semibold">{money(s.total, business.currency)}</p>
                  <Badge tone={s.paymentStatus === "paid" ? "good" : s.paymentStatus === "partial" ? "warn" : "bad"}>
                    {s.paymentStatus}
                  </Badge>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
      <BottomSheet
        open={!!sale}
        onOpenChange={(o) => !o && setSale(null)}
        title={sale ? money(sale.total, business.currency) : "Sale"}
        description={sale ? `${sale.customerName ?? "Walk-in"} · ${sale.paymentMethod}` : undefined}
        footer={
          sale ? (
            <div className="space-y-2">
              {sale.outstanding > 0 ? (
                <div className="flex gap-2">
                  <Input type="number" inputMode="decimal" value={pay} onChange={(e) => setPay(e.target.value)} placeholder="Amount" />
                  <Button
                    onClick={() => {
                      try {
                        apply(recordPayment(useAppStore.getState().db, sale.id, Number(pay)));
                        toast.success("Payment recorded");
                        setPay("");
                        setSale(null);
                      } catch (e) {
                        toast.error(e instanceof Error ? e.message : "Could not record");
                      }
                    }}
                  >
                    Collect
                  </Button>
                </div>
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
              {sale.items.map((i) => (
                <li key={i.productId} className="flex justify-between text-sm">
                  <span>
                    {i.name} × {i.qty}
                  </span>
                  <span className="tabular">{money(i.unitPrice * i.qty - i.discount, business.currency)}</span>
                </li>
              ))}
            </ul>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Gross profit</span>
              <span className="tabular">{money(sale.grossProfit, business.currency)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Paid / outstanding</span>
              <span className="tabular">
                {money(sale.paidAmount, business.currency)} / {money(sale.outstanding, business.currency)}
              </span>
            </div>
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

