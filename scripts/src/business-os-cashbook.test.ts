import test from "node:test";
import assert from "node:assert/strict";
import { cashbookEntries } from "../../artifacts/business-os/src/lib/engines.ts";
import { emptyDb, type WorkspaceDB } from "../../artifacts/business-os/src/lib/domain.ts";

test("cashbook includes sales receipts, refunds, supplier payments and active expenses with clear directions", () => {
  const base = emptyDb();
  const db: WorkspaceDB = {
    ...base,
    sales: [{
      id: "sale-1", businessId: "biz-1", customerName: "Customer",
      items: [], subtotal: 100, discount: 0, total: 100, costTotal: 0, grossProfit: 100,
      paymentMethod: "upi", paymentStatus: "paid", paidAmount: 100, outstanding: 0,
      payments: [{ id: "pay-1", amount: 100, method: "upi", reference: "UPI-1", receivedAt: "2026-11-10T10:00:00.000Z" }],
      refunds: [{ id: "refund-1", amount: 20, method: "upi", reference: "REF-1", refundedAt: "2026-11-11T10:00:00.000Z" }],
      createdAt: "2026-11-10T10:00:00.000Z", status: "completed",
    }],
    purchases: [{
      id: "purchase-1", businessId: "biz-1", supplierId: "sup-1", supplierName: "Supplier",
      items: [], subtotal: 60, total: 60, paidAmount: 30, balance: 30, paymentStatus: "partial",
      payments: [{ id: "ppay-1", amount: 30, method: "bank", reference: "BANK-1", paidAt: "2026-11-12T10:00:00.000Z" }],
      supplierReference: "SUP-2026-1", createdAt: "2026-11-12T10:00:00.000Z", updatedAt: "2026-11-12T10:00:00.000Z",
    }],
    expenses: [{
      id: "expense-1", businessId: "biz-1", category: "Rent", amount: 25, vendor: "Landlord",
      date: "2026-11-13", paymentMethod: "cash", reference: "CASH-1", createdAt: "2026-11-13T00:00:00.000Z",
    }, {
      id: "expense-archived", businessId: "biz-1", category: "Old", amount: 90, date: "2026-11-13",
      archived: true, createdAt: "2026-11-13T00:00:00.000Z",
    }],
  };
  const entries = cashbookEntries(db, "biz-1");
  assert.equal(entries.length, 4);
  assert.deepEqual(entries.map((entry) => entry.direction).sort(), ["in", "out", "out", "out"]);
  assert.equal(entries.reduce((sum, entry) => sum + (entry.direction === "in" ? entry.amount : 0), 0), 100);
  assert.equal(entries.reduce((sum, entry) => sum + (entry.direction === "out" ? entry.amount : 0), 0), 75);
  assert.equal(entries.find((entry) => entry.type === "sale_refund")?.reference, "REF-1");
  assert.equal(entries.find((entry) => entry.type === "supplier_payment")?.party, "Supplier");
});

test("cashbook is scoped to the requested business and selected date range", () => {
  const base = emptyDb();
  const db: WorkspaceDB = {
    ...base,
    expenses: [{
      id: "inside", businessId: "biz-1", category: "Travel", amount: 40, date: "2026-11-15", createdAt: "2026-11-15T00:00:00.000Z",
    }, {
      id: "outside", businessId: "biz-2", category: "Travel", amount: 80, date: "2026-11-15", createdAt: "2026-11-15T00:00:00.000Z",
    }],
  };
  const range = { from: new Date("2026-11-15T00:00:00"), to: new Date("2026-11-15T23:59:59.999"), label: "Test" };
  const entries = cashbookEntries(db, "biz-1", range);
  assert.equal(entries.length, 1);
  assert.equal(entries[0].amount, 40);
});

