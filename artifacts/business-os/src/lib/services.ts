import {
  emptyDb,
  recommendModules,
  SYSTEM_EXPENSE_CATEGORIES,
  type Activity,
  type AppNotification,
  type Business,
  type Branch,
  type Campaign,
  type Customer,
  type Lead,
  type LeadStage,
  type Expense,
  type ExpenseCategory,
  type IndustryId,
  type InvoiceRecord,
  type ModuleId,
  type PaymentMethod,
  type Product,
  type Purchase,
  type PurchaseItem,
  type PurchasePayment,
  type PurchaseReturn,
  type RecordedPaymentMethod,
  type SalePayment,
  type SaleRefund,
  type SaleReturn,
  type Supplier,
  type SupplierStatus,
  type Sale,
  type SaleItem,
  type StockMovement,
  type Target,
  type TargetPeriod,
  type TaskItem,
  type TaskPriority,
  type TaskRecurrence,
  type TaskStatus,
  type TeamMember,
  type WorkspaceDB,
} from "@/lib/domain";
import { createId, nowIso, roundMoney } from "@/lib/utils";
import { generateSku } from "@/lib/sku";
import { normaliseLeadInput } from "@/lib/lead-utils";
import { normaliseInvoiceCancellationReason } from "@/lib/invoice-utils";
import { nextTaskDueDate } from "@/lib/task-utils";
import { getEffectivePlanId, getSubscriptionPlan, hasAvailableBranchSlot, hasAvailableUserSeat } from "@/lib/subscription";

export class ServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ServiceError";
  }
}

function replace<T extends { id: string }>(list: T[], id: string, patch: Partial<T>): T[] {
  return list.map((item) => (item.id === id ? { ...item, ...patch } : item));
}

function byBiz<T extends { businessId: string }>(list: T[], businessId: string): T[] {
  return list.filter((x) => x.businessId === businessId);
}

export function createWorkspace(
  db: WorkspaceDB,
  input: {
    name: string;
    logoDataUrl?: string;
    industry: IndustryId;
    businessType: string;
    country: string;
    currency: string;
    timezone: string;
    phone?: string;
    email?: string;
    website?: string;
    location?: string; address?:string; state?:string; stateCode?:string; postalCode?:string;
    gstRegistered?:boolean; gstin?:string; legalName?:string;
    brandColors: string[];
    themePreset: Business["themePreset"];
    appearance: Business["appearance"];
    enabledModules: ModuleId[];
    ownerName?: string;
  },
): { db: WorkspaceDB; business: Business } {
  const name = input.name.trim();
  if (name.length < 2) throw new ServiceError("Enter a business name.");
  const gstin = input.gstin?.trim().toUpperCase() || undefined;
  if (input.gstRegistered && (!gstin || !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(gstin))) {
    throw new ServiceError("Enter a valid 15-character GSTIN or turn off GST registration.");
  }
  const now = nowIso();
  const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
  const modules = Array.from(new Set([...(input.enabledModules.length ? input.enabledModules : recommendModules(input.industry)), "invoices" as ModuleId]));
  const business: Business = {
    id: createId("biz"),
    name,
    logoDataUrl: input.logoDataUrl,
    industry: input.industry,
    businessType: input.businessType,
    country: input.country,
    currency: input.currency,
    timezone: input.timezone,
    phone: input.phone?.trim() || undefined,
    email: input.email?.trim() || undefined,
    website: input.website?.trim() || undefined,
    location: input.location?.trim() || undefined,
    address: input.address?.trim() || undefined,
    state: input.state?.trim() || undefined,
    stateCode: input.stateCode?.trim() || undefined,
    postalCode: input.postalCode?.trim() || undefined,
    gstRegistered: Boolean(input.gstRegistered),
    gstin: input.gstRegistered ? gstin : undefined,
    legalName: input.legalName?.trim() || undefined,
    invoiceSettings: { prefix:"INV", template:"modern", accentColor:"#176B73", showLogo:true, defaultDueDays:0, footerNote:"Thank you for your business.", terms:"" },
    subscriptionPlan: "growth",
    subscriptionStatus: "trial",
    trialStartedAt: now,
    trialEndsAt,
    brandColors: input.brandColors,
    themePreset: input.themePreset,
    appearance: input.appearance,
    enabledModules: modules,
    moduleOrder: modules,
    createdAt: now,
    updatedAt: now,
  };
  const mainBranch: Branch = {
    id: createId("br"),
    businessId: business.id,
    name: "Main Branch",
    code: "MAIN",
    isDefault: true,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  };
  const owner: TeamMember = {
    id: createId("mem"),
    businessId: business.id,
    name: input.ownerName?.trim() || "Owner",
    role: "owner",
    email: input.email?.trim() || undefined,
    branchIds: [mainBranch.id],
    createdAt: now,
  };
  const cats: ExpenseCategory[] = SYSTEM_EXPENSE_CATEGORIES.map((name) => ({
    id: createId("cat"),
    businessId: business.id,
    name,
    system: true,
  }));
  return {
    db: {
      ...db,
      businesses: [...db.businesses, business],
    branches: [...db.branches, mainBranch],
      members: [...db.members, owner],
      expenseCategories: [...db.expenseCategories, ...cats],
    },
    business,
  };
}

export function updateBusiness(db: WorkspaceDB, id: string, patch: Partial<Business>): WorkspaceDB {
  const now = nowIso();
  return {
    ...db,
    businesses: db.businesses.map((b) => (b.id === id ? { ...b, ...patch, id: b.id, updatedAt: now } : b)),
  };
}

export function deleteBusiness(db: WorkspaceDB, id: string): WorkspaceDB {
  const drop = <T extends { businessId: string }>(list: T[]) => list.filter((x) => x.businessId !== id);
  return {
    ...emptyDb(),
    businesses: db.businesses.filter((b) => b.id !== id),
    products: drop(db.products),
    movements: drop(db.movements),
    customers: drop(db.customers),
    leads: drop(db.leads),
    suppliers: drop(db.suppliers),
    purchases: drop(db.purchases),
    purchaseReturns: drop(db.purchaseReturns ?? []),
    sales: drop(db.sales),
    returns: drop(db.returns ?? []),
    expenses: drop(db.expenses),
    expenseCategories: drop(db.expenseCategories),
    targets: drop(db.targets),
    members: drop(db.members),
    tasks: drop(db.tasks),
    campaigns: drop(db.campaigns),
    activity: drop(db.activity),
    notifications: drop(db.notifications),
    invoices: drop(db.invoices),
    branches: db.branches.filter((item) => item.businessId !== id),
  };
}

export function cancelInvoice(db: WorkspaceDB, id: string, reason: string): WorkspaceDB {
  const invoice = db.invoices.find((item) => item.id === id);
  if (!invoice) throw new ServiceError("Invoice not found.");
  if (invoice.status === "cancelled") throw new ServiceError("This invoice is already cancelled.");
  let cancellationReason: string;
  try { cancellationReason = normaliseInvoiceCancellationReason(reason); }
  catch (error) { throw new ServiceError(error instanceof Error ? error.message : 'Invalid cancellation reason.'); }
  const now = nowIso();
  const updated: InvoiceRecord = { ...invoice, status: 'cancelled', cancelReason: cancellationReason, cancelledAt: now, updatedAt: now };
  return { ...db, invoices: replace(db.invoices, id, updated) };
}

export function upsertProduct(
  db: WorkspaceDB,
  input: {
    id?: string;
    businessId: string;
    name: string;
    sku?: string;
    barcode?: string;
    category?: string;
    costPrice: number;
    sellingPrice: number;
    stock: number;
    minStock: number;
    unit: string;
    imageDataUrl?: string;
  },
): { db: WorkspaceDB; product: Product } {
  const name = input.name.trim();
  if (name.length < 1) throw new ServiceError("Product name is required.");
  if (input.sellingPrice < 0 || input.costPrice < 0) throw new ServiceError("Prices cannot be negative.");
  if (input.stock < 0) throw new ServiceError("Stock cannot be negative.");
  if (input.minStock < 0) throw new ServiceError("Minimum stock cannot be negative.");
  const now = nowIso();
  const existingForBiz = byBiz(db.products, input.businessId);
  const sku = (input.sku?.trim() || generateSku(name, existingForBiz.map((p) => p.sku))).toUpperCase();
  if (existingForBiz.some((p) => p.sku.toUpperCase() === sku && p.id !== input.id)) {
    throw new ServiceError("That SKU is already in use.");
  }
  if (input.barcode?.trim()) {
    const code = input.barcode.trim();
    if (existingForBiz.some((p) => p.barcode === code && p.id !== input.id)) {
      throw new ServiceError("That barcode is already assigned.");
    }
  }
  if (input.id) {
    const prev = db.products.find((p) => p.id === input.id);
    if (!prev) throw new ServiceError("Product not found.");
    const stockDelta = roundMoney(input.stock - prev.stock);
    if (stockDelta !== 0) throw new ServiceError("Use Inventory to change stock so every movement has a reason and audit entry.");
    const product: Product = {
      ...prev,
      name,
      sku,
      barcode: input.barcode?.trim() || undefined,
      category: input.category?.trim() || undefined,
      costPrice: roundMoney(input.costPrice),
      sellingPrice: roundMoney(input.sellingPrice),
      stock: roundMoney(input.stock),
      minStock: roundMoney(input.minStock),
      unit: input.unit,
      imageDataUrl: input.imageDataUrl,
      updatedAt: now,
    };
    let movements = db.movements;
    if (stockDelta !== 0) {
      const movement: StockMovement = {
        id: createId("mov"),
        businessId: input.businessId,
        productId: product.id,
        type: "adjustment",
        quantity: stockDelta,
        resultingStock: product.stock,
        reason: "Product edit",
        createdAt: now,
      };
      movements = [movement, ...movements];
    }
    return {
      db: { ...db, products: replace(db.products, product.id, product), movements },
      product,
    };
  }
  const product: Product = {
    id: createId("prd"),
    businessId: input.businessId,
    name,
    sku,
    barcode: input.barcode?.trim() || undefined,
    category: input.category?.trim() || undefined,
    costPrice: roundMoney(input.costPrice),
    sellingPrice: roundMoney(input.sellingPrice),
    stock: roundMoney(input.stock),
    minStock: roundMoney(input.minStock),
    unit: input.unit,
    imageDataUrl: input.imageDataUrl,
    createdAt: now,
    updatedAt: now,
  };
  let movements = db.movements;
  if (product.stock > 0) {
    movements = [
      {
        id: createId("mov"),
        businessId: input.businessId,
        productId: product.id,
        type: "in",
        quantity: product.stock,
        resultingStock: product.stock,
        reason: "Opening stock",
        createdAt: now,
      },
      ...movements,
    ];
  }
  return { db: { ...db, products: [product, ...db.products], movements }, product };
}

export function archiveProduct(db: WorkspaceDB, id: string, archived = true): WorkspaceDB {
  const product = db.products.find((item) => item.id === id);
  if (!product) throw new ServiceError("Product not found.");
  return { ...db, products: replace(db.products, id, { archived, updatedAt: nowIso() }) };
}

export function deleteProduct(db: WorkspaceDB, id: string): WorkspaceDB {
  const product = db.products.find((item) => item.id === id);
  if (!product) return db;
  const hasHistory =
    db.movements.some((movement) => movement.productId === id) ||
    db.sales.some((sale) => sale.items.some((item) => item.productId === id)) ||
    db.purchases.some((purchase) => purchase.items.some((item) => item.productId === id)) ||
    db.invoices.some((invoice) => invoice.items.some((item) => item.productId === id));
  if (hasHistory) throw new ServiceError("This product has transaction history. Archive it to preserve the audit trail.");
  return { ...db, products: db.products.filter((item) => item.id !== id) };
}

export function adjustStock(
  db: WorkspaceDB,
  input: {
    businessId: string;
    productId: string;
    type: "in" | "out" | "adjustment";
    quantity: number;
    reason?: string;
  },
): WorkspaceDB {
  const product = db.products.find((p) => p.id === input.productId && p.businessId === input.businessId);
  if (!product || product.archived) throw new ServiceError("Product not found in this business or is archived.");
  if (!Number.isFinite(input.quantity) || (input.type !== "adjustment" && input.quantity <= 0) || input.quantity < 0) {
    throw new ServiceError(input.type === "adjustment" ? "Enter a valid stock quantity." : "Enter a quantity greater than zero.");
  }
  const movementReason = input.reason?.trim() ?? "";
  if (movementReason.length < 3) throw new ServiceError("Add a stock movement reason (at least 3 characters).");
  let next = product.stock;
  if (input.type === "in") next = roundMoney(product.stock + Math.abs(input.quantity));
  else if (input.type === "out") next = roundMoney(product.stock - Math.abs(input.quantity));
  else next = roundMoney(input.quantity);
  if (next < 0) throw new ServiceError("Not enough stock for that movement.");
  const now = nowIso();
  const qty =
    input.type === "in"
      ? Math.abs(input.quantity)
      : input.type === "out"
        ? -Math.abs(input.quantity)
        : roundMoney(next - product.stock);
  const movement: StockMovement = {
    id: createId("mov"),
    businessId: input.businessId,
    productId: product.id,
    type: input.type,
    quantity: qty,
    resultingStock: next,
    reason: movementReason,
    createdAt: now,
  };
  return {
    ...db,
    products: replace(db.products, product.id, { stock: next, updatedAt: now }),
    movements: [movement, ...db.movements],
  };
}

export function upsertCustomer(
  db: WorkspaceDB,
  input: {
    id?: string;
    businessId: string;
    name: string;
    email?: string;
    phone?: string;
    notes?: string;
  },
): { db: WorkspaceDB; customer: Customer } {
  const name = input.name.trim();
  if (!name) throw new ServiceError("Customer name is required.");
  const now = nowIso();
  if (input.id) {
    const prev = db.customers.find((c) => c.id === input.id && c.businessId === input.businessId);
    if (!prev) throw new ServiceError("Customer not found in this business.");
    const customer: Customer = {
      ...prev,
      name,
      email: input.email?.trim() || undefined,
      phone: input.phone?.trim() || undefined,
      notes: input.notes?.trim() || undefined,
      updatedAt: now,
    };
    return { db: { ...db, customers: replace(db.customers, customer.id, customer) }, customer };
  }
  const customer: Customer = {
    id: createId("cus"),
    businessId: input.businessId,
    name,
    email: input.email?.trim() || undefined,
    phone: input.phone?.trim() || undefined,
    notes: input.notes?.trim() || undefined,
    createdAt: now,
    updatedAt: now,
  };
  return { db: { ...db, customers: [customer, ...db.customers] }, customer };
}

export function archiveCustomer(db: WorkspaceDB, id: string, archived = true): WorkspaceDB {
  const customer = db.customers.find((item) => item.id === id);
  if (!customer) throw new ServiceError("Customer not found.");
  return { ...db, customers: replace(db.customers, id, { archived, updatedAt: nowIso() }) };
}

export function deleteCustomer(db: WorkspaceDB, id: string): WorkspaceDB {
  const customer = db.customers.find((item) => item.id === id);
  if (!customer) return db;
  const hasHistory =
    db.sales.some((sale) => sale.customerId === id) ||
    db.leads.some((lead) => lead.convertedCustomerId === id) ||
    db.invoices.some((invoice) => invoice.customerId === id) ||
    db.activity.some((activity) => activity.customerId === id);
  if (hasHistory) throw new ServiceError("This customer has business history. Archive the customer to preserve linked records.");
  return { ...db, customers: db.customers.filter((item) => item.id !== id) };
}

export function upsertLead(
  db: WorkspaceDB,
  input: { id?: string; businessId: string; name: string; company?: string; email?: string; phone?: string; source?: string; stage: LeadStage; value: number; expectedCloseDate?: string; followUpAt?: string; assignedTo?: string; notes?: string },
): WorkspaceDB {
  const business = db.businesses.find((item) => item.id === input.businessId);
  if (!business) throw new ServiceError("Business not found.");
  const existing = input.id ? db.leads.find((lead) => lead.id === input.id && lead.businessId === input.businessId) : undefined;
  if (input.id && !existing) throw new ServiceError("Lead not found in this business.");
  if (input.assignedTo && !db.members.some((member) => member.id === input.assignedTo && member.businessId === input.businessId)) {
    throw new ServiceError("Choose a team member from this business.");
  }
  let normalized: ReturnType<typeof normaliseLeadInput>;
  try { normalized = normaliseLeadInput(input); }
  catch (error) { throw new ServiceError(error instanceof Error ? error.message : 'Invalid lead details.'); }
  const now = nowIso();
  const lead: Lead = {
    ...(existing ?? {}), id: existing?.id ?? createId('lead'), businessId: input.businessId,
    ...normalized, company: input.company?.trim() || undefined, phone: input.phone?.trim() || undefined,
    source: input.source?.trim() || undefined, expectedCloseDate: input.expectedCloseDate || undefined,
    followUpAt: input.followUpAt || undefined, assignedTo: input.assignedTo || undefined,
    notes: input.notes?.trim() || undefined, createdAt: existing?.createdAt ?? now, updatedAt: now,
  };
  return { ...db, leads: existing ? replace(db.leads, lead.id, lead) : [lead, ...db.leads] };
}

export function deleteLead(db: WorkspaceDB, id: string): WorkspaceDB {
  return { ...db, leads: db.leads.filter((lead) => lead.id !== id) };
}

export function convertLeadToCustomer(db: WorkspaceDB, id: string): { db: WorkspaceDB; customer: Customer } {
  const lead = db.leads.find((item) => item.id === id);
  if (!lead) throw new ServiceError("Lead not found.");
  const linked = lead.convertedCustomerId ? db.customers.find((customer) => customer.id === lead.convertedCustomerId && customer.businessId === lead.businessId) : undefined;
  if (linked) return { db, customer: linked };
  const match = db.customers.find((customer) => customer.businessId === lead.businessId && !customer.archived && (
    (lead.email && customer.email?.toLowerCase() === lead.email.toLowerCase()) ||
    (lead.phone && customer.phone === lead.phone)
  ));
  const result = match ? { db, customer: match } : upsertCustomer(db, {
    businessId: lead.businessId, name: lead.company || lead.name, email: lead.email, phone: lead.phone, notes: lead.notes,
  });
  const updatedLead = { ...lead, stage: 'won' as const, convertedCustomerId: result.customer.id, updatedAt: nowIso() };
  return { db: { ...result.db, leads: replace(result.db.leads, lead.id, updatedLead) }, customer: result.customer };
}

export function upsertSupplier(
  db: WorkspaceDB,
  input: {
    id?: string;
    businessId: string;
    name: string;
    contactName?: string;
    email?: string;
    phone?: string;
    address?: string;
    taxId?: string;
    notes?: string;
    status?: SupplierStatus;
  },
): { db: WorkspaceDB; supplier: Supplier } {
  const name = input.name.trim();
  if (!name) throw new ServiceError("Supplier name is required.");
  const email = input.email?.trim().toLowerCase() || undefined;
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new ServiceError("Enter a valid supplier email address.");
  }
  const businessSuppliers = byBiz(db.suppliers, input.businessId);
  if (businessSuppliers.some((supplier) =>
    supplier.id !== input.id && supplier.name.trim().toLowerCase() === name.toLowerCase()
  )) {
    throw new ServiceError("A supplier with this name already exists.");
  }
  const now = nowIso();
  if (input.id) {
    const previous = db.suppliers.find((supplier) =>
      supplier.id === input.id && supplier.businessId === input.businessId
    );
    if (!previous) throw new ServiceError("Supplier not found in this business.");
    const supplier: Supplier = {
      ...previous,
      name,
      contactName: input.contactName?.trim() || undefined,
      email,
      phone: input.phone?.trim() || undefined,
      address: input.address?.trim() || undefined,
      taxId: input.taxId?.trim().toUpperCase() || undefined,
      notes: input.notes?.trim() || undefined,
      status: input.status ?? previous.status,
      updatedAt: now,
    };
    return { db: { ...db, suppliers: replace(db.suppliers, supplier.id, supplier) }, supplier };
  }
  const supplier: Supplier = {
    id: createId("sup"),
    businessId: input.businessId,
    name,
    contactName: input.contactName?.trim() || undefined,
    email,
    phone: input.phone?.trim() || undefined,
    address: input.address?.trim() || undefined,
    taxId: input.taxId?.trim().toUpperCase() || undefined,
    notes: input.notes?.trim() || undefined,
    status: input.status ?? "active",
    createdAt: now,
    updatedAt: now,
  };
  return { db: { ...db, suppliers: [supplier, ...db.suppliers] }, supplier };
}

export function deleteSupplier(db: WorkspaceDB, supplierId: string): WorkspaceDB {
  const supplier = db.suppliers.find((item) => item.id === supplierId);
  if (!supplier) return db;
  if (db.purchases.some((purchase) => purchase.supplierId === supplierId)) {
    throw new ServiceError("This supplier has purchase history. Mark it inactive to preserve records.");
  }
  return { ...db, suppliers: db.suppliers.filter((item) => item.id !== supplierId) };
}

export function createPurchase(
  db: WorkspaceDB,
  input: {
    businessId: string;
    supplierId: string;
    items: Array<{ productId: string; quantity: number; unitCost: number }>;
    paidAmount: number;
    initialPaymentMethod?: RecordedPaymentMethod;
    initialPaymentReference?: string;
    supplierReference?: string;
    dueDate?: string;
    note?: string;
  },
): { db: WorkspaceDB; purchase: Purchase } {
  if (!input.items.length) throw new ServiceError("Add at least one product to this purchase.");
  const supplierReference = input.supplierReference?.trim() || undefined;
  if (supplierReference && db.purchases.some((purchase) =>
    purchase.businessId === input.businessId &&
    purchase.supplierId === input.supplierId &&
    purchase.supplierReference?.trim().toLowerCase() === supplierReference.toLowerCase()
  )) {
    throw new ServiceError("This supplier invoice / document reference has already been recorded. Open the existing purchase instead of receiving the stock twice.");
  }
  const dueDate = input.dueDate?.trim() || undefined;
  if (dueDate) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dueDate);
    if (!match) throw new ServiceError("Enter a valid supplier payment due date.");
    const year = Number(match[1]), month = Number(match[2]), day = Number(match[3]);
    const parsed = new Date(year, month - 1, day);
    if (parsed.getFullYear() !== year || parsed.getMonth() !== month - 1 || parsed.getDate() !== day) {
      throw new ServiceError("Enter a valid supplier payment due date.");
    }
  }
  const supplier = db.suppliers.find((item) =>
    item.id === input.supplierId && item.businessId === input.businessId
  );
  if (!supplier) throw new ServiceError("Select a supplier from this business.");
  if (supplier.status !== "active") throw new ServiceError("This supplier is inactive.");
  const productMap = new Map(db.products.map((product) => [product.id, product]));
  const items: PurchaseItem[] = input.items.map((line) => {
    if (!line.productId || !Number.isFinite(line.quantity) || line.quantity <= 0) {
      throw new ServiceError("Enter a product and a quantity greater than zero.");
    }
    if (!Number.isFinite(line.unitCost) || line.unitCost < 0) {
      throw new ServiceError("Purchase cost must be a valid non-negative amount.");
    }
    const product = productMap.get(line.productId);
    if (!product || product.businessId !== input.businessId || product.archived) {
      throw new ServiceError("A selected product is missing or unavailable.");
    }
    const quantity = roundMoney(line.quantity);
    const unitCost = roundMoney(line.unitCost);
    return {
      productId: product.id,
      name: product.name,
      sku: product.sku,
      quantity,
      unitCost,
      total: roundMoney(quantity * unitCost),
    };
  });
  const subtotal = roundMoney(items.reduce((sum, item) => sum + item.total, 0));
  const total = subtotal;
  if (!Number.isFinite(input.paidAmount)) {
    throw new ServiceError("Enter a valid payment amount.");
  }
  const paidAmount = roundMoney(input.paidAmount);
  if (paidAmount < 0 || paidAmount > total) {
    throw new ServiceError("Amount paid must be between zero and the purchase total.");
  }
  const balance = roundMoney(total - paidAmount);
  const paymentStatus = balance <= 0 ? "paid" : paidAmount > 0 ? "partial" : "pending";
  const now = nowIso();
  const purchase: Purchase = {
    id: createId("pur"),
    businessId: input.businessId,
    supplierId: supplier.id,
    supplierName: supplier.name,
    items,
    subtotal,
    total,
    paidAmount,
    balance,
    paymentStatus,
    supplierReference,
    dueDate,
    payments: paidAmount > 0 ? [{
      id: createId("ppay"),
      amount: paidAmount,
      method: input.initialPaymentMethod ?? "bank",
      reference: input.initialPaymentReference?.trim() || undefined,
      paidAt: now,
    }] : [],
    note: input.note?.trim() || undefined,
    createdAt: now,
    updatedAt: now,
  };
  let products = db.products;
  let movements = db.movements;
  for (const item of items) {
    const current = products.find((product) => product.id === item.productId);
    if (!current || current.businessId !== input.businessId) {
      throw new ServiceError("A selected product changed while the purchase was being saved.");
    }
    const nextStock = roundMoney(current.stock + item.quantity);
    products = replace(products, current.id, { stock: nextStock, updatedAt: now });
    movements = [{
      id: createId("mov"),
      businessId: input.businessId,
      productId: current.id,
      type: "in",
      quantity: item.quantity,
      resultingStock: nextStock,
      reason: `Purchase ${purchase.id.slice(-6).toUpperCase()} · ${supplier.name}`,
      refId: purchase.id,
      createdAt: now,
    }, ...movements];
  }
  return {
    db: { ...db, products, movements, purchases: [purchase, ...db.purchases] },
    purchase,
  };
}

export function updatePurchasePayment(
  db: WorkspaceDB,
  purchaseId: string,
  amount: number,
  method: RecordedPaymentMethod = "bank",
  reference?: string,
): WorkspaceDB {
  const purchase = db.purchases.find((item) => item.id === purchaseId);
  if (!purchase) throw new ServiceError("Purchase not found.");
  if (!Number.isFinite(amount) || amount <= 0) throw new ServiceError("Enter a payment greater than zero.");
  if (amount > purchase.balance) throw new ServiceError("Payment cannot be greater than the outstanding balance.");
  const now = nowIso();
  const paidAmount = roundMoney(purchase.paidAmount + amount);
  const balance = roundMoney(Math.max(0, purchase.total - paidAmount));
  const paymentStatus = balance <= 0 ? "paid" : "partial";
  const legacyPayments: PurchasePayment[] = purchase.payments ?? (purchase.paidAmount > 0 ? [{
    id: `legacy-${purchase.id}`, amount: purchase.paidAmount, method: "other",
    reference: "Previous payment · method not recorded", paidAt: purchase.createdAt,
  }] : []);
  const payment: PurchasePayment = {
    id: createId("ppay"), amount: roundMoney(amount), method,
    reference: reference?.trim() || undefined, paidAt: now,
  };
  return {
    ...db,
    purchases: replace(db.purchases, purchaseId, {
      paidAmount, balance, paymentStatus, payments: [...legacyPayments, payment], updatedAt: now,
    }),
  };
}



export function recordPurchaseReturn(
  db: WorkspaceDB,
  purchaseId: string,
  input: {
    businessId: string;
    items: Array<{ productId: string; quantity: number }>;
    reason: string;
    refundMethod?: RecordedPaymentMethod;
    refundReference?: string;
  },
): WorkspaceDB {
  const purchase = db.purchases.find((item) => item.id === purchaseId && item.businessId === input.businessId);
  if (!purchase) throw new ServiceError("Purchase not found in this business.");
  if (!input.items.length) throw new ServiceError("Choose at least one item to return.");
  const reason = input.reason.trim();
  if (reason.length < 3) throw new ServiceError("Add a supplier return reason (at least 3 characters).");

  const requested = new Map<string, number>();
  for (const line of input.items) {
    if (!line.productId || !Number.isFinite(line.quantity) || line.quantity <= 0) {
      throw new ServiceError("Return quantities must be greater than zero.");
    }
    requested.set(line.productId, roundMoney((requested.get(line.productId) ?? 0) + line.quantity));
  }

  const returnedItems: PurchaseReturn["items"] = [];
  const remaining = new Map(requested);
  const nextItems: PurchaseItem[] = [];
  let returnAmount = 0;
  for (const item of purchase.items) {
    const requestedQty = remaining.get(item.productId) ?? 0;
    if (requestedQty <= 0) {
      nextItems.push(item);
      continue;
    }
    const quantity = Math.min(item.quantity, requestedQty);
    const amount = roundMoney(quantity * item.unitCost);
    returnedItems.push({
      productId: item.productId,
      name: item.name,
      sku: item.sku,
      quantity,
      amount,
    });
    returnAmount = roundMoney(returnAmount + amount);
    remaining.set(item.productId, roundMoney(requestedQty - quantity));
    const nextQty = roundMoney(item.quantity - quantity);
    if (nextQty > 0) nextItems.push({
      ...item,
      quantity: nextQty,
      total: roundMoney(nextQty * item.unitCost),
    });
  }
  for (const quantity of remaining.values()) {
    if (quantity > 0) throw new ServiceError("Return quantity is greater than the quantity still recorded on this purchase.");
  }
  if (!returnedItems.length) throw new ServiceError("No valid purchase items were selected.");

  const now = nowIso();
  let products = db.products;
  let movements = db.movements;
  for (const item of returnedItems) {
    const product = products.find((entry) => entry.id === item.productId && entry.businessId === input.businessId);
    if (!product) throw new ServiceError("A returned product is no longer available in this business.");
    if (product.stock < item.quantity) {
      throw new ServiceError(`Cannot return ${item.quantity} ${product.unit} of ${product.name}; only ${product.stock} remains in stock. Reconcile stock before returning to the supplier.`);
    }
    const nextStock = roundMoney(product.stock - item.quantity);
    products = replace(products, product.id, { stock: nextStock, updatedAt: now });
    movements = [{
      id: createId("mov"),
      businessId: input.businessId,
      productId: product.id,
      type: "out",
      quantity: -item.quantity,
      resultingStock: nextStock,
      reason: `Supplier return · ${reason}`,
      refId: purchaseId,
      createdAt: now,
    }, ...movements];
  }

  const nextTotal = roundMoney(Math.max(0, purchase.total - returnAmount));
  const refundAmount = roundMoney(Math.max(0, purchase.paidAmount - nextTotal));
  if (refundAmount > 0 && !input.refundMethod) {
    throw new ServiceError(
      `The returned goods create a supplier refund due of ${refundAmount.toFixed(2)}. Record the refund method only after the supplier has actually refunded you.`
    );
  }
  const nextPaid = roundMoney(Math.max(0, purchase.paidAmount - refundAmount));
  const nextBalance = roundMoney(Math.max(0, nextTotal - nextPaid));
  const paymentStatus = nextBalance <= 0 ? "paid" : nextPaid > 0 ? "partial" : "pending";
  const returnId = createId("pret");
  const returnRecord: PurchaseReturn = {
    id: returnId,
    businessId: purchase.businessId,
    purchaseId: purchase.id,
    supplierId: purchase.supplierId,
    supplierName: purchase.supplierName,
    items: returnedItems,
    amount: returnAmount,
    refundAmount,
    reason,
    refundMethod: refundAmount > 0 ? input.refundMethod : undefined,
    refundReference: refundAmount > 0 ? input.refundReference?.trim() || undefined : undefined,
    createdAt: now,
  };
  const updatedPurchase: Purchase = {
    ...purchase,
    items: nextItems,
    subtotal: nextTotal,
    total: nextTotal,
    paidAmount: nextPaid,
    balance: nextBalance,
    paymentStatus,
    updatedAt: now,
  };
  return {
    ...db,
    products,
    movements,
    purchases: replace(db.purchases, purchase.id, updatedPurchase),
    purchaseReturns: [returnRecord, ...(db.purchaseReturns ?? [])],
  };
}
export function addCustomerNote(db: WorkspaceDB, businessId: string, customerId: string, note: string): WorkspaceDB {
  const text = note.trim();
  if (!text) throw new ServiceError("Write a note first.");
  const activity: Activity = {
    id: createId("act"),
    businessId,
    customerId,
    type: "note",
    message: text,
    createdAt: nowIso(),
  };
  return { ...db, activity: [activity, ...db.activity] };
}

export interface CartLine {
  productId: string;
  qty: number;
  unitPrice: number;
  discount: number;
}

export function completeSale(
  db: WorkspaceDB,
  input: {
    businessId: string;
    customerId?: string;
    lines: CartLine[];
    cartDiscount: number;
    paymentMethod: PaymentMethod;
    paidAmount: number;
    note?: string;
  },
): { db: WorkspaceDB; sale: Sale } {
  if (!input.lines.length) throw new ServiceError("Add at least one product.");
  const items: SaleItem[] = [];
  const productMap = new Map(db.products.map((p) => [p.id, p]));
  const reservedByProduct = new Map<string, number>();
  for (const line of input.lines) {
    const product = productMap.get(line.productId);
    if (!product || product.businessId !== input.businessId) throw new ServiceError("A product in the cart is missing.");
    if (!Number.isFinite(line.qty) || line.qty <= 0) throw new ServiceError(`Enter a valid quantity for ${product.name}.`);
    if (product.archived) throw new ServiceError(`${product.name} is archived and cannot be sold.`);
    const reservedQuantity = roundMoney((reservedByProduct.get(product.id) ?? 0) + line.qty);
    if (product.stock < reservedQuantity) throw new ServiceError(`${product.name} only has ${product.stock} ${product.unit} in stock across this cart.`);
    reservedByProduct.set(product.id, reservedQuantity);
    if (!Number.isFinite(line.unitPrice) || line.unitPrice < 0) throw new ServiceError("Price must be a valid non-negative amount.");
    if (!Number.isFinite(line.discount) || line.discount < 0 || line.discount > line.unitPrice * line.qty) throw new ServiceError("Line discount must be between zero and the line value.");
    items.push({
      productId: product.id,
      name: product.name,
      sku: product.sku,
      qty: line.qty,
      unitPrice: roundMoney(line.unitPrice),
      costPrice: product.costPrice,
      discount: roundMoney(line.discount || 0),
    });
  }
  const subtotal = roundMoney(items.reduce((s, i) => s + i.unitPrice * i.qty - i.discount, 0));
  if (!Number.isFinite(input.cartDiscount) || input.cartDiscount < 0) throw new ServiceError("Cart discount must be a valid non-negative amount.");
  const discount = roundMoney(input.cartDiscount);
  if (discount > subtotal) throw new ServiceError("Discount cannot exceed the subtotal.");
  const total = roundMoney(subtotal - discount);
  const costTotal = roundMoney(items.reduce((s, i) => s + i.costPrice * i.qty, 0));
  const grossProfit = roundMoney(total - costTotal);
  if (!Number.isFinite(input.paidAmount) || input.paidAmount < 0 || input.paidAmount > total) {
    throw new ServiceError("Initial payment must be a valid amount between zero and the sale total.");
  }
  const paid = roundMoney(input.paidAmount);
  const outstanding = roundMoney(Math.max(0, total - paid));
  const paymentStatus = outstanding <= 0 ? "paid" : paid > 0 ? "partial" : "unpaid";
  const now = nowIso();
  const initialPaymentMethod: RecordedPaymentMethod = input.paymentMethod === "credit" ? "other" : input.paymentMethod;
  const payments: SalePayment[] = paid > 0 ? [{
    id: createId("spay"), amount: paid, method: initialPaymentMethod,
    reference: input.paymentMethod === "credit" ? "Initial amount · method not specified" : undefined,
    receivedAt: now,
  }] : [];
  const customer = input.customerId ? db.customers.find((c) => c.id === input.customerId && c.businessId === input.businessId && !c.archived) : undefined;
  if (input.customerId && !customer) throw new ServiceError("Select an active customer from this business.");
  const sale: Sale = {
    id: createId("sal"),
    businessId: input.businessId,
    customerId: customer?.id,
    customerName: customer?.name,
    items,
    subtotal,
    discount,
    total,
    costTotal,
    grossProfit,
    paymentMethod: input.paymentMethod,
    paymentStatus,
    paidAmount: paid,
    outstanding,
    payments,
    refunds: [],
    note: input.note?.trim() || undefined,
    createdAt: now,
    status: "completed",
  };
  let products = db.products;
  let movements = db.movements;
  for (const item of items) {
    const product = productMap.get(item.productId)!;
    const nextStock = roundMoney(product.stock - item.qty);
    products = replace(products, product.id, { stock: nextStock, updatedAt: now });
    productMap.set(product.id, { ...product, stock: nextStock });
    movements = [
      {
        id: createId("mov"),
        businessId: input.businessId,
        productId: product.id,
        type: "sale",
        quantity: -item.qty,
        resultingStock: nextStock,
        reason: `Sale ${sale.id.slice(-6).toUpperCase()}`,
        refId: sale.id,
        createdAt: now,
      },
      ...movements,
    ];
  }
  const activity: Activity[] = customer
    ? [
        {
          id: createId("act"),
          businessId: input.businessId,
          customerId: customer.id,
          type: "sale",
          message: `Purchased ${items.length} item${items.length === 1 ? "" : "s"} for ${total}`,
          refId: sale.id,
          createdAt: now,
        },
        ...db.activity,
      ]
    : db.activity;
  return {
    db: { ...db, products, movements, sales: [sale, ...db.sales], activity },
    sale,
  };
}

export function recordPayment(
  db: WorkspaceDB,
  saleId: string,
  amount: number,
  method: RecordedPaymentMethod = "cash",
  reference?: string,
): WorkspaceDB {
  const sale = db.sales.find((item) => item.id === saleId);
  if (!sale) throw new ServiceError("Sale not found.");
  if (sale.status === "reversed") throw new ServiceError("A reversed sale cannot receive another payment.");
  if (!Number.isFinite(amount) || amount <= 0) throw new ServiceError("Enter a payment amount greater than zero.");
  const currentPaid = Number.isFinite(sale.paidAmount) ? Math.min(sale.total, Math.max(0, sale.paidAmount)) : 0;
  const currentOutstanding = roundMoney(Math.max(0, sale.total - currentPaid));
  if (amount > currentOutstanding) throw new ServiceError("Payment cannot be greater than the outstanding balance.");
  const now = nowIso();
  const paid = roundMoney(currentPaid + amount);
  const outstanding = roundMoney(Math.max(0, sale.total - paid));
  const paymentStatus = outstanding <= 0 ? "paid" : "partial";
  const legacyPayments: SalePayment[] = sale.payments ?? (sale.paidAmount > 0 ? [{
    id: `legacy-${sale.id}`,
    amount: sale.paidAmount,
    method: sale.paymentMethod === "credit" ? "other" : sale.paymentMethod,
    reference: sale.paymentMethod === "credit" ? "Previous payment · method not recorded" : undefined,
    receivedAt: sale.createdAt,
  }] : []);
  const payment: SalePayment = {
    id: createId("spay"), amount: roundMoney(amount), method,
    reference: reference?.trim() || undefined, receivedAt: now,
  };
  return {
    ...db,
    sales: replace(db.sales, saleId, { paidAmount: paid, outstanding, paymentStatus, payments: [...legacyPayments, payment] }),
  };
}

export function reverseSale(
  db: WorkspaceDB,
  saleId: string,
  reason: string,
  refund?: { method: RecordedPaymentMethod; reference?: string },
): WorkspaceDB {
  const sale = db.sales.find((item) => item.id === saleId);
  if (!sale) throw new ServiceError("Sale not found.");
  if (sale.status === "reversed") throw new ServiceError("This sale has already been reversed.");
  const reversalReason = reason.trim();
  if (reversalReason.length < 3) throw new ServiceError("Add a reversal reason (at least 3 characters).");
  if (sale.paidAmount > 0 && !refund?.method) {
    throw new ServiceError("Record the refund method for the amount already collected before reversing this sale.");
  }
  const now = nowIso();
  let products = db.products;
  let movements = db.movements;
  for (const item of sale.items) {
    const product = products.find((entry) => entry.id === item.productId && entry.businessId === sale.businessId);
    if (!product) continue;
    const next = roundMoney(product.stock + item.qty);
    products = replace(products, product.id, { stock: next, updatedAt: now });
    movements = [{
      id: createId("mov"), businessId: sale.businessId, productId: product.id, type: "in",
      quantity: item.qty, resultingStock: next, reason: `Sale reversal · ${reversalReason}`,
      refId: sale.id, createdAt: now,
    }, ...movements];
  }
  const legacyPayments: SalePayment[] = sale.payments ?? (sale.paidAmount > 0 ? [{
    id: `legacy-${sale.id}`, amount: sale.paidAmount,
    method: sale.paymentMethod === "credit" ? "other" : sale.paymentMethod,
    reference: sale.paymentMethod === "credit" ? "Previous payment · method not recorded" : undefined,
    receivedAt: sale.createdAt,
  }] : []);
  const refundRecords: SaleRefund[] = sale.paidAmount > 0 ? [
    ...(sale.refunds ?? []),
    {
      id: createId("sref"), amount: roundMoney(sale.paidAmount), method: refund!.method,
      reference: refund!.reference?.trim() || undefined, refundedAt: now,
    },
  ] : sale.refunds ?? [];
  const reversed: Sale = {
    ...sale, status: "reversed", payments: legacyPayments, refunds: refundRecords,
    reversalReason, reversedAt: now,
  };
  const activity: Activity = {
    id: createId("act"), businessId: sale.businessId, customerId: sale.customerId,
    type: "system", message: `Sale ${sale.id.slice(-7).toUpperCase()} reversed: ${reversalReason}`,
    refId: sale.id, createdAt: now,
  };
  return {
    ...db, products, movements, sales: replace(db.sales, sale.id, reversed),
    activity: [activity, ...db.activity],
  };
}


export function recordSaleReturn(
  db: WorkspaceDB,
  saleId: string,
  input: {
    businessId: string;
    items: Array<{ productId: string; quantity: number }>;
    reason: string;
    refundMethod?: RecordedPaymentMethod;
    refundReference?: string;
  },
): WorkspaceDB {
  const sale = db.sales.find((item) => item.id === saleId && item.businessId === input.businessId);
  if (!sale) throw new ServiceError("Sale not found in this business.");
  if (sale.status === "reversed") throw new ServiceError("A reversed sale cannot receive another return.");
  if (!input.items.length) throw new ServiceError("Choose at least one item to return.");
  const reason = input.reason.trim();
  if (reason.length < 3) throw new ServiceError("Add a return reason (at least 3 characters).");

  const requested = new Map<string, number>();
  for (const line of input.items) {
    if (!line.productId || !Number.isFinite(line.quantity) || line.quantity <= 0) {
      throw new ServiceError("Return quantities must be greater than zero.");
    }
    requested.set(line.productId, roundMoney((requested.get(line.productId) ?? 0) + line.quantity));
  }

  const returnedItems: SaleReturn["items"] = [];
  const remaining = new Map(requested);
  const updatedItems: SaleItem[] = [];
  let returnAmount = 0;
  let returnCost = 0;

  for (const item of sale.items) {
    const requestedQty = remaining.get(item.productId) ?? 0;
    if (requestedQty <= 0) {
      updatedItems.push(item);
      continue;
    }
    const availableQty = item.qty;
    const qty = Math.min(availableQty, requestedQty);
    const lineBase = roundMoney(item.unitPrice * item.qty - item.discount);
    const saleRatio = sale.subtotal > 0 ? sale.total / sale.subtotal : 0;
    const lineReturn = roundMoney(lineBase * saleRatio * (qty / availableQty));
    const lineCost = roundMoney(item.costPrice * qty);
    returnedItems.push({
      productId: item.productId,
      name: item.name,
      sku: item.sku,
      quantity: qty,
      amount: lineReturn,
      costAmount: lineCost,
    });
    returnAmount = roundMoney(returnAmount + lineReturn);
    returnCost = roundMoney(returnCost + lineCost);
    remaining.set(item.productId, roundMoney(requestedQty - qty));
    const nextQty = roundMoney(availableQty - qty);
    if (nextQty > 0) {
      updatedItems.push({
        ...item,
        qty: nextQty,
        discount: roundMoney(item.discount * (nextQty / availableQty)),
      });
    }
  }

  for (const quantity of remaining.values()) {
    if (quantity > 0) throw new ServiceError("Return quantity is greater than the quantity still sold on this sale.");
  }
  if (!returnedItems.length) throw new ServiceError("No valid sale items were selected.");

  const allRemainingReturned = sale.items.every((item) =>
    (requested.get(item.productId) ?? 0) >= sale.items
      .filter((candidate) => candidate.productId === item.productId)
      .reduce((sum, candidate) => sum + candidate.qty, 0)
  );
  if (allRemainingReturned) returnAmount = roundMoney(sale.total);

  const nextTotal = roundMoney(Math.max(0, sale.total - returnAmount));
  const nextSubtotal = roundMoney(updatedItems.reduce((sum, item) => sum + item.unitPrice * item.qty - item.discount, 0));
  const nextDiscount = roundMoney(Math.max(0, nextSubtotal - nextTotal));
  const nextCostTotal = roundMoney(Math.max(0, sale.costTotal - returnCost));
  const refundAmount = roundMoney(Math.max(0, sale.paidAmount - nextTotal));
  if (refundAmount > 0 && !input.refundMethod) {
    throw new ServiceError(
      `A refund of ${refundAmount.toFixed(2)} is due because the revised sale is below the amount collected. Complete the refund first, then record its method.`
    );
  }
  const nextPaidAmount = roundMoney(Math.max(0, sale.paidAmount - refundAmount));
  const nextOutstanding = roundMoney(Math.max(0, nextTotal - nextPaidAmount));
  const paymentStatus = nextOutstanding <= 0 ? "paid" : nextPaidAmount > 0 ? "partial" : "unpaid";
  const now = nowIso();
  const returnId = createId("ret");
  const returnedQuantity = returnedItems.reduce((sum, item) => sum + item.quantity, 0);
  const returnRecord: SaleReturn = {
    id: returnId,
    businessId: sale.businessId,
    saleId: sale.id,
    items: returnedItems,
    amount: returnAmount,
    refundAmount,
    reason,
    refundMethod: refundAmount > 0 ? input.refundMethod : undefined,
    refundReference: refundAmount > 0 ? input.refundReference?.trim() || undefined : undefined,
    createdAt: now,
  };

  let products = db.products;
  let movements = db.movements;
  for (const item of returnedItems) {
    const product = products.find((entry) => entry.id === item.productId && entry.businessId === sale.businessId);
    if (!product) throw new ServiceError("A returned product is no longer available in this business.");
    const nextStock = roundMoney(product.stock + item.quantity);
    products = replace(products, product.id, { stock: nextStock, updatedAt: now });
    movements = [{
      id: createId("mov"),
      businessId: sale.businessId,
      productId: product.id,
      type: "in",
      quantity: item.quantity,
      resultingStock: nextStock,
      reason: `Sale return · ${reason}`,
      refId: returnId,
      createdAt: now,
    }, ...movements];
  }

  const refundRecords: SaleRefund[] = refundAmount > 0
    ? [...(sale.refunds ?? []), {
        id: createId("sref"),
        amount: refundAmount,
        method: input.refundMethod!,
        reference: input.refundReference?.trim() || undefined,
        refundedAt: now,
      }]
    : (sale.refunds ?? []);
  const updatedSale: Sale = {
    ...sale,
    items: updatedItems,
    subtotal: nextSubtotal,
    discount: nextDiscount,
    total: nextTotal,
    costTotal: nextCostTotal,
    grossProfit: roundMoney(nextTotal - nextCostTotal),
    paidAmount: nextPaidAmount,
    outstanding: nextOutstanding,
    paymentStatus,
    refunds: refundRecords,
  };
  const activity: Activity = {
    id: createId("act"),
    businessId: sale.businessId,
    customerId: sale.customerId,
    type: "system",
    message: `Return recorded for sale ${sale.id.slice(-7).toUpperCase()} · ${returnedQuantity} unit(s) · ${reason}`,
    refId: returnId,
    createdAt: now,
  };
  return {
    ...db,
    products,
    movements,
    sales: replace(db.sales, sale.id, updatedSale),
    returns: [returnRecord, ...(db.returns ?? [])],
    activity: [activity, ...db.activity],
  };
}

/** Legacy deletion entry point intentionally refuses destructive transaction removal. */
export function deleteSale(_db: WorkspaceDB, _saleId: string): WorkspaceDB {
  throw new ServiceError("Sales are not deleted. Use reverseSale with a reason to preserve the transaction history.");
}

export function upsertExpense(
  db: WorkspaceDB,
  input: {
    id?: string;
    businessId: string;
    category: string;
    amount: number;
    vendor?: string;
    notes?: string;
    date: string;
    paymentMethod?: RecordedPaymentMethod;
    reference?: string;
  },
): WorkspaceDB {
  if (!input.category.trim()) throw new ServiceError("Choose a category.");
  if (!Number.isFinite(input.amount) || input.amount <= 0) throw new ServiceError("Amount must be a valid number greater than zero.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date) || Number.isNaN(new Date(input.date + "T00:00:00").getTime())) {
    throw new ServiceError("Enter a valid expense date.");
  }
  const now = nowIso();
  if (input.id) {
    const existing = db.expenses.find((expense) => expense.id === input.id && expense.businessId === input.businessId);
    if (!existing) throw new ServiceError("Expense not found in this business.");
    return {
      ...db,
      expenses: replace(db.expenses, input.id, {
        category: input.category.trim(),
        amount: roundMoney(input.amount),
        vendor: input.vendor?.trim() || undefined,
        notes: input.notes?.trim() || undefined,
        date: input.date,
        paymentMethod: input.paymentMethod ?? existing.paymentMethod ?? "other",
        reference: input.reference?.trim() || undefined,
      }),
    };
  }
  const expense: Expense = {
    id: createId("exp"),
    businessId: input.businessId,
    category: input.category.trim(),
    amount: roundMoney(input.amount),
    vendor: input.vendor?.trim() || undefined,
    notes: input.notes?.trim() || undefined,
    date: input.date,
    paymentMethod: input.paymentMethod ?? "other",
    reference: input.reference?.trim() || undefined,
    archived: false,
    createdAt: now,
  };
  return { ...db, expenses: [expense, ...db.expenses] };
}

export function archiveExpense(db: WorkspaceDB, businessId: string, id: string, archived = true): WorkspaceDB {
  const expense = db.expenses.find((item) => item.id === id && item.businessId === businessId);
  if (!expense) throw new ServiceError("Expense not found in this business.");
  return { ...db, expenses: replace(db.expenses, id, { archived }) };
}

/** Expense records are part of the financial audit trail; use archiveExpense instead. */
export function deleteExpense(_db: WorkspaceDB, _id: string): WorkspaceDB {
  throw new ServiceError("Expenses are archived, not deleted, so historical financial reports remain auditable.");
}

export function addExpenseCategory(db: WorkspaceDB, businessId: string, name: string): WorkspaceDB {
  const label = name.trim();
  if (!label) throw new ServiceError("Category name is required.");
  const exists = byBiz(db.expenseCategories, businessId).some(
    (c) => c.name.toLowerCase() === label.toLowerCase(),
  );
  if (exists) throw new ServiceError("That category already exists.");
  const cat: ExpenseCategory = { id: createId("cat"), businessId, name: label };
  return { ...db, expenseCategories: [...db.expenseCategories, cat] };
}

export function upsertTarget(
  db: WorkspaceDB,
  input: {
    businessId: string;
    period: TargetPeriod;
    year: number;
    month?: number;
    quarter?: number;
    amount: number;
  },
): WorkspaceDB {
  if (!(input.amount > 0)) throw new ServiceError("Target must be greater than zero.");
  const match = db.targets.find(
    (t) =>
      t.businessId === input.businessId &&
      t.period === input.period &&
      t.year === input.year &&
      t.month === input.month &&
      t.quarter === input.quarter,
  );
  if (match) {
    return { ...db, targets: replace(db.targets, match.id, { amount: roundMoney(input.amount) }) };
  }
  const target: Target = {
    id: createId("tgt"),
    businessId: input.businessId,
    period: input.period,
    year: input.year,
    month: input.month,
    quarter: input.quarter,
    amount: roundMoney(input.amount),
    createdAt: nowIso(),
  };
  return { ...db, targets: [target, ...db.targets] };
}

export function deleteTarget(db: WorkspaceDB, id: string): WorkspaceDB {
  return { ...db, targets: db.targets.filter((t) => t.id !== id) };
}

export function upsertTask(
  db: WorkspaceDB,
  input: {
    id?: string; businessId: string; title: string; description?: string; assignedTo?: string;
    priority: TaskPriority; dueDate?: string; reminder?: string; status?: TaskStatus;
    recurrence?: import("@/lib/domain").TaskRecurrence;
  },
): WorkspaceDB {
  const title = input.title.trim();
  if (!title) throw new ServiceError("Task title is required.");
  const now = nowIso();
  if (input.id) {
    const previous = db.tasks.find((task) => task.id === input.id && task.businessId === input.businessId);
    if (!previous) throw new ServiceError("Task not found in this business.");
    const updatedDb = { ...db, tasks: replace(db.tasks, input.id, {
      title, description: input.description?.trim() || undefined, assignedTo: input.assignedTo || undefined,
      priority: input.priority, dueDate: input.dueDate || undefined, reminder: input.reminder || undefined,
      recurrence: input.recurrence ?? previous.recurrence ?? "none", updatedAt: now,
    }) };
    return input.status && input.status !== previous.status
      ? setTaskStatus(updatedDb, input.id, input.status)
      : updatedDb;
  }
  const task: TaskItem = {
    id: createId("tsk"), businessId: input.businessId, title,
    description: input.description?.trim() || undefined, assignedTo: input.assignedTo || undefined,
    priority: input.priority, dueDate: input.dueDate || undefined, reminder: input.reminder || undefined,
    status: input.status ?? "todo", recurrence: input.recurrence ?? "none",
    statusHistory: [{ to: input.status ?? "todo", changedAt: now }], createdAt: now, updatedAt: now,
  };
  return { ...db, tasks: [task, ...db.tasks] };
}

export function setTaskStatus(db: WorkspaceDB, id: string, status: TaskStatus): WorkspaceDB {
  const task = db.tasks.find((item) => item.id === id);
  if (!task || task.status === status) return db;
  const now = nowIso();
  const history = [...(task.statusHistory ?? []), { from: task.status, to: status, changedAt: now }];
  if (status !== "done" || !task.recurrence || task.recurrence === "none" || task.nextOccurrenceId) {
    return { ...db, tasks: replace(db.tasks, id, { status, statusHistory: history, updatedAt: now }) };
  }
  const nextId = createId("tsk");
  const nextTask: TaskItem = {
    id: nextId, businessId: task.businessId, title: task.title, description: task.description,
    assignedTo: task.assignedTo, priority: task.priority,
    dueDate: nextTaskDueDate(task.dueDate, task.recurrence, now), status: 'todo', recurrence: task.recurrence,
    seriesId: task.seriesId ?? task.id, statusHistory: [{ to: 'todo', changedAt: now }],
    createdAt: now, updatedAt: now,
  };
  const completedTask = { ...task, status, statusHistory: history, seriesId: task.seriesId ?? task.id, nextOccurrenceId: nextId, updatedAt: now };
  return { ...db, tasks: [nextTask, ...replace(db.tasks, id, completedTask)] };
}

export function addTaskComment(db: WorkspaceDB, id: string, body: string, author = "Workspace"): WorkspaceDB {
  const task = db.tasks.find((item) => item.id === id);
  if (!task) throw new ServiceError("Task not found.");
  const message = body.trim();
  if (!message) throw new ServiceError("Write a comment before adding it.");
  if (message.length > 2000) throw new ServiceError("Comments must be 2,000 characters or fewer.");
  const now = nowIso();
  const comment = { id: createId("cmt"), author: author.trim() || "Workspace", body: message, createdAt: now };
  return { ...db, tasks: replace(db.tasks, id, { comments: [...(task.comments ?? []), comment], updatedAt: now }) };
}

export function deleteTask(db: WorkspaceDB, id: string): WorkspaceDB {
  return { ...db, tasks: db.tasks.filter((t) => t.id !== id) };
}
export function upsertBranch(
  db: WorkspaceDB,
  input: { id?: string; businessId: string; name: string; code?: string; address?: string; timezone?: string; isActive?: boolean },
): { db: WorkspaceDB; branch: Branch } {
  const business = db.businesses.find((item) => item.id === input.businessId);
  if (!business) throw new ServiceError("Business not found.");
  const name = input.name.trim();
  if (name.length < 2) throw new ServiceError("Enter a branch name.");
  const existing = input.id ? db.branches.find((item) => item.id === input.id && item.businessId === input.businessId) : undefined;
  if (input.id && !existing) throw new ServiceError("Branch not found in this business.");
  const code = (input.code?.trim() || name.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").slice(0, 12)).toUpperCase();
  if (!code || !/^[A-Z0-9-]{2,12}$/.test(code)) throw new ServiceError("Branch code must be 2–12 letters, numbers or hyphens.");
  if (db.branches.some((item) => item.businessId === input.businessId && item.id !== input.id && (item.code.toUpperCase() === code || item.name.trim().toLowerCase() === name.toLowerCase()))) {
    throw new ServiceError("A branch with this name or code already exists.");
  }
  if (!existing) {
    const effectivePlanId = getEffectivePlanId(business);
    const plan = getSubscriptionPlan(effectivePlanId);
    const currentBranches = db.branches.filter((item) => item.businessId === input.businessId).length;
    if (!hasAvailableBranchSlot(effectivePlanId, currentBranches)) {
      throw new ServiceError(plan.title + " includes up to " + plan.maxBranches + " branch" + (plan.maxBranches === 1 ? "" : "es") + ". Upgrade the plan to add another branch.");
    }
  }
  const now = nowIso();
  const branch: Branch = {
    id: existing?.id ?? createId("br"), businessId: input.businessId, name, code,
    address: input.address?.trim() || existing?.address, timezone: input.timezone?.trim() || existing?.timezone || business.timezone,
    isDefault: existing?.isDefault ?? false, isActive: input.isActive ?? existing?.isActive ?? true,
    createdAt: existing?.createdAt ?? now, updatedAt: now,
  };
  return { db: { ...db, branches: existing ? replace(db.branches, branch.id, branch) : [...db.branches, branch] }, branch };
}

export function deleteBranch(db: WorkspaceDB, branchId: string): WorkspaceDB {
  const branch = db.branches.find((item) => item.id === branchId);
  if (!branch) return db;
  if (branch.isDefault) throw new ServiceError("The default branch cannot be deleted.");
  if (db.members.some((member) => member.businessId === branch.businessId && member.branchIds?.includes(branchId))) {
    throw new ServiceError("This branch is assigned to team members. Reassign them before deleting it.");
  }
  return { ...db, branches: db.branches.filter((item) => item.id !== branchId) };
}

export function upsertMember(
  db: WorkspaceDB,
  input: { id?: string; businessId: string; name: string; role: TeamMember["role"]; email?: string; phone?: string; branchIds?: string[] },
): WorkspaceDB {
  const name = input.name.trim();
  if (!name) throw new ServiceError("Name is required.");
  const business = db.businesses.find((item) => item.id === input.businessId);
  if (!business) throw new ServiceError("Business not found.");
  const existing = input.id ? db.members.find((member) => member.id === input.id && member.businessId === input.businessId) : undefined;
  if (input.id && !existing) throw new ServiceError("Team member not found in this business.");
  if (!existing) {
    const effectivePlanId = getEffectivePlanId(business);
    const plan = getSubscriptionPlan(effectivePlanId);
    const currentUsers = db.members.filter((member) => member.businessId === input.businessId).length;
    if (!hasAvailableUserSeat(effectivePlanId, currentUsers)) {
      throw new ServiceError(`${plan.title} includes up to ${plan.maxUsers} users. Upgrade the plan to add another team member.`);
    }
  }
  const branchIds = Array.from(new Set(input.branchIds ?? existing?.branchIds ?? db.branches.filter((item) => item.businessId === input.businessId && item.isActive).map((item) => item.id)));
  if (branchIds.some((branchId) => !db.branches.some((item) => item.id === branchId && item.businessId === input.businessId && item.isActive))) {
    throw new ServiceError("Choose active branches from this business only.");
  }
  const now = nowIso();
  if (existing) {
    return {
      ...db,
      members: replace(db.members, input.id!, {
        name, role: input.role, email: input.email?.trim() || undefined, phone: input.phone?.trim() || undefined, branchIds,
      }),
    };
  }
  const member: TeamMember = {
    id: createId("mem"), businessId: input.businessId, name, role: input.role,
    email: input.email?.trim() || undefined, phone: input.phone?.trim() || undefined, branchIds, createdAt: now,
  };
  return { ...db, members: [...db.members, member] };
}
export function deleteMember(db: WorkspaceDB, id: string): WorkspaceDB {
  const member = db.members.find((m) => m.id === id);
  if (member?.role === "owner") {
    const owners = db.members.filter((m) => m.businessId === member.businessId && m.role === "owner");
    if (owners.length <= 1) throw new ServiceError("A business needs at least one owner.");
  }
  return {
    ...db,
    members: db.members.filter((m) => m.id !== id),
    tasks: db.tasks.map((t) => (t.assignedTo === id ? { ...t, assignedTo: undefined } : t)),
  };
}

export function upsertCampaign(
  db: WorkspaceDB,
  input: {
    id?: string;
    businessId: string;
    name: string;
    channel: string;
    adSpend: number;
    clicks: number;
    impressions: number;
    leads: number;
    customers: number;
    revenue: number;
    date: string;
  },
): WorkspaceDB {
  if (!input.name.trim()) throw new ServiceError("Campaign name is required.");
  if (input.adSpend < 0 || input.clicks < 0 || input.impressions < 0 || input.leads < 0 || input.customers < 0 || input.revenue < 0) {
    throw new ServiceError("Marketing numbers cannot be negative.");
  }
  const now = nowIso();
  if (input.id) {
    return {
      ...db,
      campaigns: replace(db.campaigns, input.id, {
        name: input.name.trim(),
        channel: input.channel.trim() || "Other",
        adSpend: roundMoney(input.adSpend),
        clicks: Math.round(input.clicks),
        impressions: Math.round(input.impressions),
        leads: Math.round(input.leads),
        customers: Math.round(input.customers),
        revenue: roundMoney(input.revenue),
        date: input.date,
      }),
    };
  }
  const campaign: Campaign = {
    id: createId("cmp"),
    businessId: input.businessId,
    name: input.name.trim(),
    channel: input.channel.trim() || "Other",
    adSpend: roundMoney(input.adSpend),
    clicks: Math.round(input.clicks),
    impressions: Math.round(input.impressions),
    leads: Math.round(input.leads),
    customers: Math.round(input.customers),
    revenue: roundMoney(input.revenue),
    date: input.date,
    createdAt: now,
  };
  return { ...db, campaigns: [campaign, ...db.campaigns] };
}

export function deleteCampaign(db: WorkspaceDB, id: string): WorkspaceDB {
  return { ...db, campaigns: db.campaigns.filter((c) => c.id !== id) };
}

export function markNotificationRead(db: WorkspaceDB, id: string): WorkspaceDB {
  return { ...db, notifications: replace(db.notifications, id, { read: true }) };
}

export function markAllNotificationsRead(db: WorkspaceDB, businessId: string): WorkspaceDB {
  return {
    ...db,
    notifications: db.notifications.map((n) =>
      n.businessId === businessId ? { ...n, read: true } : n,
    ),
  };
}

export function mergeNotifications(db: WorkspaceDB, incoming: AppNotification[]): WorkspaceDB {
  const existingKeys = new Set(db.notifications.map((n) => `${n.businessId}:${n.key}`));
  const fresh = incoming.filter((n) => !existingKeys.has(`${n.businessId}:${n.key}`));
  if (!fresh.length) return db;
  return { ...db, notifications: [...fresh, ...db.notifications] };
}
