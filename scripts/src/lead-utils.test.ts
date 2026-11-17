import test from "node:test";
import assert from "node:assert/strict";
import { normaliseLeadInput } from "../../artifacts/business-os/src/lib/lead-utils.ts";

test("lead validation trims names, normalises email and money", () => {
  assert.deepEqual(normaliseLeadInput({ name: "  Acme  ", email: " SALES@ACME.COM ", value: 120.456, stage: "qualified" }), {
    name: "Acme", email: "sales@acme.com", value: 120.46, stage: "qualified",
  });
});

test("lead validation rejects missing names, malformed email and negative values", () => {
  assert.throws(() => normaliseLeadInput({ name: " ", value: 0, stage: "new" }), /name is required/);
  assert.throws(() => normaliseLeadInput({ name: "Acme", email: "bad", value: 0, stage: "new" }), /valid lead email/);
  assert.throws(() => normaliseLeadInput({ name: "Acme", value: -1, stage: "new" }), /non-negative/);
});
test("lead follow-up reminders trigger only when due and still actionable", () => {
  const now = new Date("2026-11-17T12:00:00.000Z");
  assert.equal(isLeadFollowUpDue({ stage: "proposal", followUpAt: "2026-11-17T11:00:00.000Z" }, now), true);
  assert.equal(isLeadFollowUpDue({ stage: "proposal", followUpAt: "2026-11-17T13:00:00.000Z" }, now), false);
  assert.equal(isLeadFollowUpDue({ stage: "won", followUpAt: "2026-11-17T11:00:00.000Z" }, now), false);
  assert.equal(isLeadFollowUpDue({ stage: "lost", followUpAt: "2026-11-17T11:00:00.000Z" }, now), false);
});
