import test from "node:test";
import assert from "node:assert/strict";
import {
  createPurchase,
  deleteSupplier,
  archiveProduct,
  archiveCustomer,
  archiveExpense,
  deleteExpense,
  adjustStock,
  completeSale,
  deleteProduct,
  deleteCustomer,
  reverseSale,
  recordPayment,
  recordSaleReturn,
  recordPurchaseReturn,
  upsertCustomer,
  upsertExpense,
  upsertProduct,
  updatePurchasePayment,
  updateBusiness,
  upsertSupplier,
} from "../../artifacts/business-os/src/lib/services.ts";
import { emptyDb, type Product } from "../../artifacts/business-os/src/lib/domain.ts";
import { financeSnapshot } from "../../artifacts/business-os/src/lib/engines.ts";

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

test("business profile updates normalise websites and reject invalid profile values", () => {
  const db = {
    ...emptyDb(),
    businesses: [{
      id: "business-1", name: "Test Store", industry: "retail" as const, businessType: "Sole proprietor",
      country: "India", currency: "INR", timezone: "Asia/Kolkata", brandColors: [],
      themePreset: "professional" as const, appearance: "light" as const, enabledModules: ["products" as const],
      moduleOrder: ["products" as const], createdAt: "2026-11-01T00:00:00.000Z", updatedAt: "2026-11-01T00:00:00.000Z",
    }],
  };
  const updated = updateBusiness(db, "business-1", { website: "example.com", description: "  Retail store  ", email: "owner@example.com" });
  assert.equal(updated.businesses[0].website, "https://example.com");
  assert.equal(updated.businesses[0].description, "Retail store");
  assert.throws(() => updateBusiness(updated, "business-1", { website: "javascript:alert(1)" }), /valid business website/);
  assert.throws(() => updateBusiness(updated, "business-1", { email: "not-an-email" }), /valid business email/);
  assert.throws(() => updateBusiness(updated, "business-1", { description: "x".repeat(501) }), /500 characters/);
  assert.throws(() => updateBusiness(updated, "missing", { name: "Another" }), /not found/);
});

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

test("supplier document references prevent duplicate receipts and due dates are validated", () => {
  const { db, supplier } = setup();
  const first = createPurchase(db, {
    businessId: "business-1",
    supplierId: supplier.id,
    items: [{ productId: product.id, quantity: 2, unitCost: 35 }],
    paidAmount: 0,
    supplierReference: "NS-2026-104",
    dueDate: "2026-11-30",
  });
  assert.equal(first.purchase.supplierReference, "NS-2026-104");
  assert.equal(first.purchase.dueDate, "2026-11-30");
  assert.throws(() => createPurchase(first.db, {
    businessId: "business-1",
    supplierId: supplier.id,
    items: [{ productId: product.id, quantity: 2, unitCost: 35 }],
    paidAmount: 0,
    supplierReference: " ns-2026-104 ",
  }), /already been recorded/);
  assert.throws(() => createPurchase(db, {
    businessId: "business-1",
    supplierId: supplier.id,
    items: [{ productId: product.id, quantity: 1, unitCost: 10 }],
    paidAmount: 0,
    dueDate: "2026-02-31",
  }), /valid supplier payment due date/);
});

test("supplier purchase returns reduce stock, purchase balances and record supplier refunds", () => {
  const { db, supplier } = setup();
  const purchaseResult = createPurchase(db, {
    businessId: "business-1",
    supplierId: supplier.id,
    items: [{ productId: product.id, quantity: 2, unitCost: 40 }],
    paidAmount: 80,
    initialPaymentMethod: "bank",
  });
  assert.equal(purchaseResult.db.products[0].stock, 7);
  assert.throws(() => recordPurchaseReturn(purchaseResult.db, purchaseResult.purchase.id, {
    businessId: "business-1",
    items: [{ productId: product.id, quantity: 1 }],
    reason: "Return damaged goods",
  }), /supplier refund due/);
  const partial = recordPurchaseReturn(purchaseResult.db, purchaseResult.purchase.id, {
    businessId: "business-1",
    items: [{ productId: product.id, quantity: 1 }],
    reason: "Return damaged goods",
    refundMethod: "upi",
    refundReference: "SUP-REF-1",
  });
  const updated = partial.purchases.find((entry) => entry.id === purchaseResult.purchase.id)!;
  assert.equal(updated.total, 40);
  assert.equal(updated.paidAmount, 40);
  assert.equal(updated.balance, 0);
  assert.equal(updated.items[0].quantity, 1);
  assert.equal(partial.products[0].stock, 6);
  assert.equal(partial.purchaseReturns[0].amount, 40);
  assert.equal(partial.purchaseReturns[0].refundAmount, 40);
  assert.throws(() => recordPurchaseReturn(partial, purchaseResult.purchase.id, {
    businessId: "business-1",
    items: [{ productId: product.id, quantity: 2 }],
    reason: "Too many goods",
  }), /greater than the quantity/);
});

test("supplier purchase returns cannot reduce stock below zero or update another business", () => {
  const { db, supplier } = setup();
  const purchaseResult = createPurchase(db, {
    businessId: "business-1",
    supplierId: supplier.id,
    items: [{ productId: product.id, quantity: 2, unitCost: 40 }],
    paidAmount: 0,
  });
  const lowStock = {
    ...purchaseResult.db,
    products: purchaseResult.db.products.map((entry) => ({ ...entry, stock: 0 })),
  };
  assert.throws(() => recordPurchaseReturn(lowStock, purchaseResult.purchase.id, {
    businessId: "business-1",
    items: [{ productId: product.id, quantity: 1 }],
    reason: "Return to supplier",
  }), /only 0 remains in stock/);
  assert.throws(() => recordPurchaseReturn(purchaseResult.db, purchaseResult.purchase.id, {
    businessId: "business-2",
    items: [{ productId: product.id, quantity: 1 }],
    reason: "Cross business attempt",
  }), /not found in this business/);
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
  assert.equal(result.purchase.payments?.[0].amount, 30);
  assert.equal(result.purchase.payments?.[0].method, "bank");
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
  const paid = updatePurchasePayment(result.db, result.purchase.id, 30, "upi", "UTR-123");
  const purchase = paid.purchases[0];

  assert.equal(purchase.paidAmount, 50);
  assert.equal(purchase.balance, 0);
  assert.equal(purchase.paymentStatus, "paid");
  assert.equal(purchase.payments?.length, 2);
  assert.equal(purchase.payments?.[1].method, "upi");
  assert.equal(purchase.payments?.[1].reference, "UTR-123");
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

test("checkout rejects overpayment, negative discounts and combined duplicate-line stock oversell", () => {
  const { db } = setup();
  assert.throws(() => completeSale(db, {
    businessId: "business-1",
    lines: [{ productId: product.id, qty: 1, unitPrice: 80, discount: 0 }],
    cartDiscount: 0,
    paymentMethod: "cash",
    paidAmount: 81,
  }), /between zero and the sale total/);
  assert.throws(() => completeSale(db, {
    businessId: "business-1",
    lines: [{ productId: product.id, qty: 1, unitPrice: 80, discount: 0 }],
    cartDiscount: -1,
    paymentMethod: "cash",
    paidAmount: 80,
  }), /non-negative amount/);
  assert.throws(() => completeSale(db, {
    businessId: "business-1",
    lines: [
      { productId: product.id, qty: 3, unitPrice: 80, discount: 0 },
      { productId: product.id, qty: 3, unitPrice: 80, discount: 0 },
    ],
    cartDiscount: 0,
    paymentMethod: "credit",
    paidAmount: 0,
  }), /across this cart/);
  assert.equal(db.products[0].stock, 5);
  assert.equal(db.sales.length, 0);
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


test("stock movements require a reason, stay within the business, and record the exact adjustment", () => {
  const { db } = setup();
  assert.throws(() => adjustStock(db, {
    businessId: "business-1", productId: product.id, type: "out", quantity: 1,
  }), /movement reason/);
  assert.throws(() => adjustStock(db, {
    businessId: "business-2", productId: product.id, type: "out", quantity: 1, reason: "Damage",
  }), /this business/);

  const updated = adjustStock(db, {
    businessId: "business-1", productId: product.id, type: "adjustment", quantity: 3, reason: "Cycle count",
  });
  assert.equal(updated.products[0].stock, 3);
  assert.equal(updated.movements[0].quantity, -2);
  assert.equal(updated.movements[0].reason, "Cycle count");
});

test("products with transaction history are archived instead of deleted", () => {
  const { db } = setup();
  const withMovement = adjustStock(db, {
    businessId: "business-1", productId: product.id, type: "in", quantity: 1, reason: "Opening correction",
  });
  assert.throws(() => deleteProduct(withMovement, product.id), /transaction history/);
  const archived = archiveProduct(withMovement, product.id);
  assert.equal(archived.products[0].archived, true);
  assert.equal(archiveProduct(archived, product.id, false).products[0].archived, false);
});

test("customers linked to transactions are archived and cannot be deleted", () => {
  const created = upsertSupplier(emptyDb(), { businessId: "business-1", name: "Supplier" });
  const customerResult = upsertCustomer(created.db, {
    businessId: "business-1", name: "Customer One", phone: "9999999999",
  });
  const withSale = completeSale({
    ...customerResult.db,
    products: [product],
  }, {
    businessId: "business-1",
    customerId: customerResult.customer.id,
    lines: [{ productId: product.id, qty: 1, unitPrice: 80, discount: 0 }],
    cartDiscount: 0,
    paymentMethod: "cash",
    paidAmount: 80,
  }).db;
  assert.throws(() => deleteCustomer(withSale, customerResult.customer.id), /business history/);
  const archived = archiveCustomer(withSale, customerResult.customer.id);
  assert.equal(archived.customers[0].archived, true);
  assert.equal(archiveCustomer(archived, customerResult.customer.id, false).customers[0].archived, false);
});

test("sale reversal restores stock once, preserves the sale, and requires a reason", () => {
  const { db } = setup();
  const created = completeSale(db, {
    businessId: "business-1",
    lines: [{ productId: product.id, qty: 2, unitPrice: 80, discount: 0 }],
    cartDiscount: 0,
    paymentMethod: "cash",
    paidAmount: 160,
  });
  assert.equal(created.db.products[0].stock, 3);
  assert.throws(() => reverseSale(created.db, created.sale.id, "  "), /reversal reason/);

  const reversed = reverseSale(created.db, created.sale.id, "Incorrect checkout", { method: "cash", reference: "REF-001" });
  assert.equal(reversed.products[0].stock, 5);
  assert.equal(reversed.sales[0].status, "reversed");
  assert.equal(reversed.sales[0].reversalReason, "Incorrect checkout");
  assert.equal(reversed.sales[0].refunds?.[0].amount, 160);
  assert.equal(financeSnapshot(reversed, "business-1").cashIn, 0);
  assert.equal(financeSnapshot(reversed, "business-1").revenue, 0);
  assert.equal(reversed.movements[0].refId, created.sale.id);
  assert.equal(reversed.activity[0].refId, created.sale.id);
  assert.throws(() => reverseSale(reversed, created.sale.id, "Duplicate reversal"), /already been reversed/);
  assert.throws(() => recordPayment(reversed, created.sale.id, 1), /cannot receive another payment/);
});


test("partial and full sale returns restore only returned stock and reconcile revenue, profit and cash", () => {
  const { db } = setup();
  const created = completeSale(db, {
    businessId: "business-1",
    lines: [{ productId: product.id, qty: 2, unitPrice: 80, discount: 0 }],
    cartDiscount: 0,
    paymentMethod: "cash",
    paidAmount: 160,
  });
  assert.equal(created.db.products[0].stock, 3);
  assert.throws(() => recordSaleReturn(created.db, created.sale.id, {
    businessId: "business-1", items: [{ productId: product.id, quantity: 1 }], reason: "Customer return",
  }), /refund of 80/);

  const partial = recordSaleReturn(created.db, created.sale.id, {
    businessId: "business-1", items: [{ productId: product.id, quantity: 1 }],
    reason: "Customer return", refundMethod: "upi", refundReference: "UTR-RET-1",
  });
  const saleAfterPartial = partial.sales.find((sale) => sale.id === created.sale.id)!;
  assert.equal(saleAfterPartial.total, 80);
  assert.equal(saleAfterPartial.items[0].qty, 1);
  assert.equal(saleAfterPartial.paidAmount, 80);
  assert.equal(saleAfterPartial.outstanding, 0);
  assert.equal(saleAfterPartial.refunds?.[0].amount, 80);
  assert.equal(partial.products[0].stock, 4);
  assert.equal(partial.returns[0].amount, 80);
  assert.equal(financeSnapshot(partial, "business-1").revenue, 80);
  assert.equal(financeSnapshot(partial, "business-1").grossProfit, 40);
  assert.equal(financeSnapshot(partial, "business-1").cashIn, 80);

  const full = recordSaleReturn(partial, created.sale.id, {
    businessId: "business-1", items: [{ productId: product.id, quantity: 1 }],
    reason: "Second item returned", refundMethod: "upi", refundReference: "UTR-RET-2",
  });
  const finalSale = full.sales.find((sale) => sale.id === created.sale.id)!;
  assert.equal(finalSale.total, 0);
  assert.equal(finalSale.paidAmount, 0);
  assert.equal(finalSale.items.length, 0);
  assert.equal(full.products[0].stock, 5);
  assert.equal(finalSale.refunds?.reduce((sum, entry) => sum + entry.amount, 0), 160);
  assert.equal(financeSnapshot(full, "business-1").revenue, 0);
  assert.equal(financeSnapshot(full, "business-1").grossProfit, 0);
  assert.equal(financeSnapshot(full, "business-1").cashIn, 0);
});

test("sale returns reject excessive quantities and preserve outstanding balances when no refund is due", () => {
  const { db } = setup();
  const created = completeSale(db, {
    businessId: "business-1", lines: [{ productId: product.id, qty: 2, unitPrice: 80, discount: 0 }],
    cartDiscount: 0, paymentMethod: "credit", paidAmount: 40,
  });
  assert.throws(() => recordSaleReturn(created.db, created.sale.id, {
    businessId: "business-1", items: [{ productId: product.id, quantity: 3 }], reason: "Wrong quantity",
  }), /greater than the quantity/);
  const returned = recordSaleReturn(created.db, created.sale.id, {
    businessId: "business-1", items: [{ productId: product.id, quantity: 1 }], reason: "One item returned",
  });
  const sale = returned.sales.find((item) => item.id === created.sale.id)!;
  assert.equal(sale.total, 80);
  assert.equal(sale.paidAmount, 40);
  assert.equal(sale.outstanding, 40);
  assert.equal(sale.paymentStatus, "partial");
  assert.equal(returned.products[0].stock, 4);
  assert.equal(financeSnapshot(returned, "business-1").cashIn, 40);
});

test("expense dates and amounts are validated and expense updates stay within the business", () => {
  const valid = upsertExpense(emptyDb(), {
    businessId: "business-1",
    category: "Travel",
    amount: 125.5,
    date: "2026-11-17",
  });
  assert.equal(valid.expenses[0].amount, 125.5);
  assert.throws(() => upsertExpense(valid, {
    businessId: "business-1",
    category: "Travel",
    amount: Number.POSITIVE_INFINITY,
    date: "2026-11-17",
  }), /valid number/);
  assert.throws(() => upsertExpense(valid, {
    businessId: "business-1",
    category: "Travel",
    amount: 10,
    date: "not-a-date",
  }), /valid expense date/);
  assert.throws(() => upsertExpense(valid, {
    id: valid.expenses[0].id,
    businessId: "business-2",
    category: "Travel",
    amount: 10,
    date: "2026-11-17",
  }), /not found in this business/);
});

test("editing a product cannot bypass the inventory movement ledger", () => {
  const { db } = setup();
  assert.throws(() => upsertProduct(db, {
    id: product.id,
    businessId: "business-1",
    name: product.name,
    sku: product.sku,
    costPrice: product.costPrice,
    sellingPrice: product.sellingPrice,
    stock: 4,
    minStock: product.minStock,
    unit: product.unit,
  }), /Use Inventory to change stock/);
});


test("sale collections keep method/reference and reversal requires refund details", () => {
  const { db } = setup();
  const created = completeSale(db, {
    businessId: "business-1",
    lines: [{ productId: product.id, qty: 2, unitPrice: 80, discount: 0 }],
    cartDiscount: 0,
    paymentMethod: "credit",
    paidAmount: 20,
  });
  const collected = recordPayment(created.db, created.sale.id, 30, "upi", "UTR-SALE-2");
  const sale = collected.sales.find((item) => item.id === created.sale.id)!;
  assert.equal(sale.paidAmount, 50);
  assert.equal(sale.payments?.length, 2);
  assert.equal(sale.payments?.[1].method, "upi");
  assert.equal(sale.payments?.[1].reference, "UTR-SALE-2");
  assert.equal(financeSnapshot(collected, "business-1").cashIn, 50);
  assert.throws(() => reverseSale(collected, sale.id, "Customer cancellation"), /refund method/);
  const reversed = reverseSale(collected, sale.id, "Customer cancellation", { method: "bank", reference: "REF-777" });
  const reversedSale = reversed.sales.find((item) => item.id === sale.id)!;
  assert.equal(reversedSale.status, "reversed");
  assert.equal(reversedSale.refunds?.[0].amount, 50);
  assert.equal(reversedSale.refunds?.[0].method, "bank");
  assert.equal(reversedSale.refunds?.[0].reference, "REF-777");
});


test("expense entries retain payment details and archive out of reporting", () => {
  const created = upsertExpense(emptyDb(), {
    businessId: "business-1",
    category: "Travel",
    amount: 250,
    date: "2026-11-17",
    paymentMethod: "upi",
    reference: "UTR-EXP-1",
  });
  const expense = created.expenses[0];
  assert.equal(expense.paymentMethod, "upi");
  assert.equal(expense.reference, "UTR-EXP-1");
  assert.throws(() => deleteExpense(created, expense.id), /archived, not deleted/);
  const archived = archiveExpense(created, "business-1", expense.id);
  assert.equal(archived.expenses[0].archived, true);
  assert.equal(financeSnapshot(archived, "business-1").expenses, 0);
  assert.equal(archiveExpense(archived, "business-1", expense.id, false).expenses[0].archived, false);
  assert.throws(() => archiveExpense(archived, "business-2", expense.id), /not found in this business/);
});
