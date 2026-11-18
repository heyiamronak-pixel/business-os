import test from "node:test";
import assert from "node:assert/strict";
import {
  createPurchase,
  deleteSupplier,
  recordPayment,
  updatePurchasePayment,
  upsertSupplier,
} from "../../artifacts/business-os/src/lib/services.ts";
import { emptyDb, type Product } from "../../artifacts/business-os/src/lib/domain.ts";

const product: Product = {
  id: "product-1",
  businessId: "business-1",
  name: "Desk lamp",
  sku: "LAMP-001",
  category: "Lighting",
  costPrice: 40,
  sellingPrice: 80,
  stock: 5,
  minStock: 1,
  unit: "pcs",
  createdAt: "2026-11-16T09:00:00.000Z",
  updatedAt: "2026-11-16T09:00:00.000Z",
};

function setup() {
  const created = upsertSupplier(emptyDb(), {
    businessId: "business-1",
    name: "North Star Supplies",
    email: "orders@northstar.example",
    status: "active",
  });
  return { db: { ...created.db, products: [product] }, supplier: created.supplier };
}

test("supplier creation normalises email and blocks duplicate business names", () => {
  const { db, supplier } = setup();
  assert.equal(supplier.email, "orders@northstar.example");
  assert.throws(
    () => upsertSupplier(db, { businessId: "business-1", name: " north star supplies " }),
    /already exists/,
  );
  assert.throws(
    () => upsertSupplier(db, { businessId: "business-1", name: "Invalid", email: "not-an-email" }),
    /valid supplier email/,
  );
});

test("purchase receipt increases stock and stores a partial supplier balance", () => {
  const { db, supplier } = setup();
  const result = createPurchase(db, {
    businessId: "business-1",
    supplierId: supplier.id,
    items: [{ productId: product.id, quantity: 2, unitCost: 35 }],
    paidAmount: 30,
    note: "Supplier invoice NS-104",
  });

  assert.equal(result.purchase.total, 70);
  assert.equal(result.purchase.paidAmount, 30);
  assert.equal(result.purchase.balance, 40);
  assert.equal(result.purchase.paymentStatus, "partial");
  assert.equal(result.db.products[0].stock, 7);
  assert.equal(result.db.movements[0].type, "in");
  assert.equal(result.db.movements[0].quantity, 2);
  assert.equal(result.db.movements[0].refId, result.purchase.id);
});

test("supplier payments reduce the outstanding balance and reject overpayment", () => {
  const { db, supplier } = setup();
  const result = createPurchase(db, {
    businessId: "business-1",
    supplierId: supplier.id,
    items: [{ productId: product.id, quantity: 1, unitCost: 50 }],
    paidAmount: 20,
  });
  const paid = updatePurchasePayment(result.db, result.purchase.id, 30);
  const purchase = paid.purchases[0];

  assert.equal(purchase.paidAmount, 50);
  assert.equal(purchase.balance, 0);
  assert.equal(purchase.paymentStatus, "paid");
  assert.throws(
    () => updatePurchasePayment(result.db, result.purchase.id, 31),
    /greater than the outstanding balance/,
  );
});

test("purchase creation rejects inactive suppliers and cross-business records", () => {
  const { db, supplier } = setup();
  const inactive = upsertSupplier(db, {
    id: supplier.id,
    businessId: "business-1",
    name: supplier.name,
    status: "inactive",
  }).db;
  assert.throws(
    () => createPurchase(inactive, {
      businessId: "business-1",
      supplierId: supplier.id,
      items: [{ productId: product.id, quantity: 1, unitCost: 10 }],
      paidAmount: 0,
    }),
    /inactive/,
  );
  assert.throws(
    () => createPurchase(db, {
      businessId: "business-2",
      supplierId: supplier.id,
      items: [{ productId: product.id, quantity: 1, unitCost: 10 }],
      paidAmount: 0,
    }),
    /supplier from this business/,
  );
});

test("supplier with purchase history is protected from deletion", () => {
  const { db, supplier } = setup();
  const purchase = createPurchase(db, {
    businessId: "business-1",
    supplierId: supplier.id,
    items: [{ productId: product.id, quantity: 1, unitCost: 20 }],
    paidAmount: 0,
  });
  assert.throws(() => deleteSupplier(purchase.db, supplier.id), /purchase history/);
});

test("customer collection rejects amounts above the remaining sale balance", () => {
  const { db } = setup();
  const sale = {
    id: "sale-collection",
    businessId: "business-1",
    customerId: undefined,
    customerName: "Walk-in",
    items: [],
    subtotal: 100,
    discount: 0,
    total: 100,
    costTotal: 0,
    grossProfit: 100,
    paymentMethod: "credit" as const,
    paymentStatus: "partial" as const,
    paidAmount: 60,
    outstanding: 40,
    createdAt: "2026-11-16T10:00:00.000Z",
  };
  const withSale = { ...db, sales: [sale] };
  assert.throws(() => recordPayment(withSale, sale.id, 41), /greater than the outstanding balance/);
  const paid = recordPayment(withSale, sale.id, 40);
  assert.equal(paid.sales[0].paidAmount, 100);
  assert.equal(paid.sales[0].outstanding, 0);
  assert.equal(paid.sales[0].paymentStatus, "paid");
});
