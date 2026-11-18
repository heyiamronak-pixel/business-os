import * as React from "react";
import { toast } from "sonner";
import { ArrowLeft, Check, FileText, Palette, Plus, Printer, Search, Settings2, Trash2 } from "lucide-react";
import { AppPage, PageHeader } from "@/components/app-shell";
import { Badge, Button, Card, Field, Input, Select, Switch, Textarea } from "@/components/ui";
import { DEFAULT_INVOICE_SETTINGS, type Business, type Customer, type InvoiceDesignSettings, type InvoiceRecord, type InvoiceSupplyType } from "@/lib/domain";
import { calculateInvoiceTotals, isValidGstin, nextInvoiceNumber, type InvoiceLineDraft } from "@/lib/invoice-utils";
import { money } from "@/lib/format";
import { createId } from "@/lib/utils";
import { useAppStore, useBusiness } from "@/lib/store";

type Mode = "list" | "create" | "view" | "template";
const todayLocal = () => { const d = new Date(); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10); };
const blankLine = (): InvoiceLineDraft => ({ id: createId("line"), description: "", hsnSac: "", quantity: "1", unit: "pcs", rate: "", discount: "0", taxRate: "18" });

export function InvoicesScreen() {
  const business = useBusiness();
  if (!business) return null;
  return <InvoicesWorkspace key={business.id} business={business} />;
}

function InvoicesWorkspace({ business }: { business: Business }) {
  const db = useAppStore((s) => s.db);
  const apply = useAppStore((s) => s.apply);
  const gstRegistered = Boolean(business.gstRegistered);
  const [mode, setMode] = React.useState<Mode>("list");
  const [search, setSearch] = React.useState("");
  const [customerFilter, setCustomerFilter] = React.useState("");
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [customerId, setCustomerId] = React.useState("");
  const [customerName, setCustomerName] = React.useState("");
  const [customerEmail, setCustomerEmail] = React.useState("");
  const [customerPhone, setCustomerPhone] = React.useState("");
  const [customerGstin, setCustomerGstin] = React.useState("");
  const [customerAddress, setCustomerAddress] = React.useState("");
  const [customerState, setCustomerState] = React.useState("");
  const [customerStateCode, setCustomerStateCode] = React.useState("");
  const [issueDate, setIssueDate] = React.useState(todayLocal());
  const [dueDate, setDueDate] = React.useState("");
  const [placeOfSupply, setPlaceOfSupply] = React.useState("");
  const [placeOfSupplyCode, setPlaceOfSupplyCode] = React.useState("");
  const [supplyType, setSupplyType] = React.useState<InvoiceSupplyType>("intra");
  const [reverseCharge, setReverseCharge] = React.useState(false);
  const [notes, setNotes] = React.useState("");
  const [lines, setLines] = React.useState<InvoiceLineDraft[]>([blankLine()]);
  const [formError, setFormError] = React.useState("");
  const currentSettings = business.invoiceSettings ?? DEFAULT_INVOICE_SETTINGS;
  const [settings, setSettings] = React.useState<InvoiceDesignSettings>(currentSettings);
  const totals = React.useMemo(() => calculateInvoiceTotals(lines, gstRegistered, supplyType), [lines, gstRegistered, supplyType]);

  React.useEffect(() => { setSettings(business.invoiceSettings ?? DEFAULT_INVOICE_SETTINGS); }, [business.id, business.invoiceSettings]);

  const customers = db.customers.filter((x) => x.businessId === business.id).sort((a, b) => a.name.localeCompare(b.name));
  const products = db.products.filter((x) => x.businessId === business.id && !x.archived).sort((a, b) => a.name.localeCompare(b.name));
  const invoices = db.invoices.filter((x) => x.businessId === business.id).sort((a, b) => b.issueDate.localeCompare(a.issueDate) || b.createdAt.localeCompare(a.createdAt));
  const selectedInvoice = invoices.find((x) => x.id === selectedId) ?? null;
  const filtered = invoices.filter((x) => (!customerFilter || x.customerId === customerFilter) && [x.invoiceNumber, x.customerName, x.customerGstin ?? ""].some((v) => v.toLowerCase().includes(search.toLowerCase())));
  const fmt = (value: number) => money(value, business.currency);

  function updateLine(id: string, patch: Partial<InvoiceLineDraft>) {
    setLines((current) => current.map((line) => line.id === id ? { ...line, ...patch } : line));
  }
  function openCreate() {
    setCustomerId(""); setCustomerName(""); setCustomerEmail(""); setCustomerPhone(""); setCustomerGstin(""); setCustomerAddress(""); setCustomerState(""); setCustomerStateCode("");
    const date = todayLocal(); setIssueDate(date);
    setDueDate(currentSettings.defaultDueDays > 0 ? new Date(new Date(date + "T00:00:00").getTime() + currentSettings.defaultDueDays * 86400000).toISOString().slice(0, 10) : "");
    setPlaceOfSupply(business.state ?? ""); setPlaceOfSupplyCode(business.stateCode ?? "");
    setSupplyType("intra"); setReverseCharge(false); setNotes(""); setLines([blankLine()]); setFormError(""); setSelectedId(null); setMode("create");
  }
  function chooseCustomer(id: string) {
    setCustomerId(id);
    const customer = customers.find((x) => x.id === id);
    setCustomerName(customer?.name ?? "");
    setCustomerEmail(customer?.email ?? "");
    setCustomerPhone(customer?.phone ?? "");
    setCustomerGstin(customer?.gstin ?? "");
    setCustomerAddress(customer?.address ?? "");
    setCustomerState(customer?.state ?? "");
    setCustomerStateCode(customer?.stateCode ?? "");
    setPlaceOfSupply(customer?.state ?? business.state ?? "");
    setPlaceOfSupplyCode(customer?.stateCode ?? business.stateCode ?? "");
  }
  function onRecipientState(value: string) { setCustomerState(value); setPlaceOfSupply(value); }
  function onRecipientCode(value: string) {
    const code = value.replace(/[^0-9]/g, "").slice(0, 2);
    setCustomerStateCode(code); setPlaceOfSupplyCode(code);
    if (business.stateCode && code) setSupplyType(business.stateCode === code ? "intra" : "inter");
  }
  function onProductChange(id: string, line: InvoiceLineDraft) {
    const product = products.find((x) => x.id === id);
    updateLine(line.id, product
      ? { productId: product.id, description: product.name, rate: String(product.sellingPrice), unit: product.unit }
      : { productId: undefined });
  }
  function saveInvoice() {
    setFormError("");
    if (!customerName.trim()) { setFormError("Add a customer or recipient name."); return; }
    if (!totals.items.length) { setFormError("Add at least one invoice line with a description and quantity."); return; }
    if (business.gstRegistered && !isValidGstin(business.gstin ?? "")) { setFormError("Update the seller GSTIN in Settings before creating a GST invoice."); return; }
    if (customerGstin.trim() && !isValidGstin(customerGstin)) { setFormError("Check the recipient GSTIN, or leave it blank."); return; }
    if (dueDate && dueDate < issueDate) { setFormError("Due date cannot be earlier than invoice date."); return; }
    if (business.gstRegistered && !placeOfSupply.trim()) { setFormError("Add the place of supply for this GST invoice."); return; }

    const currentDb = useAppStore.getState().db;
    const currentBusiness = currentDb.businesses.find((x) => x.id === business.id) ?? business;
    const design = currentBusiness.invoiceSettings ?? DEFAULT_INVOICE_SETTINGS;
    const number = nextInvoiceNumber(currentDb.invoices, business.id, design.prefix, issueDate);
    const now = new Date().toISOString();
    const matchedCustomer = currentDb.customers.find((customer) =>
      customer.businessId === business.id &&
      (customer.id === customerId || customer.name.trim().toLocaleLowerCase() === customerName.trim().toLocaleLowerCase())
    );
    const resolvedCustomerId = matchedCustomer?.id ?? createId("cus");
    const customerRecord: Customer = {
      ...(matchedCustomer ?? {}),
      id: resolvedCustomerId,
      businessId: business.id,
      name: customerName.trim(),
      email: customerEmail.trim() || undefined,
      phone: customerPhone.trim() || undefined,
      address: customerAddress.trim() || undefined,
      gstin: customerGstin.trim().toUpperCase() || undefined,
      state: customerState.trim() || undefined,
      stateCode: customerStateCode || undefined,
      createdAt: matchedCustomer?.createdAt ?? now,
      updatedAt: now,
    };
    const invoice: InvoiceRecord = {
      id: createId("inv"), businessId: business.id, invoiceNumber: number, status: "issued", issueDate, dueDate: dueDate || undefined,
      sellerName: currentBusiness.name, sellerLegalName: currentBusiness.legalName,
      sellerGstin: currentBusiness.gstRegistered ? currentBusiness.gstin : undefined,
      sellerAddress: [currentBusiness.address, currentBusiness.location, currentBusiness.state, currentBusiness.postalCode].filter(Boolean).join(", ") || undefined,
      sellerState: currentBusiness.state, sellerStateCode: currentBusiness.stateCode, sellerPhone: currentBusiness.phone, sellerEmail: currentBusiness.email,
      customerId: resolvedCustomerId, customerName: customerName.trim(), customerGstin: customerGstin.trim().toUpperCase() || undefined,
      customerAddress: customerAddress.trim() || undefined, customerState: customerState.trim() || undefined, customerStateCode: customerStateCode || undefined,
      customerPhone: customerPhone.trim() || undefined, customerEmail: customerEmail.trim() || undefined,
      placeOfSupply: placeOfSupply.trim() || customerState.trim() || currentBusiness.state || "",
      placeOfSupplyCode: placeOfSupplyCode || undefined, supplyType, reverseCharge,
      items: totals.items, subtotal: totals.subtotal, discountTotal: totals.discountTotal, taxableValue: totals.taxableValue,
      cgst: totals.cgst, sgst: totals.sgst, igst: totals.igst, taxTotal: totals.taxTotal, total: totals.total,
      notes: notes.trim() || undefined, terms: design.terms.trim() || undefined, createdAt: now, updatedAt: now,
    };
    if (currentDb.invoices.some((x) => x.businessId === business.id && x.invoiceNumber === number)) { setFormError("This invoice number already exists. Update the prefix in invoice format settings."); return; }
    const nextCustomers = matchedCustomer
      ? currentDb.customers.map((customer) => customer.id === matchedCustomer.id ? customerRecord : customer)
      : [...currentDb.customers, customerRecord];
    apply({ ...currentDb, customers: nextCustomers, invoices: [invoice, ...currentDb.invoices] });
    setSelectedId(invoice.id); setMode("view"); toast.success("Invoice saved to this workspace");
  }
  function saveDesign() {
    const prefix = settings.prefix.trim().toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, 4);
    if (!prefix) { toast.error("Choose a prefix with 1–4 letters or numbers."); return; }
    const next = { ...settings, prefix };
    const currentDb = useAppStore.getState().db;
    apply({ ...currentDb, businesses: currentDb.businesses.map((x) => x.id === business.id ? { ...x, invoiceSettings: next, updatedAt: new Date().toISOString() } : x) });
    setSettings(next); toast.success("Invoice format saved");
  }

  return (
    <AppPage>
      <PageHeader title="Invoices" subtitle="Create branded invoices and keep every customer's billing history." action={
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant={mode === "list" ? "secondary" : "ghost"} onClick={() => { setMode("list"); setSelectedId(null); }}>All invoices</Button>
          <Button size="sm" variant={mode === "template" ? "secondary" : "outline"} onClick={() => setMode("template")}><Palette className="size-4" />Format</Button>
          <Button size="sm" onClick={openCreate}><Plus className="size-4" />New invoice</Button>
        </div>
      } />

      {mode === "list" ? (
        <section className="animate-enter space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <Card className="border-0 bg-gradient-to-br from-[#142E43] to-[#176B73] text-white shadow-[0_14px_36px_rgba(17,63,76,.16)]"><p className="text-[11px] font-medium text-white/70">Invoices saved</p><p className="mt-2 text-3xl font-semibold tabular-nums">{invoices.length}</p><p className="mt-1 text-xs text-white/70">This workspace</p></Card>
            <Card className="card-lift"><p className="text-[11px] text-muted-foreground">Total invoiced</p><p className="mt-2 text-2xl font-semibold tabular-nums">{fmt(invoices.filter((x) => x.status === "issued").reduce((s, x) => s + x.total, 0))}</p><p className="mt-1 text-xs text-muted-foreground">Across saved invoices</p></Card>
            <Card className="card-lift"><p className="text-[11px] text-muted-foreground">Customers billed</p><p className="mt-2 text-2xl font-semibold tabular-nums">{new Set(invoices.map((x) => x.customerId ?? x.customerName)).size}</p><p className="mt-1 text-xs text-muted-foreground">Unique recipients</p></Card>
          </div>
          <Card className="animate-enter-delay-1 space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-sm font-semibold">Invoice history</h2><p className="mt-1 text-xs text-muted-foreground">Search and filter by customer, invoice number or GSTIN.</p></div><div className="grid w-full gap-2 sm:max-w-xl sm:grid-cols-[minmax(180px,.8fr)_minmax(220px,1fr)]"><Field label="Customer"><Select value={customerFilter} onChange={(e) => setCustomerFilter(e.target.value)}><option value="">All customers</option>{customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}</Select></Field><Field label="Search"><div className="relative"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" placeholder="Invoice no. / customer / GSTIN" /></div></Field></div></div>
            {filtered.length ? <div className="divide-y divide-border">{filtered.map((invoice) => <button type="button" key={invoice.id} onClick={() => { setSelectedId(invoice.id); setMode("view"); }} className="group flex w-full items-center gap-3 py-3 text-left transition-colors hover:bg-muted/35">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><FileText className="size-5" /></span>
              <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{invoice.customerName}</span><span className="mt-1 block truncate text-xs text-muted-foreground">{invoice.invoiceNumber} · {new Date(invoice.issueDate + "T00:00:00").toLocaleDateString("en-IN")}</span></span>
              <span className="hidden sm:block"><Badge tone={invoice.status === "issued" ? "good" : "warn"}>{invoice.status}</Badge></span>
              <span className="shrink-0 text-sm font-semibold tabular-nums">{fmt(invoice.total)}</span><span className="text-muted-foreground transition-transform group-hover:translate-x-1">›</span>
            </button>)}</div> : <div className="rounded-2xl border border-dashed border-border px-5 py-10 text-center"><span className="mx-auto grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary"><FileText className="size-6" /></span><h3 className="mt-4 text-base font-semibold">{search ? "No matching invoices" : "Your invoice book is ready"}</h3><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">{search ? "Try another invoice number or customer name." : "Set up your invoice format once, then create a customer invoice in a few steps. Saved invoices will appear here."}</p><div className="mt-4 flex justify-center gap-2"><Button variant="outline" onClick={() => setMode("template")}><Settings2 className="size-4" />Customise format</Button><Button onClick={openCreate}><Plus className="size-4" />Create invoice</Button></div></div>}
          </Card>
          <p className="text-[11px] leading-5 text-muted-foreground">Invoices are saved in this browser workspace. Download or print any saved invoice again from its detail view.</p>
        </section>
      ) : null}

      {mode === "template" ? (
        <section className="animate-enter grid gap-4 xl:grid-cols-[1fr_.9fr]">
          <Card className="space-y-4">
            <div><h2 className="text-base font-semibold">Your invoice identity</h2><p className="mt-1 text-xs leading-5 text-muted-foreground">Choose a reusable layout. Every new invoice will use these settings.</p></div>
            <Field label="Invoice number prefix"><Input value={settings.prefix} maxLength={4} onChange={(e) => setSettings((x) => ({ ...x, prefix: e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, 4) }))} placeholder="INV" /><span className="mt-1 text-[11px] text-muted-foreground">Example: INV/26-27/001 · Max 4 characters in prefix.</span></Field>
            <Field label="Layout style"><Select value={settings.template} onChange={(e) => setSettings((x) => ({ ...x, template: e.target.value as InvoiceDesignSettings["template"] }))}><option value="modern">Modern — premium accent bar</option><option value="classic">Classic — formal bordered layout</option><option value="minimal">Minimal — clean and compact</option></Select></Field>
            <Field label="Accent colour"><div className="flex items-center gap-3"><Input type="color" className="h-11 max-w-16 p-1" value={settings.accentColor} onChange={(e) => setSettings((x) => ({ ...x, accentColor: e.target.value }))} /><Input value={settings.accentColor} maxLength={7} onChange={(e) => setSettings((x) => ({ ...x, accentColor: e.target.value }))} /></div></Field>
            <Field label="Default due days"><Input type="number" min="0" max="365" value={settings.defaultDueDays} onChange={(e) => setSettings((x) => ({ ...x, defaultDueDays: Math.max(0, Math.min(365, Number(e.target.value) || 0)) }))} /><span className="mt-1 text-[11px] text-muted-foreground">0 means no due date will be added automatically.</span></Field>
            <div className="flex items-center justify-between rounded-xl bg-muted/45 p-3"><div><p className="text-sm font-medium">Show business logo</p><p className="text-xs text-muted-foreground">Uses the logo saved in your business profile.</p></div><Switch checked={settings.showLogo} onCheckedChange={(v) => setSettings((x) => ({ ...x, showLogo: v }))} label="Show business logo" /></div>
            <Field label="Footer message"><Input value={settings.footerNote} onChange={(e) => setSettings((x) => ({ ...x, footerNote: e.target.value }))} placeholder="Thank you for your business." /></Field>
            <Field label="Terms & conditions"><Textarea value={settings.terms} onChange={(e) => setSettings((x) => ({ ...x, terms: e.target.value }))} placeholder="Payment terms, delivery notes or other conditions..." rows={4} /></Field>
            <div className="flex flex-wrap gap-2"><Button onClick={saveDesign}><Check className="size-4" />Save invoice format</Button><Button variant="outline" onClick={() => setSettings(currentSettings)}>Reset unsaved changes</Button></div>
          </Card>
          <div className="space-y-3"><div className="flex items-center gap-2 text-sm font-semibold"><Palette className="size-4 text-primary" />Live style preview</div><div className="rounded-2xl bg-muted/50 p-3 sm:p-5"><div className={"invoice-paper mx-auto max-w-[520px] overflow-hidden rounded-xl bg-white text-slate-900 shadow-xl " + (settings.template === "classic" ? "border-2 border-slate-800" : "")}><div className="p-5" style={{ background: settings.template === "modern" ? settings.accentColor : "white", color: settings.template === "modern" ? "white" : "#17263A" }}><div className="flex items-start justify-between gap-3"><div className="flex items-center gap-2"><span className="grid size-10 place-items-center rounded-xl border border-current/20 text-xs font-bold">{business.name.slice(0, 1)}</span><div><p className="text-lg font-bold">{business.name}</p><p className="text-[10px] opacity-70">INVOICE</p></div></div><div className="text-right text-xs"><p className="font-semibold">INV/26-27/001</p><p className="mt-1 opacity-70">Sample preview</p></div></div></div><div className="p-5"><div className="grid grid-cols-2 gap-4 text-xs"><div><p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Billed to</p><p className="mt-2 font-semibold">Customer name</p></div><div className="text-right"><p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">From</p><p className="mt-2 font-semibold">{business.name}</p><p className="mt-1 text-slate-500">{business.gstin || "GSTIN not added"}</p></div></div><div className="my-5 border-t border-slate-200" /><div className="flex justify-between text-xs font-semibold"><span>Description</span><span>Amount</span></div><div className="mt-3 flex justify-between border-t border-slate-100 py-3 text-xs"><span>Sample item · 1 pcs</span><span>₹1,180.00</span></div><div className="ml-auto max-w-48 space-y-2 border-t border-slate-200 pt-3 text-xs"><div className="flex justify-between"><span className="text-slate-500">Taxable amount</span><span>₹1,000.00</span></div><div className="flex justify-between"><span className="text-slate-500">GST</span><span>₹180.00</span></div><div className="flex justify-between border-t pt-2 text-sm font-bold"><span>Total</span><span style={{ color: settings.accentColor }}>₹1,180.00</span></div></div><p className="mt-8 border-t border-slate-100 pt-4 text-center text-[10px] text-slate-500">{settings.footerNote || "Thank you for your business."}</p></div></div></div><p className="text-xs leading-5 text-muted-foreground">Template settings apply to invoices created after saving. Existing invoices keep their saved seller and customer details.</p></div>
        </section>
      ) : null}

      {mode === "create" ? (
        <section className="animate-enter space-y-4">
          <div className="flex items-center justify-between gap-3"><Button size="sm" variant="ghost" onClick={() => setMode("list")}><ArrowLeft className="size-4" />Back to invoices</Button><Badge tone={business.gstRegistered ? "good" : "neutral"}>{business.gstRegistered ? "GST enabled" : "Non-GST invoice"}</Badge></div>
          <Card className="space-y-4">
            <div className="flex items-center justify-between"><div><h2 className="text-base font-semibold">Create invoice</h2><p className="mt-1 text-xs text-muted-foreground">Add recipient and items. The invoice number is assigned when you save.</p></div><FileText className="size-6 text-primary" /></div>
            <div className="grid gap-3 sm:grid-cols-2"><Field label="Invoice date"><Input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} /></Field><Field label="Due date (optional)"><Input type="date" min={issueDate} value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></Field></div>
            <div className="grid gap-4 lg:grid-cols-2">
              <section className="rounded-xl border border-border p-3 sm:p-4"><h3 className="mb-3 text-sm font-semibold">From · Your business</h3><p className="text-sm font-semibold">{business.legalName || business.name}</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{[business.address, business.location, business.state, business.postalCode].filter(Boolean).join(", ") || "Add billing address in Settings → GST & invoice profile."}</p>{business.gstRegistered ? <p className="mt-2 text-xs font-medium">GSTIN: {business.gstin}</p> : <p className="mt-2 text-xs text-muted-foreground">GST registration not added.</p>}<Button size="sm" variant="ghost" className="mt-2 px-0" onClick={() => setMode("template")}>Customise invoice format</Button></section>
              <section className="space-y-3 rounded-xl border border-border p-3 sm:p-4"><h3 className="text-sm font-semibold">Bill to · Customer</h3><Field label="Select existing customer"><Select value={customerId} onChange={(e) => chooseCustomer(e.target.value)}><option value="">Enter customer manually</option>{customers.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</Select></Field><Field label="Customer / company name"><Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Customer name" /></Field><div className="grid grid-cols-2 gap-2"><Field label="Phone"><Input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} /></Field><Field label="Email"><Input value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} /></Field></div><Field label="Customer GSTIN (optional)"><Input value={customerGstin} maxLength={15} onChange={(e) => setCustomerGstin(e.target.value.toUpperCase().replace(/\s/g, ""))} placeholder="If registered" /></Field><Field label="Billing address"><Input value={customerAddress} onChange={(e) => setCustomerAddress(e.target.value)} placeholder="Street, city, postal code" /></Field><div className="grid grid-cols-2 gap-2"><Field label="State"><Input value={customerState} onChange={(e) => onRecipientState(e.target.value)} /></Field><Field label="State code"><Input value={customerStateCode} maxLength={2} onChange={(e) => onRecipientCode(e.target.value)} placeholder="e.g. 08" /></Field></div></section>
            </div>
          </Card>
          <Card className="space-y-4">
            <div className="flex items-center justify-between gap-2"><div><h3 className="text-sm font-semibold">Invoice items</h3><p className="mt-1 text-xs text-muted-foreground">Pick a saved product or type a custom line.</p></div><Button size="sm" variant="outline" onClick={() => setLines((x) => [...x, blankLine()])}><Plus className="size-4" />Add item</Button></div>
            <div className="space-y-3">{lines.map((line, index) => <div key={line.id} className="rounded-xl border border-border bg-muted/20 p-3">
              <div className="mb-3 flex items-center justify-between"><p className="text-xs font-semibold">Item {index + 1}</p><Button size="icon" variant="ghost" aria-label="Remove item" disabled={lines.length === 1} onClick={() => setLines((x) => x.filter((item) => item.id !== line.id))}><Trash2 className="size-4" /></Button></div>
              <Field label="Select product (optional)"><Select value={line.productId ?? ""} onChange={(e) => onProductChange(e.target.value, line)}><option value="">Custom description</option>{products.map((p) => <option key={p.id} value={p.id}>{p.name} · {p.sku}</option>)}</Select></Field>
              <div className="mt-3 grid gap-2 sm:grid-cols-[1.5fr_.8fr]"><Field label="Description"><Input value={line.description} onChange={(e) => updateLine(line.id, { description: e.target.value })} placeholder="Product or service" /></Field><Field label="HSN / SAC"><Input value={line.hsnSac} onChange={(e) => updateLine(line.id, { hsnSac: e.target.value })} placeholder="Code" /></Field></div>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4"><Field label="Qty"><Input type="number" min="0.01" step="0.01" value={line.quantity} onChange={(e) => updateLine(line.id, { quantity: e.target.value })} /></Field><Field label="Unit"><Input value={line.unit} onChange={(e) => updateLine(line.id, { unit: e.target.value })} /></Field><Field label="Rate"><Input type="number" min="0" step="0.01" value={line.rate} onChange={(e) => updateLine(line.id, { rate: e.target.value })} /></Field><Field label="Discount"><Input type="number" min="0" step="0.01" value={line.discount} onChange={(e) => updateLine(line.id, { discount: e.target.value })} /></Field></div>
              {business.gstRegistered ? <div className="mt-3 grid grid-cols-2 gap-2"><Field label="GST rate (%)"><Select value={line.taxRate} onChange={(e) => updateLine(line.id, { taxRate: e.target.value })}>{["0", "5", "12", "18", "28"].map((v) => <option key={v} value={v}>{v}%</option>)}</Select></Field><div className="self-end rounded-lg bg-card px-3 py-2 text-xs text-muted-foreground">Taxable value <strong className="ml-1 text-foreground">{fmt(Math.max(0, Number(line.quantity || 0) * Number(line.rate || 0) - Number(line.discount || 0)))}</strong></div></div> : <p className="mt-3 text-[11px] text-muted-foreground">GST fields are hidden because this business is marked as not GST registered.</p>}
            </div>)}</div>
          </Card>
          <Card className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2"><Field label="Place of supply"><Input value={placeOfSupply} onChange={(e) => setPlaceOfSupply(e.target.value)} placeholder="State / territory" /></Field><Field label="Place of supply code"><Input value={placeOfSupplyCode} maxLength={2} onChange={(e) => setPlaceOfSupplyCode(e.target.value.replace(/[^0-9]/g, "").slice(0, 2))} placeholder="e.g. 08" /></Field></div>
            {business.gstRegistered ? <div className="grid gap-3 sm:grid-cols-2"><Field label="Supply type"><Select value={supplyType} onChange={(e) => setSupplyType(e.target.value as InvoiceSupplyType)}><option value="intra">Within same state (CGST + SGST)</option><option value="inter">Inter-state (IGST)</option></Select></Field><div className="flex items-center justify-between rounded-xl bg-muted/40 p-3"><div><p className="text-xs font-medium">Reverse charge</p><p className="text-[10px] text-muted-foreground">Mark if applicable</p></div><Switch checked={reverseCharge} onCheckedChange={setReverseCharge} label="Reverse charge" /></div></div> : null}
            <Field label="Notes (optional)"><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Additional details for this invoice" /></Field>
            <div className="rounded-2xl bg-[#142E43] p-4 text-white"><div className="mb-3 flex items-center justify-between"><h3 className="text-sm font-semibold">Invoice summary</h3><span className="text-[10px] text-white/60">Live calculation</span></div><div className="space-y-2 text-xs"><div className="flex justify-between text-white/70"><span>Subtotal</span><span>{fmt(totals.subtotal)}</span></div><div className="flex justify-between text-white/70"><span>Discount</span><span>−{fmt(totals.discountTotal)}</span></div><div className="flex justify-between text-white/70"><span>Taxable value</span><span>{fmt(totals.taxableValue)}</span></div>{business.gstRegistered ? <><div className="flex justify-between text-white/70"><span>CGST</span><span>{fmt(totals.cgst)}</span></div><div className="flex justify-between text-white/70"><span>SGST</span><span>{fmt(totals.sgst)}</span></div><div className="flex justify-between text-white/70"><span>IGST</span><span>{fmt(totals.igst)}</span></div></> : null}<div className="flex justify-between border-t border-white/15 pt-3 text-base font-semibold"><span>Total due</span><span>{fmt(totals.total)}</span></div></div></div>
            {formError ? <p role="alert" className="text-xs font-semibold text-danger">{formError}</p> : null}
            <div className="flex flex-wrap justify-end gap-2"><Button variant="outline" onClick={() => setMode("list")}>Cancel</Button><Button onClick={saveInvoice} disabled={!totals.items.length}><Check className="size-4" />Save invoice</Button></div>
          </Card>
          <p className="text-[11px] leading-5 text-muted-foreground">This invoice builder records details and calculates entered GST rates. It does not validate tax classification, submit GST returns, generate IRN/e-invoices or replace professional tax/accounting review.</p>
        </section>
      ) : null}

      {mode === "view" && selectedInvoice ? (
        <section className="animate-enter space-y-4">
          <div className="no-print flex flex-wrap items-center justify-between gap-2"><Button size="sm" variant="ghost" onClick={() => setMode("list")}><ArrowLeft className="size-4" />All invoices</Button><div className="flex gap-2"><Button size="sm" variant="outline" onClick={() => setMode("template")}><Palette className="size-4" />Format settings</Button><Button size="sm" onClick={() => window.print()}><Printer className="size-4" />Print / Save PDF</Button></div></div>
          <InvoicePaper invoice={selectedInvoice} settings={currentSettings} currency={business.currency} logo={business.logoDataUrl} />
          <p className="no-print text-center text-[11px] leading-5 text-muted-foreground">Choose “Save as PDF” in your browser's print dialog to create a PDF copy.</p>
        </section>
      ) : null}
    </AppPage>
  );
}

function InvoicePaper({ invoice, settings, currency, logo }: { invoice: InvoiceRecord; settings: InvoiceDesignSettings; currency: string; logo?: string }) {
  const accent = settings.accentColor || "#176B73";
  const classic = settings.template === "classic";
  const minimal = settings.template === "minimal";
  return <article id="invoice-print-root" className={"invoice-paper mx-auto w-full max-w-[850px] overflow-hidden rounded-2xl border bg-white text-slate-900 shadow-[0_18px_50px_rgba(19,43,61,.12)] " + (classic ? "border-2 border-slate-800" : "")}>
    <div className="p-6 sm:p-10" style={settings.template === "modern" ? { borderTop: "7px solid " + accent } : {}}>
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div className="flex min-w-0 items-center gap-3">{settings.showLogo && logo ? <img src={logo} alt="" className="size-14 rounded-xl object-contain" /> : null}<div><p className="text-xl font-bold tracking-tight">{invoice.sellerLegalName || invoice.sellerName}</p><p className="mt-1 text-xs font-semibold uppercase tracking-[.2em]" style={{ color: accent }}>Invoice</p><p className="mt-2 max-w-sm text-xs leading-5 text-slate-500">{invoice.sellerAddress || "Business address not provided"}</p>{invoice.sellerPhone ? <p className="text-xs text-slate-500">Phone: {invoice.sellerPhone}</p> : null}{invoice.sellerEmail ? <p className="text-xs text-slate-500">{invoice.sellerEmail}</p> : null}{invoice.sellerGstin ? <p className="mt-2 text-xs font-semibold">GSTIN: {invoice.sellerGstin}</p> : null}</div></div>
        <div className="min-w-[175px] text-left sm:text-right"><p className="text-[10px] font-bold uppercase tracking-[.18em] text-slate-400">Invoice number</p><p className="mt-1 text-lg font-bold">{invoice.invoiceNumber}</p><p className="mt-3 text-xs text-slate-500">Invoice date · {new Date(invoice.issueDate + "T00:00:00").toLocaleDateString("en-IN")}</p>{invoice.dueDate ? <p className="mt-1 text-xs text-slate-500">Due date · {new Date(invoice.dueDate + "T00:00:00").toLocaleDateString("en-IN")}</p> : null}<p className="mt-2 text-xs font-semibold uppercase" style={{ color: accent }}>{invoice.status}</p></div>
      </div>
      <div className="my-7 border-t border-slate-200" />
      <div className="grid gap-6 sm:grid-cols-2">
        <div><p className="text-[10px] font-bold uppercase tracking-[.18em] text-slate-400">Bill to</p><p className="mt-2 text-sm font-semibold">{invoice.customerName}</p>{invoice.customerAddress ? <p className="mt-1 text-xs leading-5 text-slate-500">{invoice.customerAddress}</p> : null}{invoice.customerState ? <p className="text-xs text-slate-500">{invoice.customerState}</p> : null}{invoice.customerPhone ? <p className="mt-1 text-xs text-slate-500">{invoice.customerPhone}</p> : null}{invoice.customerEmail ? <p className="text-xs text-slate-500">{invoice.customerEmail}</p> : null}{invoice.customerGstin ? <p className="mt-2 text-xs font-semibold">GSTIN: {invoice.customerGstin}</p> : null}</div>
        <div className="sm:text-right"><p className="text-[10px] font-bold uppercase tracking-[.18em] text-slate-400">Supply details</p><p className="mt-2 text-xs text-slate-600">Place of supply: {invoice.placeOfSupply || "—"} {invoice.placeOfSupplyCode ? "(" + invoice.placeOfSupplyCode + ")" : ""}</p><p className="mt-1 text-xs text-slate-600">Supply type: {invoice.supplyType === "intra" ? "Intra-state" : "Inter-state"}</p><p className="mt-1 text-xs text-slate-600">Reverse charge: {invoice.reverseCharge ? "Yes" : "No"}</p></div>
      </div>
      <div className="mt-7 overflow-x-auto"><table className="w-full border-collapse text-left text-xs"><thead><tr style={{ background: minimal ? "#f8fafc" : accent, color: minimal ? "#334155" : "white" }}>{["Description", "HSN / SAC", "Qty", "Rate", "Taxable", "Tax", "Amount"].map((x) => <th key={x} className="px-2 py-3 font-semibold sm:px-3">{x}</th>)}</tr></thead><tbody>{invoice.items.map((item) => <tr key={item.id} className="border-b border-slate-200"><td className="px-2 py-3 font-semibold sm:px-3">{item.description}</td><td className="px-2 py-3 text-slate-500 sm:px-3">{item.hsnSac || "—"}</td><td className="px-2 py-3 tabular-nums sm:px-3">{item.quantity} {item.unit}</td><td className="px-2 py-3 tabular-nums sm:px-3">{money(item.rate, currency)}</td><td className="px-2 py-3 tabular-nums sm:px-3">{money(item.taxableValue, currency)}</td><td className="px-2 py-3 tabular-nums sm:px-3">{item.taxRate}%</td><td className="px-2 py-3 text-right font-semibold tabular-nums sm:px-3">{money(item.total, currency)}</td></tr>)}</tbody></table></div>
      <div className="mt-6 flex justify-end"><div className="w-full max-w-xs space-y-2 text-xs"><TotalRow label="Subtotal" value={money(invoice.subtotal, currency)} />{invoice.discountTotal > 0 ? <TotalRow label="Discount" value={"−" + money(invoice.discountTotal, currency)} /> : null}<TotalRow label="Taxable value" value={money(invoice.taxableValue, currency)} />{invoice.cgst > 0 ? <TotalRow label="CGST" value={money(invoice.cgst, currency)} /> : null}{invoice.sgst > 0 ? <TotalRow label="SGST" value={money(invoice.sgst, currency)} /> : null}{invoice.igst > 0 ? <TotalRow label="IGST" value={money(invoice.igst, currency)} /> : null}<div className="flex justify-between border-t-2 border-slate-800 pt-3 text-base font-bold"><span>Total</span><span style={{ color: accent }}>{money(invoice.total, currency)}</span></div></div></div>
      {invoice.notes ? <div className="mt-7"><p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Notes</p><p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-slate-600">{invoice.notes}</p></div> : null}
      {invoice.terms ? <div className="mt-5"><p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Terms & conditions</p><p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-slate-600">{invoice.terms}</p></div> : null}
      <div className="mt-9 flex flex-wrap items-end justify-between gap-4 border-t border-slate-200 pt-5"><p className="max-w-sm text-xs leading-5 text-slate-500">{settings.footerNote || "Thank you for your business."}</p><div className="min-w-[140px] text-right"><div className="mb-8 h-7 border-b border-dashed border-slate-300" /><p className="text-xs font-semibold">Authorised signatory</p></div></div>
      <p className="mt-6 text-center text-[9px] text-slate-400">Generated using Business Sutra · Verify applicable statutory requirements before issuing.</p>
    </div>
  </article>;
}
function TotalRow({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between text-slate-500"><span>{label}</span><span className="font-medium text-slate-700">{value}</span></div>;
}
