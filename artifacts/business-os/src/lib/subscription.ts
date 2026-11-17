import type { SubscriptionBillingCycle, SubscriptionPlan } from "./domain";

export interface SubscriptionPlanDefinition {
  id: SubscriptionPlan; title: string; monthlyPrice: number; annualPrice: number;
  maxUsers: number; maxBranches: number; advancedReports: boolean; automationWorkflows: boolean;
  features: string[];
}

export const SUBSCRIPTION_PLANS: Record<SubscriptionPlan, SubscriptionPlanDefinition> = {
  starter: {
    id: "starter", title: "Starter", monthlyPrice: 699, annualPrice: 6990, maxUsers: 2, maxBranches: 1,
    advancedReports: false, automationWorkflows: false,
    features: ["Sales, customers & invoices", "Products and inventory", "Tasks and business dashboard", "Standard reports"],
  },
  growth: {
    id: "growth", title: "Growth", monthlyPrice: 1999, annualPrice: 19990, maxUsers: 5, maxBranches: 3,
    advancedReports: true, automationWorkflows: true,
    features: ["Everything in Starter", "Advanced reports & saved views", "Team and operations insights", "Automation-ready workflows", "Priority support (planned)"],
  },
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

export function getPlanPrice(plan: SubscriptionPlan, cycle: SubscriptionBillingCycle): number {
  const definition = getSubscriptionPlan(plan);
  return cycle === "annual" ? definition.annualPrice : definition.monthlyPrice;
}