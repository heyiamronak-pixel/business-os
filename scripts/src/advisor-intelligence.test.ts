import test from "node:test";
import assert from "node:assert/strict";
import { advise, buildContext } from "../../artifacts/business-os/src/lib/engines.ts";
import {
  emptyDb,
  type Business,
  type Campaign,
  type Customer,
  type Lead,
  type Product,
  type Purchase,
  type Sale,
  type Supplier,
  type WorkspaceDB,
} from "../../artifacts/business-os/src/lib/domain.ts";

const business: Business = {
  id: "biz-ai-test",
  name: "North Star Store",
  industry: "retail",
  businessType: "Sole proprietor",
  country: "India",
  currency: "INR",
  timezone: "Asia/Kolkata",
  brandColors: [],
  themePreset: "professional",
  appearance: "light",
  enabledModules: [],
  moduleOrder: [],
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

const product: Product = {
  id: "product-ai-1",
  businessId: business.id,
  name: "Desk Lamp",
  sku: "LAMP-1",
  category: "Lighting",
  costPrice: 400,
  sellingPrice: 800,
  stock: 2,
  minStock: 5,
  unit: "pcs",
  createdAt: "2026-11-01T00:00:00.000Z",
  updatedAt: "2026-11-01T00:00:00.000Z",
};

const customer: Customer = {
  id: "customer-ai-1",
  businessId: business.id,
  name: "Aarav Mehta",
  email: "aarav@example.test",
  phone: "9000000001",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

const sale: Sale = {
  id: "sale-ai-1",
  businessId: business.id,
  customerId: customer.id,
  customerName: customer.name,
  items: [{
    productId: product.id,
    name: product.name,
    sku: product.sku,
    qty: 2,
    unitPrice: 800,
    costPrice: 400,
    discount: 0,
  }],
  subtotal: 1600,
  discount: 0,
  total: 1600,
  costTotal: 800,
  grossProfit: 800,
  paymentMethod: "credit",
  paymentStatus: "partial",
  paidAmount: 600,
  outstanding: 1000,
  createdAt: "2026-11-08T10:00:00.000Z",
};

const supplier: Supplier = {
  id: "supplier-ai-1",
  businessId: business.id,
  name: "North Star Wholesale",
  status: "active",
  createdAt: "2026-10-01T00:00:00.000Z",
  updatedAt: "2026-10-01T00:00:00.000Z",
};

const purchase: Purchase = {
  id: "purchase-ai-1",
  businessId: business.id,
  supplierId: supplier.id,
  supplierName: supplier.name,
  items: [{
    productId: product.id,
    name: product.name,
    sku: product.sku,
    quantity: 10,
    unitCost: 350,
    total: 3500,
  }],
  subtotal: 3500,
  total: 3500,
  paidAmount: 1500,
  balance: 2000,
  paymentStatus: "partial",
  createdAt: "2026-11-09T10:00:00.000Z",
  updatedAt: "2026-11-09T10:00:00.000Z",
};

const campaign: Campaign = {
  id: "campaign-ai-1",
  businessId: business.id,
  name: "November Search",
  channel: "Google Ads",
  adSpend: 5000,
  clicks: 500,
  impressions: 10000,
  leads: 50,
  customers: 5,
  revenue: 20000,
  date: "2026-11-06",
  createdAt: "2026-11-06T10:00:00.000Z",
};

function makeDb(overrides: Partial<WorkspaceDB> = {}): WorkspaceDB {
  return {
    ...emptyDb(),
    businesses: [business],
    products: [product],
    customers: [customer],
    sales: [sale],
    suppliers: [supplier],
    purchases: [purchase],
    campaigns: [campaign],
    ...overrides,
  };
}

function getContext(db = makeDb()) {
  return buildContext(db, business, new Date("2026-11-16T12:00:00.000Z"));
}

test("Advisor routes ordinary and Hinglish sales questions to a sales summary", () => {
  const reply = advise("Meri sales kaisi chal rahi hain?", getContext());
  assert.ok(reply.facts.some((fact) => fact.includes("1,600")));
  assert.ok(reply.facts.some((fact) => fact.includes("600")));
  assert.ok(reply.calculations.some((line) => line.toLowerCase().includes("revenue")));
});

test("Advisor recognises Hinglish collection questions and reports customer receivables", () => {
  const reply = advise("Kitna customer payment lena baaki hai?", getContext());
  assert.ok(reply.facts.some((fact) => fact.includes("1,000")));
  assert.ok(reply.recommendations.some((item) => item.toLowerCase().includes("sales")));
});

test("Advisor uses stock records to name low-stock products and recommends the purchase workflow", () => {
  const reply = advise("Mera stock kahan kam ho raha hai?", getContext());
  assert.ok(reply.facts.some((fact) => fact.includes("Desk Lamp")));
  assert.ok(reply.recommendations.some((item) => item.toLowerCase().includes("purchases")));
});

test("Advisor reads campaign metrics instead of returning the generic business summary", () => {
  const reply = advise("How are my marketing campaigns performing?", getContext());
  assert.ok(reply.facts.some((fact) => fact.includes("Google") || fact.includes("5,000")));
  assert.ok(reply.calculations.some((line) => line.includes("CPL")));
  assert.ok(reply.calculations.some((line) => line.includes("ROAS")));
});

test("Advisor reads supplier payables and purchase records", () => {
  const reply = advise("Show supplier payments and purchase balance", getContext());
  assert.ok(reply.facts.some((fact) => fact.includes("3,500")));
  assert.ok(reply.facts.some((fact) => fact.includes("2,000")));
  assert.ok(reply.recommendations.length > 0);
});

test("follow-up customer context includes every qualifying customer, not only the top five by spend", () => {
  const customers: Customer[] = Array.from({ length: 7 }, (_, index) => ({
    id: `follow-customer-${index}`,
    businessId: business.id,
    name: `Follow Customer ${index}`,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  }));
  const sales: Sale[] = customers.map((item, index) => ({
    ...sale,
    id: `follow-sale-${index}`,
    customerId: item.id,
    customerName: item.name,
    total: (7 - index) * 100,
    subtotal: (7 - index) * 100,
    paidAmount: (7 - index) * 100,
    outstanding: 0,
    paymentStatus: "paid",
    createdAt: "2026-08-01T10:00:00.000Z",
    items: [],
  }));
  const ctx = getContext(makeDb({ customers, sales }));
  assert.equal(ctx.topCustomers.length, 5);
  assert.equal(ctx.followUpCustomers.length, 7);
  const reply = advise("Which customers need follow-up?", ctx);
  assert.ok(reply.facts.length > 0);
});

test("Advisor does not invent marketing results when no campaign records exist", () => {
  const reply = advise("How are my ads performing?", getContext(makeDb({ campaigns: [] })));
  assert.ok(reply.facts.some((fact) => fact.includes("No marketing campaign metrics")));
  assert.ok(reply.recommendations.some((item) => item.toLowerCase().includes("add campaign")));
});

test("Advisor identifies due lead follow-ups and active pipeline value", () => {
  const lead: Lead = {
    id: "lead-ai-1", businessId: business.id, name: "Asha", company: "North Star Hotel",
    stage: "proposal", value: 125000, followUpAt: "2026-11-16T10:00:00.000Z",
    createdAt: "2026-11-10T10:00:00.000Z", updatedAt: "2026-11-10T10:00:00.000Z",
  };
  const ctx = getContext(makeDb({ leads: [lead] }));
  assert.equal(ctx.followUpLeads.length, 1);
  const reply = advise("Which leads need follow-up?", ctx);
  assert.ok(reply.facts.some((fact) => fact.includes("North Star Hotel")));
  assert.ok(reply.facts.some((fact) => fact.includes("125,000")));
});
