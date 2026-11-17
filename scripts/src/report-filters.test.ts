import test from "node:test";
import assert from "node:assert/strict";
import {
  activeReportFilterCount,
  emptyReportFilters,
  filterReportRecords,
  matchesReportFilters,
  type ReportFilterRecord,
} from "../../artifacts/business-os/src/lib/report-filters.ts";

const records: ReportFilterRecord[] = [
  {
    id: "sale-1",
    recordType: "sale",
    amount: 2500,
    status: "paid",
    paymentMethod: "upi",
    category: "Sales",
    contact: "Aarav Sharma",
    details: "Blue shirt, cotton trousers",
    productIds: ["shirt-1", "trouser-1"],
  },
  {
    id: "sale-2",
    recordType: "sale",
    amount: 900,
    status: "unpaid",
    paymentMethod: "cash",
    category: "Sales",
    contact: "Meera",
    details: "Shoes",
    productIds: ["shoe-1"],
  },
  {
    id: "expense-1",
    recordType: "expense",
    amount: 1200,
    status: "recorded",
    paymentMethod: "",
    category: "Rent",
    contact: "Main store",
    details: "Monthly shop rent",
    productIds: [],
  },
  {
    id: "purchase-1",
    recordType: "purchase",
    amount: 4200,
    status: "pending",
    paymentMethod: "",
    category: "Purchases",
    contact: "North Star Textiles",
    details: "Blue shirt stock",
    productIds: ["shirt-1"],
  },
];

test("an empty report filter leaves every record visible", () => {
  const filters = emptyReportFilters();
  assert.equal(matchesReportFilters(records[0], filters), true);
  assert.equal(filterReportRecords(records, filters).length, records.length);
  assert.equal(activeReportFilterCount(filters), 0);
});

test("product selection includes matching sales and purchases", () => {
  const filters = { ...emptyReportFilters(), productIds: ["shirt-1"] };
  assert.deepEqual(
    filterReportRecords(records, filters).map((record) => record.id),
    ["sale-1", "purchase-1"],
  );
});

test("multiple selected products are treated as OR within the product group", () => {
  const filters = { ...emptyReportFilters(), productIds: ["shoe-1", "trouser-1"] };
  assert.deepEqual(
    filterReportRecords(records, filters).map((record) => record.id),
    ["sale-1", "sale-2"],
  );
});

test("different filter groups are combined with AND", () => {
  const filters = {
    ...emptyReportFilters(),
    recordTypes: ["sale"] as const,
    statuses: ["paid"],
  };
  assert.deepEqual(
    filterReportRecords(records, filters).map((record) => record.id),
    ["sale-1"],
  );
});

test("amount range filters include both boundary values", () => {
  const filters = { ...emptyReportFilters(), minAmount: "900", maxAmount: "2500" };
  assert.deepEqual(
    filterReportRecords(records, filters).map((record) => record.id),
    ["sale-1", "sale-2", "expense-1"],
  );
});

test("contact search is case-insensitive", () => {
  const filters = { ...emptyReportFilters(), contactQuery: "NORTH STAR" };
  assert.deepEqual(
    filterReportRecords(records, filters).map((record) => record.id),
    ["purchase-1"],
  );
});

test("payment mode, category and record type can be combined", () => {
  const filters = {
    ...emptyReportFilters(),
    recordTypes: ["sale"] as const,
    paymentMethods: ["upi"],
    categories: ["Sales"],
  };
  assert.deepEqual(
    filterReportRecords(records, filters).map((record) => record.id),
    ["sale-1"],
  );
});

test("active filter count counts selected choices and filled ranges", () => {
  const filters = {
    ...emptyReportFilters(),
    recordTypes: ["sale"] as const,
    productIds: ["shirt-1", "shoe-1"],
    minAmount: "1000",
  };
  assert.equal(activeReportFilterCount(filters), 4);
});

test("blank contact search and amount ranges do not hide records", () => {
  const filters = { ...emptyReportFilters(), contactQuery: "  ", minAmount: "", maxAmount: "" };
  assert.equal(filterReportRecords(records, filters).length, records.length);
});
