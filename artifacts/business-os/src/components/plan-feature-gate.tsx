import * as React from "react";
import { Link } from "@tanstack/react-router";
import { LockKeyhole, Sparkles } from "lucide-react";
import { Button, Card } from "@/components/ui";
import { businessHasFeature, getEffectivePlanId, getFeatureMinimumPlan, getSubscriptionPlan, PLAN_FEATURE_LABELS, type PlanFeature } from "@/lib/subscription";
import { useBusiness } from "@/lib/store";

export function PlanFeatureNotice({
  feature,
  title,
  description,
  compact = false,
}: {
  feature: PlanFeature;
  title?: string;
  description?: string;
  compact?: boolean;
}) {
  const business = useBusiness();
  if (!business) return null;
  const requiredPlanId = getFeatureMinimumPlan(feature);
  const requiredPlan = getSubscriptionPlan(requiredPlanId);
  const currentPlan = getSubscriptionPlan(getEffectivePlanId(business));
  const label = PLAN_FEATURE_LABELS[feature];

  return (
    <Card className={compact ? "flex flex-col gap-2 border-dashed bg-muted/20 p-3 sm:flex-row sm:items-center sm:justify-between" : "space-y-3 border-dashed bg-muted/20 p-4 sm:p-5"}>
      <div className="flex min-w-0 items-start gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><LockKeyhole className="size-4" /></span>
        <div className="min-w-0">
          <p className="text-sm font-semibold">{title ?? label + " is a " + requiredPlan.title + " feature"}</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">{description ?? "Your " + currentPlan.title + " plan does not include " + label.toLowerCase() + ". Existing workspace data remains saved; choose " + requiredPlan.title + " to unlock it."}</p>
        </div>
      </div>
      <Link to="/settings" className="shrink-0">
        <Button size="sm" variant="secondary" className="w-full sm:w-auto"><Sparkles className="size-4" />View plans</Button>
      </Link>
    </Card>
  );
}

export function PlanFeatureGate({
  feature,
  children,
  title,
  description,
  compact = false,
}: {
  feature: PlanFeature;
  children: React.ReactNode;
  title?: string;
  description?: string;
  compact?: boolean;
}) {
  const business = useBusiness();
  if (!business) return null;
  if (!businessHasFeature(business, feature)) {
    return <PlanFeatureNotice feature={feature} title={title} description={description} compact={compact} />;
  }
  return <>{children}</>;
}
