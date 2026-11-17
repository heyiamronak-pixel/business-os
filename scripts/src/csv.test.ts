import test from "node:test";
import assert from "node:assert/strict";
import { encodeCsv } from "../../artifacts/business-os/src/lib/csv.ts";

test("CSV export quotes cells and escapes embedded quotes", () => {
  assert.equal(encodeCsv(["Name", "Notes"], [["Hotel", 'Called "today"'], ["A, B", "Line 1\nLine 2"]]),
    '"Name","Notes"\r\n"Hotel","Called ""today"""\r\n"A, B","Line 1\nLine 2"');
});

test("CSV export writes blank cells for null and undefined", () => {
  assert.equal(encodeCsv(["A", "B"], [[null, undefined], [0, false]]),
    '"A","B"\r\n"",""\r\n"0","false"');
});
