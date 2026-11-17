import {
  emptyDb,
  recommendModules,
  SYSTEM_EXPENSE_CATEGORIES,
  type Activity,
  type AppNotification,
  type Business,
  type Campaign,
  type Customer,
  type Expense,
  type ExpenseCategory,
  type IndustryId,
  type ModuleId,
  type PaymentMethod,
  type Product,
  type Purchase,
  type PurchaseItem,
  type Supplier,
  type SupplierStatus,
  type Sale,
  type SaleItem,
  type StockMovement,
  type Target,
  type TargetPeriod,
  type TaskItem,
  type TaskPriority,
  type TaskStatus,
  type TeamMember,
  type WorkspaceDB,
} from "@/lib/domain";
import { createId, nowIso, roundMoney } from "@/lib/utils";
import { generateSku } from "@/lib/sku";
import { nextTaskDueDate } from "@/lib/task-utils";

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
  const owner: TeamMember = {
    id: createId("mem"),
    businessId: business.id,
    name: input.ownerName?.trim() || "Owner",
    role: "owner",
    email: input.email?.trim() || undefined,
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
    suppliers: drop(db.suppliers),
    purchases: drop(db.purchases),
    sales: drop(db.sales),
    expenses: drop(db.expenses),
    expenseCategories: drop(db.expenseCategories),
    targets: drop(db.targets),
    members: drop(db.members),
    tasks: drop(db.tasks),
    campaigns: drop(db.campaigns),
    activity: drop(db.activity),
    notifications: drop(db.notifications),
    invoices: drop(db.invoices),
  };
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

export function deleteProduct(db: WorkspaceDB, id: string): WorkspaceDB {
  return { ...db, products: db.products.filter((p) => p.id !== id) };
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
  const product = db.products.find((p) => p.id === input.productId);
  if (!product) throw new ServiceError("Product not found.");
  if (input.quantity === 0) throw new ServiceError("Enter a quantity.");
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
    reason: input.reason?.trim() || undefined,
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
    const prev = db.customers.find((c) => c.id === input.id);
    if (!prev) throw new ServiceError("Customer not found.");
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

export function deleteCustomer(db: WorkspaceDB, id: string): WorkspaceDB {
  return { ...db, customers: db.customers.filter((c) => c.id !== id) };
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
    note?: string;
  },
): { db: WorkspaceDB; purchase: Purchase } {
  if (!input.items.length) throw new ServiceError("Add at least one product to this purchase.");
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

export function updatePurchasePayment(db: WorkspaceDB, purchaseId: string, amount: number): WorkspaceDB {
  const purchase = db.purchases.find((item) => item.id === purchaseId);
  if (!purchase) throw new ServiceError("Purchase not found.");
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new ServiceError("Enter a payment greater than zero.");
  }
  if (amount > purchase.balance) {
    throw new ServiceError("Payment cannot be greater than the outstanding balance.");
  }
  const paidAmount = roundMoney(purchase.paidAmount + amount);
  const balance = roundMoney(Math.max(0, purchase.total - paidAmount));
  const paymentStatus = balance <= 0 ? "paid" : "partial";
  return {
    ...db,
    purchases: replace(db.purchases, purchaseId, {
      paidAmount,
      balance,
      paymentStatus,
      updatedAt: nowIso(),
    }),
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
  for (const line of input.lines) {
    const product = productMap.get(line.productId);
    if (!product || product.businessId !== input.businessId) throw new ServiceError("A product in the cart is missing.");
    if (line.qty <= 0) throw new ServiceError(`Enter a quantity for ${product.name}.`);
    if (product.stock < line.qty) throw new ServiceError(`${product.name} only has ${product.stock} ${product.unit} in stock.`);
    if (line.unitPrice < 0) throw new ServiceError("Price cannot be negative.");
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
  const discount = roundMoney(Math.max(0, input.cartDiscount || 0));
  if (discount > subtotal) throw new ServiceError("Discount cannot exceed the subtotal.");
  const total = roundMoney(subtotal - discount);
  const costTotal = roundMoney(items.reduce((s, i) => s + i.costPrice * i.qty, 0));
  const grossProfit = roundMoney(total - costTotal);
  const paid =
    input.paymentMethod === "credit"
      ? roundMoney(Math.max(0, Math.min(total, input.paidAmount || 0)))
      : roundMoney(Math.max(0, input.paidAmount ?? total));
  const outstanding = roundMoney(Math.max(0, total - paid));
  const paymentStatus = outstanding <= 0 ? "paid" : paid > 0 ? "partial" : "unpaid";
  const now = nowIso();
  const customer = input.customerId ? db.customers.find((c) => c.id === input.customerId) : undefined;
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
    note: input.note?.trim() || undefined,
    createdAt: now,
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

export function recordPayment(db: WorkspaceDB, saleId: string, amount: number): WorkspaceDB {
  const sale = db.sales.find((s) => s.id === saleId);
  if (!sale) throw new ServiceError("Sale not found.");
  if (!Number.isFinite(amount) || amount <= 0) throw new ServiceError("Enter a payment amount greater than zero.");
  const currentPaid = Number.isFinite(sale.paidAmount) ? Math.min(sale.total, Math.max(0, sale.paidAmount)) : 0;
  const currentOutstanding = roundMoney(Math.max(0, sale.total - currentPaid));
  if (amount > currentOutstanding) throw new ServiceError("Payment cannot be greater than the outstanding balance.");
  const paid = roundMoney(currentPaid + amount);
  const outstanding = roundMoney(Math.max(0, sale.total - paid));
  const paymentStatus = outstanding <= 0 ? "paid" : "partial";
  return {
    ...db,
    sales: replace(db.sales, saleId, { paidAmount: paid, outstanding, paymentStatus }),
  };
}

export function deleteSale(db: WorkspaceDB, saleId: string): WorkspaceDB {
  const sale = db.sales.find((s) => s.id === saleId);
  if (!sale) return db;
  const now = nowIso();
  let products = db.products;
  let movements = db.movements;
  for (const item of sale.items) {
    const product = products.find((p) => p.id === item.productId);
    if (!product) continue;
    const next = roundMoney(product.stock + item.qty);
    products = replace(products, product.id, { stock: next, updatedAt: now });
    movements = [
      {
        id: createId("mov"),
        businessId: sale.businessId,
        productId: product.id,
        type: "in",
        quantity: item.qty,
        resultingStock: next,
        reason: "Sale reversed",
        refId: sale.id,
        createdAt: now,
      },
      ...movements,
    ];
  }
  return {
    ...db,
    products,
    movements,
    sales: db.sales.filter((s) => s.id !== saleId),
    activity: db.activity.filter((a) => a.refId !== saleId),
  };
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
  },
): WorkspaceDB {
  if (!input.category.trim()) throw new ServiceError("Choose a category.");
  if (!(input.amount > 0)) throw new ServiceError("Amount must be greater than zero.");
  const now = nowIso();
  if (input.id) {
    return {
      ...db,
      expenses: replace(db.expenses, input.id, {
        category: input.category.trim(),
        amount: roundMoney(input.amount),
        vendor: input.vendor?.trim() || undefined,
        notes: input.notes?.trim() || undefined,
        date: input.date,
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
    createdAt: now,
  };
  return { ...db, expenses: [expense, ...db.expenses] };
}

export function deleteExpense(db: WorkspaceDB, id: string): WorkspaceDB {
  return { ...db, expenses: db.expenses.filter((e) => e.id !== id) };
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
    return { ...db, tasks: replace(db.tasks, input.id, {
      title, description: input.description?.trim() || undefined, assignedTo: input.assignedTo || undefined,
      priority: input.priority, dueDate: input.dueDate || undefined, reminder: input.reminder || undefined,
      recurrence: input.recurrence ?? "none", status: input.status ?? previous.status, updatedAt: now,
    }) };
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
export function upsertMember(
  db: WorkspaceDB,
  input: { id?: string; businessId: string; name: string; role: TeamMember["role"]; email?: string; phone?: string },
): WorkspaceDB {
  const name = input.name.trim();
  if (!name) throw new ServiceError("Name is required.");
  const now = nowIso();
  if (input.id) {
    return {
      ...db,
      members: replace(db.members, input.id, {
        name,
        role: input.role,
        email: input.email?.trim() || undefined,
        phone: input.phone?.trim() || undefined,
      }),
    };
  }
  const member: TeamMember = {
    id: createId("mem"),
    businessId: input.businessId,
    name,
    role: input.role,
    email: input.email?.trim() || undefined,
    phone: input.phone?.trim() || undefined,
    createdAt: now,
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
