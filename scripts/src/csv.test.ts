import test from "node:test";
import assert from "node:assert/strict";
import { encodeCsv, parseCsv } from "../../artifacts/business-os/src/lib/csv.ts";

test("CSV export quotes cells and escapes embedded quotes", () => {
  assert.equal(encodeCsv(["Name", "Notes"], [["Hotel", 'Called "today"'], ["A, B", "Line 1\nLine 2"]]),
    '"Name","Notes"\r\n"Hotel","Called ""today"""\r\n"A, B","Line 1\nLine 2"');
});

test("CSV export writes blank cells for null and undefined", () => {
  assert.equal(encodeCsv(["A", "B"], [[null, undefined], [0, false]]),
    '"A","B"\r\n"",""\r\n"0","false"');
});

test("CSV parser handles quoted commas, line breaks and escaped quotes", () => {
  assert.deepEqual(parseCsv('Name,Notes\\r\\n"Hotel, North","Line 1\\nLine 2 with ""quotes"""'), [
    ["Name", "Notes"],
    ["Hotel, North", 'Line 1\\nLine 2 with "quotes"'],
  ]);
});

test("CSV parser rejects unterminated quotes", () => {
  assert.throws(() => parseCsv('Name,Notes\\n"Hotel,unfinished'), /unclosed quoted field/);
});
