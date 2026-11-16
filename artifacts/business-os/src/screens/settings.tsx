import * as React from "react";
import { useNavigate } from "@tanstack/react-router";
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
import { useAppStore, useBusiness } from "@/lib/store";

export function SettingsScreen() {
  const business = useBusiness();
  const db = useAppStore((s) => s.db);
  const apply = useAppStore((s) => s.apply);
  const setCurrent = useAppStore((s) => s.setCurrentBusiness);
  const navigate = useNavigate();
  const [name, setName] = React.useState(business?.name ?? "");

  React.useEffect(() => {
    setName(business?.name ?? "");
  }, [business?.id, business?.name]);

  if (!business) return null;

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
          .filter((module) => !business.moduleOrder.includes(module.id))
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
