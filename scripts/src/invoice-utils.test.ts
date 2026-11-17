import test from "node:test";
import assert from "node:assert/strict";
import { calculateInvoiceTotals, financialYearFor, isValidGstin, nextInvoiceNumber, normaliseInvoiceCancellationReason, type InvoiceLineDraft } from "../../artifacts/business-os/src/lib/invoice-utils.ts";
import type { InvoiceRecord } from "../../artifacts/business-os/src/lib/domain.ts";

const line = (overrides: Partial<InvoiceLineDraft> = {}): InvoiceLineDraft => ({
  id: "line-1",
  description: "Sample item",
  hsnSac: "1234",
  quantity: "2",
  unit: "pcs",
  rate: "500",
  discount: "0",
  taxRate: "18",
  ...overrides,
});

const invoice = (invoiceNumber: string, businessId = "biz-1"): InvoiceRecord => ({
  id: invoiceNumber,
  businessId,
  invoiceNumber,
  status: "issued",
  issueDate: "2026-04-10",
  sellerName: "Seller",
  customerName: "Customer",
  placeOfSupply: "Rajasthan",
  supplyType: "intra",
  reverseCharge: false,
  items: [],
  subtotal: 0,
  discountTotal: 0,
  taxableValue: 0,
  cgst: 0,
  sgst: 0,
  igst: 0,
  taxTotal: 0,
  total: 0,
  createdAt: "2026-04-10T10:00:00.000Z",
  updatedAt: "2026-04-10T10:00:00.000Z",
});

test("GSTIN format validation accepts valid shape and rejects malformed values", () => {
  assert.equal(isValidGstin("08ABCDE1234F1Z5"), true);
  assert.equal(isValidGstin("08abcde1234f1z5"), true);
  assert.equal(isValidGstin("08ABCDE1234F1Z"), false);
  assert.equal(isValidGstin("not-a-gstin"), false);
});

test("financial year changes on 1 April", () => {
  assert.equal(financialYearFor("2026-03-31"), "25-26");
  assert.equal(financialYearFor("2026-04-01"), "26-27");
});

test("invoice number increments by business and financial year", () => {
  const saved = [invoice("INV/26-27/001"), invoice("INV/26-27/003"), invoice("INV/25-26/009"), invoice("INV/26-27/020", "biz-2")];
  assert.equal(nextInvoiceNumber(saved, "biz-1", "INV", "2026-04-10"), "INV/26-27/004");
  assert.equal(nextInvoiceNumber(saved, "biz-1", "TAX", "2026-04-10"), "TAX/26-27/001");
});

test("intra-state GST splits total tax evenly into CGST and SGST", () => {
  const result = calculateInvoiceTotals([line()], true, "intra");
  assert.equal(result.subtotal, 1000);
  assert.equal(result.taxableValue, 1000);
  assert.equal(result.cgst, 90);
  assert.equal(result.sgst, 90);
  assert.equal(result.igst, 0);
  assert.equal(result.total, 1180);
});

test("inter-state GST is recorded as IGST only", () => {
  const result = calculateInvoiceTotals([line()], true, "inter");
  assert.equal(result.cgst, 0);
  assert.equal(result.sgst, 0);
  assert.equal(result.igst, 180);
  assert.equal(result.total, 1180);
});

test("discount reduces taxable value before tax calculation", () => {
  const result = calculateInvoiceTotals([line({ discount: "100" })], true, "intra");
  assert.equal(result.discountTotal, 100);
  assert.equal(result.taxableValue, 900);
  assert.equal(result.taxTotal, 162);
  assert.equal(result.total, 1062);
});

test("non-GST invoices do not calculate tax even if a draft has a rate", () => {
  const result = calculateInvoiceTotals([line()], false, "intra");
  assert.equal(result.taxTotal, 0);
  assert.equal(result.total, 1000);
});

test("invoice cancellation reasons are trimmed and required", () => {
  assert.equal(normaliseInvoiceCancellationReason("  Duplicate invoice  "), "Duplicate invoice");
  assert.throws(() => normaliseInvoiceCancellationReason("  "), /cancellation reason/);
  assert.throws(() => normaliseInvoiceCancellationReason("no"), /at least 3 characters/);
});
