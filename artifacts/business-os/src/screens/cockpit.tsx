import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { AppPage, PageHeader } from "@/components/app-shell";
import { Badge, Card, EmptyState, Progress, Stat } from "@/components/ui";
import { buildContext, deriveActions, deriveInsights } from "@/lib/engines";
import { greeting } from "@/lib/format";
import { money, pct } from "@/lib/format";
import { useAppStore, useBusiness } from "@/lib/store";
import { cn } from "@/lib/utils";

export function CockpitScreen() {
  const business = useBusiness();
  const db = useAppStore((s) => s.db);
  if (!business) return <AppPage>{null}</AppPage>;
  const ctx = buildContext(db, business);
  const insights = deriveInsights(ctx);
  const actions = deriveActions(ctx);
  const cur = business.currency;
  const m = (n: number) => money(n, cur);
  const hasFinance = ctx.kpis.orderCount > 0 || ctx.kpis.expenses > 0;
  const spark = ctx.series;
  const maxSpark = Math.max(1, ...spark.map((p) => p.revenue));

  return (
    <AppPage>
      <PageHeader title={greeting()} subtitle={business.name} />

      <section className="relative mb-7 overflow-hidden rounded-[26px] bg-gradient-to-br from-[#122B42] via-[#155B66] to-[#168078] px-5 py-6 text-white shadow-[0_18px_42px_rgba(18,70,82,0.18)] sm:px-7 sm:py-7">
        <div className="pointer-events-none absolute -right-12 -top-20 size-64 rounded-full border border-white/10" />
        <div className="pointer-events-none absolute -right-2 -top-8 size-44 rounded-full border border-white/[0.07]" />
        <div className="relative max-w-2xl">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.09] px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.18em] text-[#BFE8E1]">
            <span className="size-1.5 rounded-full bg-[#76D9C5]" />
            Business intelligence · Live workspace
          </div>
          <h2 className="max-w-xl text-[1.65rem] font-semibold leading-[1.12] tracking-[-0.05em] sm:text-[2rem]">
            See the full picture.<br className="hidden sm:block" /> Move your business forward.
          </h2>
          <p className="mt-3 max-w-lg text-[12px] leading-5 text-white/75 sm:text-[13px]">
            Sales, cash flow, team activity and operations — connected in one clear view for {business.name}.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link to="/sell" className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-white px-4 text-xs font-semibold text-[#173B4D] shadow-sm transition-transform hover:-translate-y-0.5">
              Record a sale <ArrowRight className="size-3.5" />
            </Link>
            <Link to="/reports" className="inline-flex min-h-10 items-center rounded-xl border border-white/20 bg-white/[0.08] px-4 text-xs font-semibold text-white transition-colors hover:bg-white/[0.14]">
              View reports
            </Link>
          </div>
        </div>
      </section>

      {insights[0] ? (
        <Card className="mb-4 border-primary/20 bg-primary/6">
          <p className="text-xs font-medium uppercase tracking-wide text-primary">Why it happened</p>
          <p className="mt-1 text-base font-semibold">{insights[0].title}</p>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{insights[0].body}</p>
        </Card>
      ) : null}

      <section className="mb-7">
        <div className="mb-3 flex items-center justify-between gap-3"><h2 className="text-sm font-semibold tracking-[-0.02em]">Business health</h2><span className="text-[10px] font-medium text-muted-foreground">{ctx.period.label}</span></div>
        {hasFinance ? (
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            <Card>
              <Stat label="Revenue" value={m(ctx.kpis.revenue)} hint={ctx.period.label} />
            </Card>
            <Card>
              <Stat label="Expenses" value={m(ctx.kpis.expenses)} />
            </Card>
            <Card>
              <Stat
                label="Net profit"
                value={m(ctx.kpis.netProfit)}
                tone={ctx.kpis.netProfit >= 0 ? "good" : "bad"}
              />
            </Card>
            <Card>
              <Stat label="Margin" value={pct(ctx.kpis.margin, 1)} />
            </Card>
            <Card className="col-span-2 xl:col-span-2">
              <Stat
                label="Cash collected"
                value={m(ctx.kpis.cashIn)}
                hint={ctx.kpis.outstanding > 0 ? `${m(ctx.kpis.outstanding)} still outstanding` : "All recorded sales collected"}
              />
            </Card>
          </div>
        ) : (
          <EmptyState
            title="No sales recorded yet"
            body="Add your first sale to start tracking revenue, profit and cash."
            action={
              <Link to="/sell" className="text-sm font-medium text-primary">
                Record a sale
              </Link>
            }
          />
        )}
      </section>

      {spark.some((p) => p.revenue > 0) ? (
        <section className="mb-5">
          <h2 className="mb-3 text-sm font-semibold tracking-[-0.02em] text-foreground">Last 14 days</h2>
          <Card className="panel-shadow h-24 border-0 bg-card p-4">
            <div className="flex h-full items-end gap-1">
              {spark.map((p) => (
                <div
                  key={p.date}
                  title={`${p.date} ${m(p.revenue)}`}
                  className="flex-1 rounded-t bg-primary/80"
                  style={{ height: `${Math.max(6, (p.revenue / maxSpark) * 100)}%` }}
                />
              ))}
            </div>
          </Card>
        </section>
      ) : null}

      <section className="mb-5">
        <h2 className="mb-2 text-xs font-medium uppercase tracking-wide text-subtle">Target</h2>
        {ctx.target ? (
          <Card>
            <div className="mb-2 flex items-baseline justify-between">
              <p className="font-display text-3xl tabular">{Math.round(ctx.target.pct)}%</p>
              <Badge tone={ctx.target.onTrack ? "good" : "warn"}>{ctx.target.onTrack ? "On pace" : "Behind"}</Badge>
            </div>
            <Progress value={ctx.target.pct} />
            <div className="mt-3 grid grid-cols-2 gap-3">
              <Stat label="Target" value={m(ctx.target.target.amount)} />
              <Stat label="Achieved" value={m(ctx.target.achieved)} />
              <Stat label="Remaining" value={m(ctx.target.remaining)} />
              <Stat label="Projected" value={m(ctx.target.projected)} />
              <Stat label="Needed / day" value={m(ctx.target.requiredDaily)} />
              <Stat label="Needed / week" value={m(ctx.target.requiredWeekly)} />
            </div>
          </Card>
        ) : (
          <EmptyState
            title="No target set"
            body="Set a monthly revenue target to see pace, remaining and projection."
            action={
              <Link to="/targets" className="text-sm font-medium text-primary">
                Set a target
              </Link>
            }
          />
        )}
      </section>

      <section className="mb-5">
        <h2 className="mb-2 text-xs font-medium uppercase tracking-wide text-subtle">Sales</h2>
        <div className="grid grid-cols-2 gap-2">
          <Card>
            <Stat label="Orders" value={String(ctx.kpis.orderCount)} />
          </Card>
          <Card>
            <Stat label="AOV" value={m(ctx.kpis.aov)} />
          </Card>
          <Card>
            <Stat label="Customers" value={String(ctx.customerCount)} />
          </Card>
          <Card>
            <Stat label="Units sold" value={String(ctx.kpis.unitsSold)} />
          </Card>
        </div>
      </section>

      <section className="mb-5">
        <h2 className="mb-2 text-xs font-medium uppercase tracking-wide text-subtle">Operations</h2>
        <Card className="panel-shadow divide-y divide-border/80 p-0">
          <OpRow label="Tasks due today" value={ctx.tasks.dueToday.length} href="/tasks" warn={ctx.tasks.dueToday.length > 0} />
          <OpRow label="Overdue tasks" value={ctx.tasks.overdue.length} href="/tasks" warn={ctx.tasks.overdue.length > 0} />
          <OpRow label="Low inventory" value={ctx.stock.low.length + ctx.stock.out.length} href="/inventory" warn={ctx.stock.out.length > 0} />
          <OpRow label="Pending payments" value={ctx.payments.count} href="/sales" warn={ctx.payments.count > 0} />
        </Card>
      </section>

      <section className="mb-5">
        <h2 className="mb-2 text-xs font-medium uppercase tracking-wide text-subtle">Marketing</h2>
        {ctx.marketing ? (
          <div className="grid grid-cols-2 gap-2">
            <Card>
              <Stat label="Ad spend" value={m(ctx.marketing.spend)} />
            </Card>
            <Card>
              <Stat label="Leads" value={String(ctx.marketing.leads)} />
            </Card>
            <Card>
              <Stat label="Customers" value={String(ctx.marketing.customers)} />
            </Card>
            <Card>
              <Stat label="CPL" value={ctx.marketing.cpl == null ? "—" : m(ctx.marketing.cpl)} />
            </Card>
            <Card>
              <Stat label="CAC" value={ctx.marketing.cac == null ? "—" : m(ctx.marketing.cac)} />
            </Card>
            <Card>
              <Stat label="ROAS" value={ctx.marketing.roas == null ? "—" : `${ctx.marketing.roas.toFixed(2)}x`} />
            </Card>
            <Card className="col-span-2">
              <Stat label="Attributed revenue" value={m(ctx.marketing.revenue)} />
            </Card>
          </div>
        ) : (
          <EmptyState
            title="No marketing data this month"
            body="Log ad spend and results to calculate CPL, CAC and ROAS."
            action={
              <Link to="/marketing" className="text-sm font-medium text-primary">
                Add a campaign
              </Link>
            }
          />
        )}
      </section>

      {insights.length > 1 ? (
        <section className="mb-5">
          <h2 className="mb-2 text-xs font-medium uppercase tracking-wide text-subtle">Insights</h2>
          <div className="space-y-2">
            {insights.slice(1).map((ins) => (
              <Card key={ins.id}>
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold">{ins.title}</p>
                  <Badge tone={ins.tone === "good" ? "good" : ins.tone === "bad" ? "bad" : ins.tone === "warn" ? "warn" : "neutral"}>
                    {ins.tone}
                  </Badge>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{ins.body}</p>
              </Card>
            ))}
          </div>
        </section>
      ) : null}

      {actions.length > 0 ? (
        <Link to="/actions" className="mb-2 flex items-center justify-between rounded-[var(--radius-xl)] bg-primary px-4 py-4 text-primary-foreground">
          <span>
            <span className="block text-sm font-medium opacity-80">What to do next</span>
            <span className="text-base font-semibold">
              {actions.length} {actions.length === 1 ? "action" : "actions"} waiting
            </span>
          </span>
          <ArrowRight className="size-5" />
        </Link>
      ) : null}
    </AppPage>
  );
}

function OpRow({ label, value, href, warn }: { label: string; value: number; href: string; warn?: boolean }) {
  return (
    <Link to={href} className="flex items-center justify-between px-4 py-3">
      <span className="text-sm">{label}</span>
      <span className={cn("tabular text-sm font-semibold", warn && value > 0 ? "text-warning" : "text-muted-foreground")}>
        {value}
      </span>
    </Link>
  );
}
