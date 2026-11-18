import test from "node:test";
import assert from "node:assert/strict";
import {
  businessHasFeature,
  getEffectivePlanId,
  getPlanPrice,
  getSubscriptionPlan,
  getTrialStatus,
  hasAvailableBranchSlot,
  hasAvailableUserSeat,
} from "../../artifacts/business-os/src/lib/subscription.ts";

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

test("Starter and Growth expose the agreed feature gates", () => {
  assert.equal(getSubscriptionPlan("starter").advancedReports, false);
  assert.equal(getSubscriptionPlan("starter").savedViews, false);
  assert.equal(getSubscriptionPlan("starter").teamInsights, false);
  assert.equal(getSubscriptionPlan("growth").advancedReports, true);
  assert.equal(getSubscriptionPlan("growth").savedViews, true);
  assert.equal(getSubscriptionPlan("growth").teamInsights, true);
  assert.equal(getSubscriptionPlan("growth").automationWorkflows, true);
});

test("an active trial gets its trial plan and an expired trial falls back to Starter", () => {
  const active = {
    subscriptionPlan: "growth" as const,
    subscriptionStatus: "trial" as const,
    trialEndsAt: "2026-11-20T12:00:00.000Z",
  };
  const expired = { ...active, trialEndsAt: "2026-11-16T12:00:00.000Z" };
  const now = new Date("2026-11-17T12:00:00.000Z");

  assert.equal(getEffectivePlanId(active, now), "growth");
  assert.equal(businessHasFeature(active, "savedViews", now), true);
  assert.equal(getEffectivePlanId(expired, now), "starter");
  assert.equal(businessHasFeature(expired, "advancedReports", now), false);
});

test("selected plan entitlements apply immediately in the local plan preview", () => {
  const selectedStarter = {
    subscriptionPlan: "starter" as const,
    subscriptionStatus: "selected" as const,
    trialEndsAt: "2026-11-16T12:00:00.000Z",
  };
  assert.equal(getEffectivePlanId(selectedStarter, new Date("2026-11-17T12:00:00.000Z")), "starter");
  assert.equal(businessHasFeature(selectedStarter, "teamInsights"), false);
});

test("branch slots are capped by each plan", () => {
  assert.equal(hasAvailableBranchSlot("starter", 0), true);
  assert.equal(hasAvailableBranchSlot("starter", 1), false);
  assert.equal(hasAvailableBranchSlot("growth", 2), true);
  assert.equal(hasAvailableBranchSlot("growth", 3), false);
});
