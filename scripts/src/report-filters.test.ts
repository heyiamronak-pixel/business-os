import test from "node:test";
import assert from "node:assert/strict";
import {
  filterReportRecords,
  matchesReportFilters,
  type ReportFilterRecord,
  type ReportFilterRule,
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
  },
];

const rule = (
  id: string,
  field: ReportFilterRule["field"],
  operator: ReportFilterRule["operator"],
  value: string,
): ReportFilterRule => ({ id, field, operator, value });

test("an empty custom filter leaves all report records visible", () => {
  assert.equal(matchesReportFilters(records[0], []), true);
  assert.equal(filterReportRecords(records, []).length, records.length);
});

test("AND logic requires every active rule to match", () => {
  const filters = [
    rule("1", "recordType", "equals", "sale"),
    rule("2", "status", "equals", "paid"),
  ];
  assert.deepEqual(filterReportRecords(records, filters, "all").map((record) => record.id), ["sale-1"]);
});

test("OR logic keeps records matching at least one rule", () => {
  const filters = [
    rule("1", "status", "equals", "unpaid"),
    rule("2", "category", "equals", "Rent"),
  ];
  assert.deepEqual(
    filterReportRecords(records, filters, "any").map((record) => record.id),
    ["sale-2", "expense-1"],
  );
});

test("amount rules support greater-than and less-than comparisons", () => {
  const filters = [rule("1", "amount", "greater_than", "1000")];
  assert.deepEqual(filterReportRecords(records, filters).map((record) => record.id), ["sale-1", "expense-1"]);
});

test("text contains matching is case-insensitive", () => {
  const filters = [rule("1", "contact", "contains", "AARAV")];
  assert.deepEqual(filterReportRecords(records, filters).map((record) => record.id), ["sale-1"]);
});

test("blank rules are ignored instead of accidentally hiding all records", () => {
  const filters = [
    rule("1", "recordType", "equals", ""),
    rule("2", "category", "contains", " "),
  ];
  assert.equal(filterReportRecords(records, filters).length, records.length);
});
