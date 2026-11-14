import * as React from "react";
import { toast } from "sonner";
import { AppPage, ConfirmBar, PageHeader } from "@/components/app-shell";
import { BottomSheet } from "@/components/sheet";
import { Button, Card, EmptyState, Field, Input, Select, Stat } from "@/components/ui";
import type { Campaign } from "@/lib/domain";
import { marketingTotals, monthRange } from "@/lib/engines";
import { formatDate, money } from "@/lib/format";
import { deleteCampaign, upsertCampaign } from "@/lib/services";
import { useAppStore, useBusiness } from "@/lib/store";

const CHANNELS = ["Meta Ads", "Google Ads", "WhatsApp", "Organic", "Referral", "Other"];

export function MarketingScreen() {
  const business = useBusiness();
  const db = useAppStore((s) => s.db);
  const apply = useAppStore((s) => s.apply);
  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Campaign | null>(null);
  const [confirm, setConfirm] = React.useState<string | null>(null);
  const blank = {
    name: "",
    channel: "Meta Ads",
    adSpend: "",
    clicks: "",
    impressions: "",
    leads: "",
    customers: "",
    revenue: "",
    date: new Date().toISOString().slice(0, 10),
  };
  const [form, setForm] = React.useState(blank);

  if (!business) return null;
  const range = monthRange();
  const campaigns = db.campaigns.filter((c) => c.businessId === business.id);
  const month = campaigns.filter((c) => c.date >= range.from.toISOString().slice(0, 10) && c.date <= range.to.toISOString().slice(0, 10));
  const totals = marketingTotals(month);
  const m = (n: number | null) => (n == null ? "—" : money(n, business.currency));

  function start(c?: Campaign) {
    if (c) {
      setEditing(c);
      setForm({
        name: c.name,
        channel: c.channel,
        adSpend: String(c.adSpend),
        clicks: String(c.clicks),
        impressions: String(c.impressions),
        leads: String(c.leads),
        customers: String(c.customers),
        revenue: String(c.revenue),
        date: c.date.slice(0, 10),
      });
    } else {
      setEditing(null);
      setForm(blank);
    }
    setOpen(true);
  }

  function save() {
    if (!business) return;
    try {
      apply(
        upsertCampaign(useAppStore.getState().db, {
          id: editing?.id,
          businessId: business.id,
          name: form.name,
          channel: form.channel,
          adSpend: Number(form.adSpend) || 0,
          clicks: Number(form.clicks) || 0,
          impressions: Number(form.impressions) || 0,
          leads: Number(form.leads) || 0,
          customers: Number(form.customers) || 0,
          revenue: Number(form.revenue) || 0,
          date: form.date,
        }),
      );
      toast.success("Campaign saved");
      setOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save");
    }
  }

  return (
    <AppPage>
      <PageHeader
        title="Marketing"
        subtitle="Manual tracking now. Meta, Google and WhatsApp can plug in later."
        action={<Button size="sm" onClick={() => start()}>Add</Button>}
      />
      {month.length > 0 ? (
        <div className="mb-4 grid grid-cols-2 gap-2">
          <Card><Stat label="Spend" value={money(totals.spend, business.currency)} /></Card>
          <Card><Stat label="Revenue" value={money(totals.revenue, business.currency)} /></Card>
          <Card><Stat label="CPC" value={m(totals.cpc)} /></Card>
          <Card><Stat label="CPL" value={m(totals.cpl)} /></Card>
          <Card><Stat label="CAC" value={m(totals.cac)} /></Card>
          <Card><Stat label="ROAS" value={totals.roas == null ? "—" : `${totals.roas.toFixed(2)}x`} /></Card>
        </div>
      ) : null}
      {campaigns.length === 0 ? (
        <EmptyState
          title="No campaigns logged"
          body="Enter spend, clicks, leads and attributed revenue. Vestra calculates CPC, CPL, conversion, CAC and ROAS from those numbers only."
          action={<Button onClick={() => start()}>Log a campaign</Button>}
        />
      ) : (
        <ul className="space-y-2">
          {campaigns.map((c) => {
            const t = marketingTotals([c]);
            return (
              <li key={c.id}>
                <button type="button" className="w-full rounded-[var(--radius-xl)] border border-border bg-card p-3 text-left" onClick={() => start(c)}>
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{c.name}</p>
                    <p className="tabular text-sm">{t.roas == null ? "—" : `${t.roas.toFixed(2)}x`}</p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {c.channel} · {formatDate(c.date, "d MMM")} · spend {money(c.adSpend, business.currency)}
                  </p>
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <BottomSheet
        open={open}
        onOpenChange={setOpen}
        title={editing ? "Edit campaign" : "New campaign"}
        footer={
          <div className="space-y-2">
            <Button className="w-full" onClick={save}>Save</Button>
            {editing ? (
              <Button variant="ghost" className="w-full text-danger" onClick={() => setConfirm(editing.id)}>Delete</Button>
            ) : null}
          </div>
        }
      >
        <div className="space-y-3">
          <Field label="Name"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="Channel">
            <Select value={form.channel} onChange={(e) => setForm({ ...form, channel: e.target.value })}>
              {CHANNELS.map((c) => <option key={c}>{c}</option>)}
            </Select>
          </Field>
          <Field label="Date"><Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Ad spend"><Input type="number" inputMode="decimal" value={form.adSpend} onChange={(e) => setForm({ ...form, adSpend: e.target.value })} /></Field>
            <Field label="Revenue"><Input type="number" inputMode="decimal" value={form.revenue} onChange={(e) => setForm({ ...form, revenue: e.target.value })} /></Field>
            <Field label="Impressions"><Input type="number" inputMode="numeric" value={form.impressions} onChange={(e) => setForm({ ...form, impressions: e.target.value })} /></Field>
            <Field label="Clicks"><Input type="number" inputMode="numeric" value={form.clicks} onChange={(e) => setForm({ ...form, clicks: e.target.value })} /></Field>
            <Field label="Leads"><Input type="number" inputMode="numeric" value={form.leads} onChange={(e) => setForm({ ...form, leads: e.target.value })} /></Field>
            <Field label="Customers"><Input type="number" inputMode="numeric" value={form.customers} onChange={(e) => setForm({ ...form, customers: e.target.value })} /></Field>
          </div>
        </div>
      </BottomSheet>
      <BottomSheet
        open={!!confirm}
        onOpenChange={() => setConfirm(null)}
        title="Delete campaign?"
        footer={
          <ConfirmBar
            danger
            confirmLabel="Delete"
            onCancel={() => setConfirm(null)}
            onConfirm={() => {
              apply(deleteCampaign(useAppStore.getState().db, confirm!));
              toast.success("Removed");
              setConfirm(null);
              setOpen(false);
            }}
          />
        }
      >
        <p className="text-sm text-muted-foreground">Totals recalculate from remaining campaigns.</p>
      </BottomSheet>
    </AppPage>
  );
}
