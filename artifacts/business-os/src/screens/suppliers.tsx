import * as React from "react";
import { toast } from "sonner";
import { AppPage, ConfirmBar, PageHeader, SearchField } from "@/components/app-shell";
import { BottomSheet } from "@/components/sheet";
import { Badge, Button, Card, EmptyState, Field, Input, Segmented, Select, Stat, Textarea } from "@/components/ui";
import type { Supplier, SupplierStatus } from "@/lib/domain";
import { money } from "@/lib/format";
import { deleteSupplier, upsertSupplier } from "@/lib/services";
import { useAppStore, useBusiness } from "@/lib/store";

type Draft = {
  name: string;
  contactName: string;
  email: string;
  phone: string;
  address: string;
  taxId: string;
  notes: string;
  status: SupplierStatus;
};
const blankDraft = (): Draft => ({
  name: "",
  contactName: "",
  email: "",
  phone: "",
  address: "",
  taxId: "",
  notes: "",
  status: "active",
});

export function SuppliersScreen() {
  const business = useBusiness();
  const db = useAppStore((state) => state.db);
  const apply = useAppStore((state) => state.apply);
  const [query, setQuery] = React.useState("");
  const [filter, setFilter] = React.useState<"all" | SupplierStatus>("all");
  const [editing, setEditing] = React.useState<Supplier | null>(null);
  const [draft, setDraft] = React.useState<Draft>(blankDraft);
  const [formOpen, setFormOpen] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState<Supplier | null>(null);

  if (!business) return null;
  const suppliers = db.suppliers.filter((supplier) => supplier.businessId === business.id);
  const purchases = db.purchases.filter((purchase) => purchase.businessId === business.id);
  const outstandingBySupplier = new Map<string, number>();
  for (const purchase of purchases) {
    outstandingBySupplier.set(
      purchase.supplierId,
      (outstandingBySupplier.get(purchase.supplierId) ?? 0) + purchase.balance,
    );
  }
  const search = query.trim().toLowerCase();
  const list = suppliers
    .filter((supplier) => filter === "all" || supplier.status === filter)
    .filter((supplier) =>
      !search ||
      [supplier.name, supplier.contactName, supplier.email, supplier.phone, supplier.taxId]
        .some((value) => value?.toLowerCase().includes(search)),
    )
    .sort((a, b) => a.name.localeCompare(b.name));

  function startNew() {
    setEditing(null);
    setDraft(blankDraft());
    setFormOpen(true);
  }

  function startEdit(supplier: Supplier) {
    setEditing(supplier);
    setDraft({
      name: supplier.name,
      contactName: supplier.contactName ?? "",
      email: supplier.email ?? "",
      phone: supplier.phone ?? "",
      address: supplier.address ?? "",
      taxId: supplier.taxId ?? "",
      notes: supplier.notes ?? "",
      status: supplier.status,
    });
    setFormOpen(true);
  }

  function save() {
    try {
      const result = upsertSupplier(useAppStore.getState().db, {
        ...draft,
        id: editing?.id,
        businessId: business.id,
      });
      apply(result.db);
      toast.success(editing ? "Supplier updated" : "Supplier added");
      setFormOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save supplier");
    }
  }

  function removeSupplier() {
    if (!deleteTarget) return;
    try {
      apply(deleteSupplier(useAppStore.getState().db, deleteTarget.id));
      toast.success("Supplier deleted");
      setDeleteTarget(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete supplier");
      setDeleteTarget(null);
    }
  }

  return (
    <AppPage>
      <PageHeader
        title="Suppliers"
        subtitle="Supplier contacts, purchase history and outstanding balances"
        action={<Button size="sm" onClick={startNew}>Add supplier</Button>}
      />
      <div className="mb-4 grid grid-cols-2 gap-2">
        <Card><Stat label="Total suppliers" value={String(suppliers.length)} /></Card>
        <Card><Stat label="Active suppliers" value={String(suppliers.filter((supplier) => supplier.status === "active").length)} /></Card>
      </div>
      <SearchField value={query} onChange={setQuery} placeholder="Search name, contact, phone or tax ID" />
      <div className="mb-3">
        <Segmented
          value={filter}
          onChange={(value) => setFilter(value as typeof filter)}
          options={[
            { id: "all", label: "All" },
            { id: "active", label: "Active" },
            { id: "inactive", label: "Inactive" },
          ]}
        />
      </div>
      {suppliers.length === 0 ? (
        <EmptyState
          title="No suppliers yet"
          body="Add supplier contacts before recording goods received or supplier payments."
          action={<Button onClick={startNew}>Add first supplier</Button>}
        />
      ) : list.length === 0 ? (
        <EmptyState title="No matching suppliers" body="Try another search or status filter." />
      ) : (
        <ul className="space-y-2">
          {list.map((supplier) => {
            const supplierPurchases = purchases.filter((purchase) => purchase.supplierId === supplier.id);
            const outstanding = outstandingBySupplier.get(supplier.id) ?? 0;
            return (
              <li key={supplier.id}>
                <Card className="space-y-3">
                  <button type="button" className="w-full text-left" onClick={() => startEdit(supplier)}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate font-semibold">{supplier.name}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {supplier.contactName || "No contact person"}
                          {supplier.taxId ? ` · ${supplier.taxId}` : ""}
                        </p>
                      </div>
                      <Badge tone={supplier.status === "active" ? "good" : "neutral"}>{supplier.status}</Badge>
                    </div>
                  </button>
                  <div className="grid grid-cols-2 gap-2 border-t border-border pt-3">
                    <div>
                      <p className="text-xs text-muted-foreground">Purchases</p>
                      <p className="mt-1 text-sm font-semibold tabular">{supplierPurchases.length}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Outstanding</p>
                      <p className="mt-1 text-sm font-semibold tabular">{money(outstanding, business.currency)}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0 text-xs text-muted-foreground">
                      {supplier.phone || supplier.email || "No contact details"}
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="secondary" onClick={() => startEdit(supplier)}>Edit</Button>
                      <Button size="sm" variant="ghost" className="text-danger" onClick={() => setDeleteTarget(supplier)}>Delete</Button>
                    </div>
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      )}

      <BottomSheet
        open={formOpen}
        onOpenChange={setFormOpen}
        title={editing ? "Edit supplier" : "New supplier"}
        description="Keep the contact and tax details used on purchase records."
        footer={
          <Button block className="w-full" onClick={save}>
            {editing ? "Save changes" : "Save supplier"}
          </Button>
        }
      >
        <div className="space-y-3">
          <Field label="Supplier / company name">
            <Input autoFocus value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} placeholder="Supplier name" />
          </Field>
          <Field label="Contact person">
            <Input value={draft.contactName} onChange={(event) => setDraft({ ...draft, contactName: event.target.value })} />
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Phone">
              <Input value={draft.phone} onChange={(event) => setDraft({ ...draft, phone: event.target.value })} inputMode="tel" />
            </Field>
            <Field label="Email">
              <Input value={draft.email} onChange={(event) => setDraft({ ...draft, email: event.target.value })} inputMode="email" />
            </Field>
          </div>
          <Field label="GSTIN / Tax ID">
            <Input value={draft.taxId} onChange={(event) => setDraft({ ...draft, taxId: event.target.value.toUpperCase() })} />
          </Field>
          <Field label="Address">
            <Textarea rows={2} value={draft.address} onChange={(event) => setDraft({ ...draft, address: event.target.value })} />
          </Field>
          <Field label="Notes">
            <Textarea rows={2} value={draft.notes} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} />
          </Field>
          <Field label="Status">
            <Select value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value as SupplierStatus })}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </Select>
          </Field>
        </div>
      </BottomSheet>

      <BottomSheet
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete supplier?"
        description="Suppliers with purchase history cannot be deleted."
        footer={
          <ConfirmBar
            danger
            confirmLabel="Delete supplier"
            onCancel={() => setDeleteTarget(null)}
            onConfirm={removeSupplier}
          />
        }
      >
        <p className="text-sm text-muted-foreground">
          {deleteTarget ? `Delete ${deleteTarget.name}? If purchases exist, mark the supplier inactive instead to keep the financial history intact.` : ""}
        </p>
      </BottomSheet>
    </AppPage>
  );
}
