import test from "node:test";
import assert from "node:assert/strict";
import { getPlanPrice, getSubscriptionPlan, getTrialStatus, hasAvailableUserSeat } from "../../artifacts/business-os/src/lib/subscription.ts";

test("subscription plans expose the published seat and branch limits", () => {
  assert.equal(getSubscriptionPlan("starter").maxUsers, 2);
  assert.equal(getSubscriptionPlan("starter").maxBranches, 1);
  assert.equal(getSubscriptionPlan("growth").maxUsers, 5);
  assert.equal(getSubscriptionPlan("growth").maxBranches, 3);
});

test("monthly and annual prices use the selected billing cycle", () => {
  assert.equal(getPlanPrice("starter", "monthly"), 699);
  assert.equal(getPlanPrice("starter", "annual"), 6990);
  assert.equal(getPlanPrice("growth", "monthly"), 1999);
  assert.equal(getPlanPrice("growth", "annual"), 19990);
});

test("trial status handles active, expired and missing dates", () => {
  const now = new Date("2026-11-17T12:00:00.000Z");
  assert.deepEqual(getTrialStatus("2026-11-20T12:00:00.000Z", now), { expired: false, daysRemaining: 3 });
  assert.deepEqual(getTrialStatus("2026-11-16T12:00:00.000Z", now), { expired: true, daysRemaining: 0 });
  assert.deepEqual(getTrialStatus(undefined, now), { expired: false, daysRemaining: null });
});
test("user seats are capped by the selected plan", () => {
  assert.equal(hasAvailableUserSeat("starter", 1), true);
  assert.equal(hasAvailableUserSeat("starter", 2), false);
  assert.equal(hasAvailableUserSeat("growth", 4), true);
  assert.equal(hasAvailableUserSeat("growth", 5), false);
});
