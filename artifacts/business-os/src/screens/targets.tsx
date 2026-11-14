import * as React from "react";
import { toast } from "sonner";
import { AppPage, PageHeader } from "@/components/app-shell";
import { Badge, Button, Card, EmptyState, Field, Input, Progress, Select, Stat } from "@/components/ui";
import type { TargetPeriod } from "@/lib/domain";
import { computePace, currentTarget, monthRange } from "@/lib/engines";
import { money } from "@/lib/format";
import { upsertTarget } from "@/lib/services";
import { useAppStore, useBusiness } from "@/lib/store";

export function TargetsScreen() {
  const business = useBusiness();
  const db = useAppStore((s) => s.db);
  const apply = useAppStore((s) => s.apply);
  const now = new Date();
  const [period, setPeriod] = React.useState<TargetPeriod>("monthly");
  const [amount, setAmount] = React.useState("");

  if (!business) return null;
  const target = currentTarget(db, business.id, now);
  const pace = target ? computePace(db, business.id, target, now) : null;
  const range = monthRange(now);

  function save() {
    if (!business) return;
    try {
      const year = now.getFullYear();
      apply(
        upsertTarget(useAppStore.getState().db, {
          businessId: business.id,
          period,
          year,
          month: period === "monthly" ? now.getMonth() + 1 : undefined,
          quarter: period === "quarterly" ? Math.floor(now.getMonth() / 3) + 1 : undefined,
          amount: Number(amount),
        }),
      );
      toast.success("Target saved");
      setAmount("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save");
    }
  }

  return (
    <AppPage>
      <PageHeader title="Targets" subtitle="Pace is calculated from recorded sales only" />
      {pace ? (
        <Card className="mb-4">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{pace.target.period} · {range.label}</p>
            <Badge tone={pace.onTrack ? "good" : "warn"}>{pace.onTrack ? "On pace" : "Behind"}</Badge>
          </div>
          <p className="font-display text-4xl tabular">{Math.round(pace.pct)}%</p>
          <Progress value={pace.pct} className="mt-2" />
          <div className="mt-4 grid grid-cols-2 gap-3">
            <Stat label="Target" value={money(pace.target.amount, business.currency)} />
            <Stat label="Achieved" value={money(pace.achieved, business.currency)} />
            <Stat label="Remaining" value={money(pace.remaining, business.currency)} />
            <Stat label="Projected" value={money(pace.projected, business.currency)} />
            <Stat label="Needed / day" value={money(pace.requiredDaily, business.currency)} hint={`${pace.daysLeft} days left`} />
            <Stat label="Needed / week" value={money(pace.requiredWeekly, business.currency)} />
          </div>
        </Card>
      ) : (
        <EmptyState
          title="No target for this period"
          body="Set a monthly, quarterly or annual revenue target. Projection uses your actual daily pace — nothing is invented."
        />
      )}
      <Card className="space-y-3">
        <h2 className="text-sm font-semibold">Set a target</h2>
        <Field label="Period">
          <Select value={period} onChange={(e) => setPeriod(e.target.value as TargetPeriod)}>
            <option value="monthly">Monthly</option>
            <option value="quarterly">Quarterly</option>
            <option value="annual">Annual</option>
          </Select>
        </Field>
        <Field label={`Amount (${business.currency})`}>
          <Input type="number" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder={target ? String(target.amount) : "0"} />
        </Field>
        <Button className="w-full" onClick={save}>
          Save target
        </Button>
      </Card>
    </AppPage>
  );
}
