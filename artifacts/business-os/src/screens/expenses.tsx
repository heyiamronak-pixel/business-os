import * as React from "react";
import { toast } from "sonner";
import { AppPage, ConfirmBar, PageHeader } from "@/components/app-shell";
import { BottomSheet } from "@/components/sheet";
import { Button, Card, EmptyState, Field, Input, Select, Stat } from "@/components/ui";
import type { Expense } from "@/lib/domain";
import { formatDate, money } from "@/lib/format";
import { addExpenseCategory, deleteExpense, upsertExpense } from "@/lib/services";
import { useAppStore, useBusiness } from "@/lib/store";
import { monthRange } from "@/lib/engines";

export function ExpensesScreen() {
  const business = useBusiness();
  const db = useAppStore((s) => s.db);
  const apply = useAppStore((s) => s.apply);
  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Expense | null>(null);
  const [confirm, setConfirm] = React.useState<string | null>(null);
  const [category, setCategory] = React.useState("");
  const [amount, setAmount] = React.useState("");
  const [vendor, setVendor] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [date, setDate] = React.useState(new Date().toISOString().slice(0, 10));
  const [newCat, setNewCat] = React.useState("");

  if (!business) return null;
  const cats = db.expenseCategories.filter((c) => c.businessId === business.id);
  const range = monthRange();
  const expenses = db.expenses.filter((e) => e.businessId === business.id);
  const month = expenses.filter((e) => e.date >= range.from.toISOString().slice(0, 10) && e.date <= range.to.toISOString().slice(0, 10));
  const total = month.reduce((s, e) => s + e.amount, 0);
  const byCat = new Map<string, number>();
  for (const e of month) byCat.set(e.category, (byCat.get(e.category) ?? 0) + e.amount);

  function startNew() {
    setEditing(null);
    setCategory(cats[0]?.name ?? "Other");
    setAmount("");
    setVendor("");
    setNotes("");
    setDate(new Date().toISOString().slice(0, 10));
    setOpen(true);
  }

  function startEdit(e: Expense) {
    setEditing(e);
    setCategory(e.category);
    setAmount(String(e.amount));
    setVendor(e.vendor ?? "");
    setNotes(e.notes ?? "");
    setDate(e.date.slice(0, 10));
    setOpen(true);
  }

  function save() {
    if (!business) return;
    try {
      apply(
        upsertExpense(useAppStore.getState().db, {
          id: editing?.id,
          businessId: business.id,
          category,
          amount: Number(amount),
          vendor,
          notes,
          date,
        }),
      );
      toast.success(editing ? "Expense updated" : "Expense added");
      setOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save");
    }
  }

  return (
    <AppPage>
      <PageHeader
        title="Expenses"
        subtitle={range.label}
        action={<Button size="sm" onClick={startNew}>Add</Button>}
      />
      <div className="mb-4 grid grid-cols-2 gap-2">
        <Card>
          <Stat label="This month" value={money(total, business.currency)} />
        </Card>
        <Card>
          <Stat label="Entries" value={String(month.length)} />
        </Card>
      </div>
      {byCat.size > 0 ? (
        <Card className="mb-4 space-y-2">
          {Array.from(byCat.entries())
            .sort((a, b) => b[1] - a[1])
            .map(([k, v]) => (
              <div key={k} className="flex justify-between text-sm">
                <span>{k}</span>
                <span className="tabular">{money(v, business.currency)}</span>
              </div>
            ))}
        </Card>
      ) : null}
      {expenses.length === 0 ? (
        <EmptyState
          title="No expenses recorded yet"
          body="Log rent, salaries, ads and other costs so profit is real — not just sales."
          action={<Button onClick={startNew}>Add expense</Button>}
        />
      ) : (
        <ul className="space-y-2">
          {expenses.map((e) => (
            <li key={e.id}>
              <button type="button" className="flex w-full items-center justify-between rounded-[var(--radius-xl)] border border-border bg-card p-3 text-left" onClick={() => startEdit(e)}>
                <div>
                  <p className="font-medium">{e.category}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(e.date, "d MMM yyyy")}
                    {e.vendor ? ` · ${e.vendor}` : ""}
                  </p>
                </div>
                <p className="tabular text-sm font-semibold">{money(e.amount, business.currency)}</p>
              </button>
            </li>
          ))}
        </ul>
      )}
      <BottomSheet
        open={open}
        onOpenChange={setOpen}
        title={editing ? "Edit expense" : "New expense"}
        footer={
          <div className="space-y-2">
            <Button className="w-full" onClick={save}>
              Save
            </Button>
            {editing ? (
              <Button variant="ghost" className="w-full text-danger" onClick={() => setConfirm(editing.id)}>
                Delete
              </Button>
            ) : null}
          </div>
        }
      >
        <div className="space-y-3">
          <Field label="Category">
            <Select value={category} onChange={(e) => setCategory(e.target.value)}>
              {cats.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
          <div className="flex gap-2">
            <Input value={newCat} onChange={(e) => setNewCat(e.target.value)} placeholder="Custom category" />
            <Button
              variant="secondary"
              onClick={() => {
                try {
                  apply(addExpenseCategory(useAppStore.getState().db, business.id, newCat));
                  setCategory(newCat.trim());
                  setNewCat("");
                  toast.success("Category added");
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : "Could not add");
                }
              }}
            >
              Add
            </Button>
          </div>
          <Field label="Amount">
            <Input type="number" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </Field>
          <Field label="Date">
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label="Vendor">
            <Input value={vendor} onChange={(e) => setVendor(e.target.value)} />
          </Field>
          <Field label="Notes">
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
          </Field>
        </div>
      </BottomSheet>
      <BottomSheet
        open={!!confirm}
        onOpenChange={() => setConfirm(null)}
        title="Delete expense?"
        footer={
          <ConfirmBar
            danger
            confirmLabel="Delete"
            onCancel={() => setConfirm(null)}
            onConfirm={() => {
              apply(deleteExpense(useAppStore.getState().db, confirm!));
              toast.success("Expense removed");
              setConfirm(null);
              setOpen(false);
            }}
          />
        }
      >
        <p className="text-sm text-muted-foreground">This changes net profit for the period.</p>
      </BottomSheet>
    </AppPage>
  );
}
