import * as React from "react";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { AppPage, ConfirmBar, PageHeader, SearchField } from "@/components/app-shell";
import { SavedViewControls } from "@/components/saved-view-controls";
import { BottomSheet } from "@/components/sheet";
import { Badge, Button, EmptyState, Field, Input, Select, Textarea, Segmented } from "@/components/ui";
import type { Customer } from "@/lib/domain";
import { downloadCsv } from "@/lib/csv";
import { customerStats } from "@/lib/engines";
import { formatDate, money } from "@/lib/format";
import { addCustomerNote, archiveCustomer, upsertCustomer } from "@/lib/services";
import { useAppStore, useBusiness } from "@/lib/store";

const SEG: Record<string, { label: string; tone: "neutral" | "good" | "warn" | "brand" }> = {
  new: { label: "New", tone: "neutral" },
  active: { label: "Active", tone: "good" },
  high_value: { label: "High value", tone: "brand" },
  inactive: { label: "Inactive", tone: "warn" },
  follow_up: { label: "Follow up", tone: "warn" },
};

export function CustomersScreen() {
  const business = useBusiness();
  const db = useAppStore((s) => s.db);
  const apply = useAppStore((s) => s.apply);
  const [q, setQ] = React.useState("");
  const [segment, setSegment] = React.useState("all");
  const [editing, setEditing] = React.useState<Partial<Customer> | "new" | null>(null);
  const [view, setView] = React.useState<Customer | null>(null);
  const [note, setNote] = React.useState("");
  const [confirm, setConfirm] = React.useState(false);
  const [archiveFilter, setArchiveFilter] = React.useState<"active" | "archived" | "all">("active");

  if (!business) return null;
  const customers = db.customers.filter((c) => c.businessId === business.id);
  const list = customers
    .filter((customer) => archiveFilter === "all" || (archiveFilter === "archived" ? customer.archived : !customer.archived))
    .map((c) => customerStats(db, c))
    .filter((s) => {
      const t = q.toLowerCase();
      const matchesQuery = !t || s.customer.name.toLowerCase().includes(t) || s.customer.phone?.includes(t) || s.customer.email?.toLowerCase().includes(t);
      const matchesSegment = segment === "all" || s.segment === segment;
      return matchesQuery && matchesSegment;
    });

  const form = editing === "new" ? { name: "", email: "", phone: "", notes: "" } : editing;

  function exportCustomers() {
    downloadCsv("business-sutra-customers.csv",
      ["Name", "Email", "Phone", "Address", "GSTIN", "Orders", "Spend", "Last purchase", "Segment", "Notes"],
      list.map((entry) => [entry.customer.name, entry.customer.email, entry.customer.phone, entry.customer.address, entry.customer.gstin, entry.orders, entry.spend, entry.lastPurchase, entry.segment, entry.customer.notes]));
    toast.success("Exported " + list.length + " customers");
  }

  return (
    <AppPage>
      <PageHeader
        title="Customers"
        subtitle={`${customers.filter((customer) => !customer.archived).length} active · ${customers.filter((customer) => customer.archived).length} archived`}
        action={<div className="flex gap-2"><Button size="sm" variant="secondary" onClick={exportCustomers} disabled={!list.length}><Download className="size-4" />Export</Button><Button size="sm" onClick={() => setEditing("new")}>Add</Button></div>}
      />
      <SearchField value={q} onChange={setQ} placeholder="Search customers" />
      <SavedViewControls businessId={business.id} moduleKey="customers" filters={{ q, segment }} onApply={(saved) => {
        setQ(saved.q ?? "");
        setSegment(saved.segment ?? "all");
      }} />
      <div className="mb-3">
        <Segmented value={archiveFilter} onChange={(value) => setArchiveFilter(value as typeof archiveFilter)} options={[
          { id: "active", label: "Active" },
          { id: "archived", label: "Archived" },
          { id: "all", label: "All" },
        ]} />
      </div>
      <div className="mb-3">
        <Select value={segment} onChange={(event) => setSegment(event.target.value)} className="w-full sm:w-auto">
          <option value="all">All customer segments</option>
          <option value="new">New</option>
          <option value="active">Active</option>
          <option value="high_value">High value</option>
          <option value="inactive">Inactive</option>
          <option value="follow_up">Follow up</option>
        </Select>
      </div>
      {customers.length === 0 ? (
        <EmptyState
          title="No customers yet"
          body="Add a customer, or attach one when you complete a sale. History and spend are calculated from real orders."
          action={<Button onClick={() => setEditing("new")}>Add customer</Button>}
        />
      ) : list.length === 0 ? (
        <EmptyState title="No matching customers" body="Try a different name, phone or email." />
      ) : (
        <ul className="space-y-2">
          {list.map((s) => (
            <li key={s.customer.id}>
              <button type="button" className="flex w-full items-center justify-between rounded-[var(--radius-xl)] border border-border bg-card p-3 text-left" onClick={() => setView(s.customer)}>
                <div className="min-w-0">
                  <p className="truncate font-medium">{s.customer.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {s.orders} orders · {money(s.spend, business.currency)}
                  </p>
                </div>
                <Badge tone={SEG[s.segment].tone}>{SEG[s.segment].label}</Badge>
              </button>
            </li>
          ))}
        </ul>
      )}

      {view ? (
        <CustomerSheet
          customer={view}
          onClose={() => setView(null)}
          onEdit={() => {
            setEditing(view);
            setView(null);
          }}
          onDelete={() => setConfirm(true)}
          note={note}
          setNote={setNote}
          onNote={() => {
            try {
              apply(addCustomerNote(useAppStore.getState().db, business.id, view.id, note));
              setNote("");
              toast.success("Note added");
            } catch (e) {
              toast.error(e instanceof Error ? e.message : "Could not add note");
            }
          }}
        />
      ) : null}

      {form && editing ? (
        <BottomSheet
          open
          onOpenChange={(o) => !o && setEditing(null)}
          title={editing === "new" ? "New customer" : "Edit customer"}
          footer={
            <Button
              className="w-full"
              onClick={() => {
                const el = document.getElementById("cus-name") as HTMLInputElement | null;
                const name = (document.getElementById("cus-name") as HTMLInputElement).value;
                const email = (document.getElementById("cus-email") as HTMLInputElement).value;
                const phone = (document.getElementById("cus-phone") as HTMLInputElement).value;
                const notes = (document.getElementById("cus-notes") as HTMLTextAreaElement).value;
                try {
                  const result = upsertCustomer(useAppStore.getState().db, {
                    id: editing === "new" ? undefined : (editing as Customer).id,
                    businessId: business.id,
                    name,
                    email,
                    phone,
                    notes,
                  });
                  apply(result.db);
                  toast.success("Customer saved");
                  setEditing(null);
                  void el;
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : "Could not save");
                }
              }}
            >
              Save
            </Button>
          }
        >
          <div className="space-y-3">
            <Field label="Name">
              <Input id="cus-name" defaultValue={form.name} />
            </Field>
            <Field label="Phone">
              <Input id="cus-phone" defaultValue={form.phone} inputMode="tel" />
            </Field>
            <Field label="Email">
              <Input id="cus-email" defaultValue={form.email} inputMode="email" />
            </Field>
            <Field label="Notes">
              <Textarea id="cus-notes" defaultValue={form.notes} />
            </Field>
          </div>
        </BottomSheet>
      ) : null}

      <BottomSheet
        open={confirm}
        onOpenChange={setConfirm}
        title={view?.archived ? "Restore customer?" : "Archive customer?"}
        footer={
          <ConfirmBar
            danger
            confirmLabel={view?.archived ? "Restore" : "Archive"}
            onCancel={() => setConfirm(false)}
            onConfirm={() => {
              if (!view) return;
              apply(archiveCustomer(useAppStore.getState().db, view.id, !view.archived));
              toast.success(view.archived ? "Customer restored" : "Customer archived");
              setConfirm(false);
              setView(null);
            }}
          />
        }
      >
        <p className="text-sm text-muted-foreground">Archived customers stay linked to sales, invoices, notes and lead records. You can restore them later.</p>
      </BottomSheet>
    </AppPage>
  );
}

function CustomerSheet({
  customer,
  onClose,
  onEdit,
  onDelete,
  note,
  setNote,
  onNote,
}: {
  customer: Customer;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  note: string;
  setNote: (v: string) => void;
  onNote: () => void;
}) {
  const business = useBusiness()!;
  const db = useAppStore((s) => s.db);
  const stats = customerStats(db, customer);
  const sales = db.sales.filter((s) => s.customerId === customer.id);
  const activity = db.activity.filter((a) => a.customerId === customer.id);
  return (
    <BottomSheet
      open
      onOpenChange={(o) => !o && onClose()}
      title={customer.name}
      description={[customer.phone, customer.email].filter(Boolean).join(" · ") || "No contact details"}
      footer={
        <div className="grid grid-cols-2 gap-2">
          <Button variant="secondary" onClick={onEdit}>
            Edit
          </Button>
          <Button variant="ghost" className="text-danger" onClick={onDelete}>
            {customer.archived ? "Restore" : "Archive"}
          </Button>
        </div>
      }
    >
      <div className="grid grid-cols-2 gap-3">
        <p className="text-xs text-subtle">Total spend</p>
        <p className="text-right tabular text-sm font-semibold">{money(stats.spend, business.currency)}</p>
        <p className="text-xs text-subtle">Orders</p>
        <p className="text-right tabular text-sm">{stats.orders}</p>
        <p className="text-xs text-subtle">Last purchase</p>
        <p className="text-right text-sm">{stats.lastPurchase ? formatDate(stats.lastPurchase, "d MMM yyyy") : "Never"}</p>
        <p className="text-xs text-subtle">Outstanding</p>
        <p className="text-right tabular text-sm">{money(stats.outstanding, business.currency)}</p>
        <p className="text-xs text-subtle">Segment</p>
        <p className="text-right text-sm">{SEG[stats.segment].label}</p>
      </div>
      {customer.notes ? <p className="mt-3 text-sm text-muted-foreground">{customer.notes}</p> : null}
      <p className="mt-4 text-xs font-medium uppercase tracking-wide text-subtle">Purchase history</p>
      {sales.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">No sales attached to this customer yet.</p>
      ) : (
        <ul className="mt-2 space-y-2">
          {sales.slice(0, 12).map((s) => (
            <li key={s.id} className="flex justify-between text-sm">
              <span>{formatDate(s.createdAt)}</span>
              <span className="tabular">{money(s.total, business.currency)}</span>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-4 text-xs font-medium uppercase tracking-wide text-subtle">Activity</p>
      <ul className="mt-2 space-y-2">
        {activity.slice(0, 10).map((a) => (
          <li key={a.id} className="text-sm">
            <span className="text-muted-foreground">{formatDate(a.createdAt)} · </span>
            {a.message}
          </li>
        ))}
      </ul>
      <Field label="Add note">
        <div className="mt-3 flex gap-2">
          <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Follow-up, preference…" />
          <Button onClick={onNote}>Add</Button>
        </div>
      </Field>
    </BottomSheet>
  );
}
