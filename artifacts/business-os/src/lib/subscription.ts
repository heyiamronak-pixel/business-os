import type { Business, SubscriptionBillingCycle, SubscriptionPlan } from "./domain";

export type PlanFeature = "advancedReports" | "savedViews" | "teamInsights" | "automationWorkflows";

export interface SubscriptionPlanDefinition {
  id: SubscriptionPlan;
  title: string;
  monthlyPrice: number;
  annualPrice: number;
  maxUsers: number;
  maxBranches: number;
  advancedReports: boolean;
  savedViews: boolean;
  teamInsights: boolean;
  automationWorkflows: boolean;
  features: string[];
}

export const SUBSCRIPTION_PLANS: Record<SubscriptionPlan, SubscriptionPlanDefinition> = {
  starter: {
    id: "starter",
    title: "Starter",
    monthlyPrice: 699,
    annualPrice: 6990,
    maxUsers: 2,
    maxBranches: 1,
    advancedReports: false,
    savedViews: false,
    teamInsights: false,
    automationWorkflows: false,
    features: [
      "Core dashboard and standard reports",
      "Products, inventory, POS and sales",
      "Customers, suppliers and purchases",
      "Expenses, targets, tasks and invoices",
      "Up to 2 team members",
      "1 business branch",
    ],
  },
  growth: {
    id: "growth",
    title: "Growth",
    monthlyPrice: 1999,
    annualPrice: 19990,
    maxUsers: 5,
    maxBranches: 3,
    advancedReports: true,
    savedViews: true,
    teamInsights: true,
    automationWorkflows: true,
    features: [
      "Everything in Starter",
      "Up to 5 team members",
      "Up to 3 business branches",
      "Advanced reports and saved views",
      "Team and operations insights",
      "Automation-ready workflows (rollout planned)",
    ],
  },
};

export const PLAN_FEATURE_LABELS: Record<PlanFeature, string> = {
  advancedReports: "Advanced reports",
  savedViews: "Saved views",
  teamInsights: "Team and operations insights",
  automationWorkflows: "Workflow automation",
};

export function getSubscriptionPlan(plan?: SubscriptionPlan): SubscriptionPlanDefinition {
  return SUBSCRIPTION_PLANS[plan ?? "growth"];
}

export function getTrialStatus(trialEndsAt?: string, now = new Date()): { expired: boolean; daysRemaining: number | null } {
  if (!trialEndsAt) return { expired: false, daysRemaining: null };
  const end = new Date(trialEndsAt);
  if (Number.isNaN(end.getTime())) return { expired: false, daysRemaining: null };
  const remaining = Math.ceil((end.getTime() - now.getTime()) / 86400000);
  return { expired: remaining <= 0, daysRemaining: Math.max(0, remaining) };
}

/**
 * A running trial receives the selected trial plan. When that trial expires,
 * access safely falls back to Starter until a plan is selected. Selecting a
 * plan in this preview changes local entitlements only; it is not a payment.
 */
export function getEffectivePlanId(
  business: Pick<Business, "subscriptionPlan" | "subscriptionStatus" | "trialEndsAt">,
  now = new Date(),
): SubscriptionPlan {
  if (business.subscriptionStatus === "trial" && getTrialStatus(business.trialEndsAt, now).expired) {
    return "starter";
  }
  return business.subscriptionPlan ?? "starter";
}

export function getEffectiveSubscriptionPlan(
  business: Pick<Business, "subscriptionPlan" | "subscriptionStatus" | "trialEndsAt">,
  now = new Date(),
): SubscriptionPlanDefinition {
  return getSubscriptionPlan(getEffectivePlanId(business, now));
}

export function hasPlanFeature(plan: SubscriptionPlan | undefined, feature: PlanFeature): boolean {
  return getSubscriptionPlan(plan)[feature];
}

export function businessHasFeature(
  business: Pick<Business, "subscriptionPlan" | "subscriptionStatus" | "trialEndsAt">,
  feature: PlanFeature,
  now = new Date(),
): boolean {
  return hasPlanFeature(getEffectivePlanId(business, now), feature);
}

export function getFeatureMinimumPlan(feature: PlanFeature): SubscriptionPlan {
  return feature === "advancedReports" || feature === "savedViews" || feature === "teamInsights" || feature === "automationWorkflows"
    ? "growth"
    : "starter";
}

export function getPlanPrice(plan: SubscriptionPlan, cycle: SubscriptionBillingCycle): number {
  const definition = getSubscriptionPlan(plan);
  return cycle === "annual" ? definition.annualPrice : definition.monthlyPrice;
}

export function hasAvailableUserSeat(plan: SubscriptionPlan | undefined, currentUsers: number): boolean {
  return Number.isFinite(currentUsers) && currentUsers >= 0 && currentUsers < getSubscriptionPlan(plan).maxUsers;
}

export function hasAvailableBranchSlot(plan: SubscriptionPlan | undefined, currentBranches: number): boolean {
  return Number.isFinite(currentBranches) && currentBranches >= 0 && currentBranches < getSubscriptionPlan(plan).maxBranches;
}
