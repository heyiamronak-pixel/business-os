import * as React from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { AppPage, PageHeader } from "@/components/app-shell";
import { Button, Card, Field, Input, Select, Switch } from "@/components/ui";
import {
  COUNTRIES,
  INDUSTRIES,
  MODULE_CATALOG,
  recommendModules,
  type Appearance,
  type IndustryId,
  type ModuleId,
  type ThemePreset,
} from "@/lib/domain";
import { extractLogoColors, fileToDataUrl } from "@/lib/theme";
import { deleteBusiness, updateBusiness } from "@/lib/services";
import { isValidGstin } from "@/lib/invoice-utils";
import { useAppStore, useBusiness } from "@/lib/store";
import { SUBSCRIPTION_PLANS, getSubscriptionPlan, getTrialStatus } from "@/lib/subscription";
import { createId } from "@/lib/utils";

export function SettingsScreen() {
  const business = useBusiness();
  const db = useAppStore((s) => s.db);
  const apply = useAppStore((s) => s.apply);
  const setCurrent = useAppStore((s) => s.setCurrentBusiness);
  const navigate = useNavigate();
  const [name, setName] = React.useState(business?.name ?? "");
  const [gstError, setGstError] = React.useState("");
  const [annualBilling, setAnnualBilling] = React.useState(false);

  React.useEffect(() => {
    setName(business?.name ?? "");
  }, [business?.id, business?.name]);

  if (!business) return null;
  const currentPlan = getSubscriptionPlan(business.subscriptionPlan);
  const trial = getTrialStatus(business.trialEndsAt);
  const teamUsage = db.members.filter((member) => member.businessId === business.id).length;

  function patch(p: Parameters<typeof updateBusiness>[2]) {
    if (!business) return;
    apply(updateBusiness(useAppStore.getState().db, business.id, p));
  }

  function toggleModule(id: ModuleId) {
    if (!business) return;
    const enabled = business.enabledModules.includes(id)
      ? business.enabledModules.filter((m) => m !== id)
      : [...business.enabledModules, id];
    const order = business.moduleOrder.includes(id) ? business.moduleOrder : [...business.moduleOrder, id];
    patch({ enabledModules: enabled, moduleOrder: order.filter((m) => enabled.includes(m) || m === id) });
  }

  function move(id: ModuleId, dir: -1 | 1) {
    if (!business) return;
    const order = [...business.moduleOrder];
    const i = order.indexOf(id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= order.length) return;
    const tmp = order[i];
    order[i] = order[j];
    order[j] = tmp;
    patch({ moduleOrder: order });
  }

  async function onLogo(file?: File) {
    if (!business || !file) return;
    const data = await fileToDataUrl(file, 320);
    const colors = await extractLogoColors(data);
    patch({ logoDataUrl: data, brandColors: colors, themePreset: colors[0] ? "brand" : business.themePreset });
    toast.success("Logo updated");
  }

  return (
    <AppPage>
      <PageHeader title="Settings" subtitle="Workspace, theme, modules" />

      <Card className="mb-4 space-y-3">
        <h2 className="text-sm font-semibold">Workspace</h2>
        <Select
          value={business.id}
          onChange={(e) => setCurrent(e.target.value)}
        >
          {db.businesses.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </Select>
        <Button variant="secondary" className="w-full" onClick={() => navigate({ to: "/onboarding" })}>
          Add another business
        </Button>
      </Card>

      <Card className="mb-4 space-y-3">
        <h2 className="text-sm font-semibold">Profile</h2>
        <label className="flex items-center gap-3">
          {business.logoDataUrl ? (
            <img src={business.logoDataUrl} alt="" className="size-14 rounded-[var(--radius-md)] object-cover" />
          ) : (
            <span className="flex size-14 items-center justify-center rounded-[var(--radius-md)] bg-muted">{business.name[0]}</span>
          )}
          <span className="text-sm text-muted-foreground">Change logo</span>
          <input type="file" accept="image/*" className="sr-only" onChange={(e) => onLogo(e.target.files?.[0])} />
        </label>
        {business.brandColors.length > 0 ? (
          <div className="flex gap-2">
            {business.brandColors.map((c) => (
              <span key={c} className="size-6 rounded-full border border-border" style={{ background: c }} />
            ))}
          </div>
        ) : null}
        <Field label="Name">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => name.trim().length >= 2 && patch({ name: name.trim() })}
          />
        </Field>
        <Field label="Industry">
          <Select
            value={business.industry}
            onChange={(e) => {
              const industry = e.target.value as IndustryId;
              patch({ industry, enabledModules: recommendModules(industry), moduleOrder: recommendModules(industry) });
            }}
          >
            {INDUSTRIES.map((i) => (
              <option key={i.id} value={i.id}>
                {i.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Country">
          <Select
            value={business.country}
            onChange={(e) => {
              const c = COUNTRIES.find((x) => x.name === e.target.value);
              patch({ country: e.target.value, currency: c?.currency ?? business.currency, timezone: c?.tz ?? business.timezone });
            }}
          >
            {COUNTRIES.map((c) => (
              <option key={c.name}>{c.name}</option>
            ))}
          </Select>
        </Field>
        <Field label="Currency">
          <Input value={business.currency} onChange={(e) => patch({ currency: e.target.value.toUpperCase() })} />
        </Field>
        <Field label="Phone">
          <Input defaultValue={business.phone ?? ""} onBlur={(e) => patch({ phone: e.target.value })} />
        </Field>
        <Field label="Email">
          <Input defaultValue={business.email ?? ""} onBlur={(e) => patch({ email: e.target.value })} />
        </Field>
      </Card>

      <Card className="mb-4 space-y-3">
        <div><h2 className="text-sm font-semibold">GST & invoice profile</h2><p className="mt-1 text-xs leading-5 text-muted-foreground">Update your registered business details whenever they change.</p></div>
        <div className="flex items-center justify-between gap-3 rounded-xl bg-muted/45 p-3"><div><p className="text-sm font-medium">Registered under GST</p><p className="text-xs text-muted-foreground">Keep this off if your business is not GST registered.</p></div><Switch checked={Boolean(business.gstRegistered)} onCheckedChange={(checked) => { setGstError(""); patch({ gstRegistered:checked, gstin:checked?business.gstin:undefined }); }} label="GST registered" /></div>
        {business.gstRegistered ? <><Field label="GSTIN"><Input key={business.id+(business.gstin??"")} defaultValue={business.gstin??""} maxLength={15} placeholder="15-character GSTIN" onBlur={(e)=>{const value=e.target.value.trim().toUpperCase();if(!isValidGstin(value)){setGstError("Enter a valid 15-character GSTIN.");return;}setGstError("");patch({gstin:value});}} /></Field><Field label="Legal business name"><Input defaultValue={business.legalName??""} placeholder={business.name} onBlur={(e)=>patch({legalName:e.target.value.trim()||undefined})} /></Field></> : null}
        <Field label="Registered / billing address"><Input defaultValue={business.address??""} placeholder="Street, building, area" onBlur={(e)=>patch({address:e.target.value.trim()||undefined})} /></Field>
        <div className="grid grid-cols-2 gap-3"><Field label="City / area"><Input defaultValue={business.location??""} onBlur={(e)=>patch({location:e.target.value.trim()||undefined})} /></Field><Field label="Postal code"><Input defaultValue={business.postalCode??""} onBlur={(e)=>patch({postalCode:e.target.value.trim()||undefined})} /></Field></div>
        <div className="grid grid-cols-2 gap-3"><Field label="State"><Input defaultValue={business.state??""} onBlur={(e)=>patch({state:e.target.value.trim()||undefined})} /></Field><Field label="State code"><Input defaultValue={business.stateCode??""} maxLength={2} onBlur={(e)=>patch({stateCode:e.target.value.replace(/[^0-9]/g,"").slice(0,2)||undefined})} /></Field></div>
        {gstError ? <p role="alert" className="text-xs font-semibold text-danger">{gstError}</p> : null}
        <p className="text-[11px] leading-5 text-muted-foreground">Invoice tax fields are enabled only when GST registration is switched on. Confirm tax rates and statutory requirements with your tax adviser before issuing invoices.</p>
        <Link to="/invoices" className="inline-flex items-center gap-2 text-xs font-semibold text-primary hover:underline">Open invoice format settings →</Link>
      </Card>

      <Card className="mb-4 space-y-4">
        <div className="flex items-start justify-between gap-3"><div><h2 className="text-sm font-semibold">Plans & subscription</h2><p className="mt-1 text-xs text-muted-foreground">Choose the plan that fits your team. Online billing will be connected later.</p></div><span className="rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-semibold text-primary">{business.subscriptionStatus==="trial"?"14-day trial":"Plan preference"}</span></div>
        {business.subscriptionStatus === "trial" && business.trialEndsAt ? (
          <div className="rounded-xl bg-primary/7 px-3 py-3 text-xs text-muted-foreground">
            <p className="font-semibold text-foreground">{trial.expired ? "Your trial period has ended" : "Your Growth trial ends " + new Date(business.trialEndsAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</p>
            <p className="mt-1">{trial.expired ? "Choose a plan preference to continue planning your subscription. Checkout is not connected, so no payment is collected and no paid status is assumed." : trial.daysRemaining + " day" + (trial.daysRemaining === 1 ? "" : "s") + " remaining in your trial. No payment is collected in this preview."}</p>
          </div>
        ) : null}
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="rounded-xl border border-border p-3">
            <p className="text-[10px] text-muted-foreground">Team seats</p>
            <p className="mt-1 text-lg font-semibold tabular-nums">{teamUsage} / {currentPlan.maxUsers}</p>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: Math.min(100, (teamUsage / currentPlan.maxUsers) * 100) + "%" }} /></div>
          </div>
          <div className="rounded-xl border border-border p-3">
            <p className="text-[10px] text-muted-foreground">Branch allowance</p>
            <p className="mt-1 text-lg font-semibold tabular-nums">{currentPlan.maxBranches} included</p>
            <p className="mt-1 text-[10px] text-muted-foreground">Branch management is part of the upcoming operations module.</p>
          </div>
        </div>
        <div className="flex items-center justify-between"><p className="text-xs font-medium text-muted-foreground">Billing display</p><div className="flex rounded-xl bg-muted p-1"><button type="button" onClick={()=>setAnnualBilling(false)} className={annualBilling?"rounded-lg px-3 py-1.5 text-xs text-muted-foreground":"rounded-lg bg-card px-3 py-1.5 text-xs font-semibold shadow-sm"}>Monthly</button><button type="button" onClick={()=>setAnnualBilling(true)} className={annualBilling?"rounded-lg bg-card px-3 py-1.5 text-xs font-semibold shadow-sm":"rounded-lg px-3 py-1.5 text-xs text-muted-foreground"}>Annual · 2 months free</button></div></div>
        <div className="grid gap-3 md:grid-cols-2">
          {Object.values(SUBSCRIPTION_PLANS).map((plan)=>{
            const selected=business.subscriptionPlan===plan.id,amount=annualBilling?plan.annualPrice:plan.monthlyPrice;
            return <div key={plan.id} className={`relative overflow-hidden rounded-2xl border p-4 transition-all duration-200 hover:-translate-y-1 hover:shadow-lg ${selected?"border-primary bg-primary/[0.045] shadow-md":"border-border bg-card"}`}>
              {plan.id==="growth"?<span className="absolute right-3 top-3 rounded-full bg-primary/10 px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-primary">Recommended</span>:null}
              <p className="text-sm font-semibold">{plan.title}</p><p className="mt-3 text-3xl font-semibold tracking-tight tabular-nums">₹{amount.toLocaleString("en-IN")}<span className="ml-1 text-xs font-normal text-muted-foreground">/{annualBilling?"year":"month"}</span></p><p className="mt-1 text-xs text-muted-foreground">Up to {plan.maxUsers} users · {plan.maxBranches} {plan.maxBranches === 1 ? "branch" : "branches"}</p>
              <ul className="mt-4 space-y-2">{plan.features.map((feature)=><li key={feature} className="flex gap-2 text-xs"><span className="text-primary">✓</span><span>{feature}</span></li>)}</ul>
              <Button className="mt-5 w-full" variant={selected?"secondary":"default"} onClick={()=>{
  const cycle = annualBilling ? "annual" : "monthly";
  const history = [...(business.subscriptionHistory ?? []), {
    id: createId("sub"), fromPlan: business.subscriptionPlan, toPlan: plan.id,
    billingCycle: cycle, changedAt: new Date().toISOString(), source: "selection" as const,
  }];
  patch({subscriptionPlan:plan.id,subscriptionStatus:"selected",subscriptionBillingCycle:cycle,subscriptionHistory:history});
  toast.success(plan.title+" preference saved. Billing will be available later.");
}}>{selected?"Selected plan":"Choose "+plan.title}</Button>
            </div>;
          })}
        </div>
        {(business.subscriptionHistory ?? []).length ? (
          <div className="space-y-2 border-t border-border pt-3">
            <p className="text-xs font-semibold">Plan preference history</p>
            {[...(business.subscriptionHistory ?? [])].slice(-4).reverse().map((entry) => (
              <div key={entry.id} className="flex items-center justify-between gap-3 text-xs">
                <span>{getSubscriptionPlan(entry.toPlan).title} · {entry.billingCycle}</span>
                <span className="text-muted-foreground">{new Date(entry.changedAt).toLocaleDateString("en-IN")}</span>
              </div>
            ))}
          </div>
        ) : null}
        <p className="text-[11px] leading-5 text-muted-foreground">Indicative launch pricing only. Your plan preference is saved in this browser workspace; no payment method, checkout or charge is connected. Starter and Growth seat limits are enforced locally. Branch capacity is displayed but branch records are not yet implemented.</p>
      </Card>

      <Card className="mb-4 space-y-3">
        <h2 className="text-sm font-semibold">Theme</h2>
        <Field label="Appearance">
          <Select value={business.appearance} onChange={(e) => patch({ appearance: e.target.value as Appearance })}>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
            <option value="auto">Auto</option>
          </Select>
        </Field>
        <Field label="Preset">
          <Select value={business.themePreset} onChange={(e) => patch({ themePreset: e.target.value as ThemePreset })}>
            <option value="brand">Brand match</option>
            <option value="professional">Professional</option>
            <option value="modern">Modern</option>
            <option value="contrast">High contrast</option>
          </Select>
        </Field>
      </Card>

      <Card className="mb-4 space-y-2">
        <h2 className="text-sm font-semibold">Modules</h2>
        {business.moduleOrder.map((id, index) => {
          const def = MODULE_CATALOG[id];
          const on = business.enabledModules.includes(id);
          return (
            <div key={id} className="flex items-center gap-2 py-1">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{def.label}</p>
                <p className="text-xs text-muted-foreground">{def.implemented ? "Live" : "Planned"}</p>
              </div>
              <button type="button" className="size-9" onClick={() => move(id, -1)} disabled={index === 0}>↑</button>
              <button type="button" className="size-9" onClick={() => move(id, 1)} disabled={index === business.moduleOrder.length - 1}>↓</button>
              <Switch checked={on} onCheckedChange={() => toggleModule(id)} label={def.label} />
            </div>
          );
        })}
      </Card>

      <Card className="mb-4 space-y-3">
        <h2 className="text-sm font-semibold">Available modules</h2>
        <p className="text-xs text-muted-foreground">Enable additional workflows for this business. They will appear in the More menu.</p>
        {Object.values(MODULE_CATALOG)
          .filter((module) => module.implemented && !business.moduleOrder.includes(module.id))
          .map((module) => (
            <div key={module.id} className="flex items-center gap-3 py-1">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{module.label}</p>
                <p className="text-xs text-muted-foreground">{module.description}</p>
              </div>
              <Switch
                checked={business.enabledModules.includes(module.id)}
                onCheckedChange={() => toggleModule(module.id)}
                label={`Enable ${module.label}`}
              />
            </div>
          ))}
      </Card>

      <Button
        variant="ghost"
        className="w-full text-danger"
        onClick={() => {
          const next = deleteBusiness(useAppStore.getState().db, business.id);
          apply(next);
          const nextId = next.businesses[0]?.id ?? null;
          setCurrent(nextId);
          toast.success("Workspace removed");
          if (!nextId) navigate({ to: "/onboarding" });
        }}
      >
        Delete this workspace
      </Button>
    </AppPage>
  );
}
