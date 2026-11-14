import * as React from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { ArrowLeft, Upload } from "lucide-react";
import {
  BUSINESS_TYPES,
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
import { useAppStore } from "@/lib/store";
import { createWorkspace } from "@/lib/services";
import { Button, Field, Input, Select, Switch } from "@/components/ui";
import { cn } from "@/lib/utils";

const PRESETS: { id: ThemePreset; label: string; blurb: string }[] = [
  { id: "brand", label: "Brand match", blurb: "Built from your logo" },
  { id: "professional", label: "Professional", blurb: "Ink and slate" },
  { id: "modern", label: "Modern", blurb: "Deep teal" },
  { id: "contrast", label: "High contrast", blurb: "Maximum clarity" },
];

export function OnboardingScreen() {
  const navigate = useNavigate();
  const apply = useAppStore((s) => s.apply);
  const setCurrent = useAppStore((s) => s.setCurrentBusiness);
  const existing = useAppStore((s) => s.db.businesses);
  const [step, setStep] = React.useState(0);
  const [name, setName] = React.useState("");
  const [logo, setLogo] = React.useState<string | undefined>();
  const [brandColors, setBrandColors] = React.useState<string[]>([]);
  const [industry, setIndustry] = React.useState<IndustryId>("retail");
  const [businessType, setBusinessType] = React.useState("Sole proprietor");
  const countryDefault = COUNTRIES[0];
  const [country, setCountry] = React.useState(countryDefault.name);
  const [currency, setCurrency] = React.useState(countryDefault.currency);
  const [timezone, setTimezone] = React.useState(
    Intl.DateTimeFormat().resolvedOptions().timeZone || countryDefault.tz,
  );
  const [phone, setPhone] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [website, setWebsite] = React.useState("");
  const [location, setLocation] = React.useState("");
  const [appearance, setAppearance] = React.useState<Appearance>("light");
  const [themePreset, setThemePreset] = React.useState<ThemePreset>("modern");
  const [modules, setModules] = React.useState<ModuleId[]>(recommendModules("retail"));
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    setModules(recommendModules(industry));
  }, [industry]);

  async function onLogo(file: File | undefined) {
    if (!file) return;
    const data = await fileToDataUrl(file, 320, 0.85);
    setLogo(data);
    const colors = await extractLogoColors(data);
    setBrandColors(colors);
    if (colors[0]) setThemePreset("brand");
  }

  function onCountry(name: string) {
    setCountry(name);
    const c = COUNTRIES.find((x) => x.name === name);
    if (c) {
      setCurrency(c.currency);
      setTimezone(c.tz);
    }
  }

  function toggleModule(id: ModuleId) {
    setModules((prev) => (prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]));
  }

  function moveModule(id: ModuleId, dir: -1 | 1) {
    setModules((prev) => {
      const i = prev.indexOf(id);
      if (i < 0) return prev;
      const j = i + dir;
      if (j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      const tmp = next[i];
      next[i] = next[j];
      next[j] = tmp;
      return next;
    });
  }

  function next() {
    setError("");
    if (step === 1 && name.trim().length < 2) {
      setError("Give the business a name.");
      return;
    }
    setStep((s) => Math.min(4, s + 1));
  }

  function finish() {
    setBusy(true);
    setError("");
    try {
      const db = useAppStore.getState().db;
      const result = createWorkspace(db, {
        name,
        logoDataUrl: logo,
        industry,
        businessType,
        country,
        currency,
        timezone,
        phone,
        email,
        website,
        location,
        brandColors,
        themePreset,
        appearance,
        enabledModules: modules.length ? modules : recommendModules(industry),
      });
      apply(result.db);
      setCurrent(result.business.id);
      toast.success("Workspace ready");
      navigate({ to: "/" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create workspace");
    } finally {
      setBusy(false);
    }
  }

  const industryDef = INDUSTRIES.find((i) => i.id === industry)!;
  const available = Array.from(new Set([...industryDef.recommended, ...industryDef.extra, ...modules]));

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-background px-4 pb-8 pt-6">
      <div className="mb-6 flex items-center justify-between">
        {step > 0 ? (
          <button type="button" className="flex size-11 items-center justify-center" onClick={() => setStep((s) => s - 1)} aria-label="Back">
            <ArrowLeft className="size-5" />
          </button>
        ) : (
          <span className="size-11" />
        )}
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">Business Sutra</p>
        <span className="size-11" />
      </div>

      <div className="mb-6 flex gap-1.5">
        {[0, 1, 2, 3, 4].map((i) => (
          <span key={i} className={cn("h-1 flex-1 rounded-full", i <= step ? "bg-primary" : "bg-muted")} />
        ))}
      </div>

      {step === 0 ? (
        <div className="flex flex-1 flex-col">
          <p className="text-sm font-medium text-primary">Business operating system</p>
          <h1 className="mt-3 font-display text-[2.6rem] leading-[1.05]">Everything your business needs. Connected in one place.</h1>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground">
            Business Sutra connects sales, stock, customers, costs, targets and daily operations — so you can run your business with clarity.
          </p>
          <ul className="mt-8 space-y-3 text-sm text-foreground">
            <li>What happened</li>
            <li>Why it happened</li>
            <li>What needs attention</li>
            <li>What to do next</li>
          </ul>
          {existing.length > 0 ? (
            <Button variant="secondary" className="mt-8" onClick={() => navigate({ to: "/" })}>
              Back to existing workspace
            </Button>
          ) : null}
          <Button className="mt-auto" size="lg" onClick={next}>
            Set up your business
          </Button>
        </div>
      ) : null}

      {step === 1 ? (
        <div className="flex flex-1 flex-col gap-4">
          <h1 className="font-display text-3xl">Your business</h1>
          <label className="flex cursor-pointer items-center gap-3 rounded-[var(--radius-xl)] border border-dashed border-border bg-card p-3">
            {logo ? (
              <img src={logo} alt="" className="size-16 rounded-[var(--radius-md)] object-cover" />
            ) : (
              <span className="flex size-16 items-center justify-center rounded-[var(--radius-md)] bg-muted">
                <Upload className="size-5 text-muted-foreground" />
              </span>
            )}
            <span>
              <span className="block text-sm font-medium">Logo</span>
              <span className="text-xs text-muted-foreground">Used to suggest brand colors</span>
            </span>
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(e) => onLogo(e.target.files?.[0])}
            />
          </label>
          {brandColors.length > 0 ? (
            <div className="flex gap-2">
              {brandColors.map((c) => (
                <span key={c} className="size-7 rounded-full border border-border" style={{ background: c }} title={c} />
              ))}
            </div>
          ) : null}
          <Field label="Business name" error={error}>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Northwind Traders" autoFocus />
          </Field>
          <Field label="Industry">
            <Select value={industry} onChange={(e) => setIndustry(e.target.value as IndustryId)}>
              {INDUSTRIES.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.label}
                </option>
              ))}
            </Select>
          </Field>
          <p className="text-sm text-muted-foreground">{INDUSTRIES.find((i) => i.id === industry)?.description}</p>
          <Field label="Business type">
            <Select value={businessType} onChange={(e) => setBusinessType(e.target.value)}>
              {BUSINESS_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </Select>
          </Field>
          <Button className="mt-auto" size="lg" onClick={next}>
            Continue
          </Button>
        </div>
      ) : null}

      {step === 2 ? (
        <div className="flex flex-1 flex-col gap-4">
          <h1 className="font-display text-3xl">Location and contact</h1>
          <Field label="Country">
            <Select value={country} onChange={(e) => onCountry(e.target.value)}>
              {COUNTRIES.map((c) => (
                <option key={c.name} value={c.name}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Currency">
              <Input value={currency} onChange={(e) => setCurrency(e.target.value.toUpperCase())} />
            </Field>
            <Field label="Timezone">
              <Input value={timezone} onChange={(e) => setTimezone(e.target.value)} />
            </Field>
          </div>
          <Field label="City / area">
            <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Optional" />
          </Field>
          <Field label="Phone">
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" />
          </Field>
          <Field label="Email">
            <Input value={email} onChange={(e) => setEmail(e.target.value)} inputMode="email" />
          </Field>
          <Field label="Website">
            <Input value={website} onChange={(e) => setWebsite(e.target.value)} inputMode="url" />
          </Field>
          <Button className="mt-auto" size="lg" onClick={next}>
            Continue
          </Button>
        </div>
      ) : null}

      {step === 3 ? (
        <div className="flex flex-1 flex-col gap-4">
          <h1 className="font-display text-3xl">Look and feel</h1>
          <p className="text-sm text-muted-foreground">The theme applies across the entire operating system.</p>
          <Field label="Appearance">
            <Select value={appearance} onChange={(e) => setAppearance(e.target.value as Appearance)}>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
              <option value="auto">Auto</option>
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            {PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                disabled={p.id === "brand" && brandColors.length === 0}
                onClick={() => setThemePreset(p.id)}
                className={cn(
                  "rounded-[var(--radius-xl)] border p-3 text-left",
                  themePreset === p.id ? "border-primary bg-primary/8" : "border-border bg-card",
                  p.id === "brand" && brandColors.length === 0 && "opacity-40",
                )}
              >
                <span className="block text-sm font-semibold">{p.label}</span>
                <span className="text-xs text-muted-foreground">{p.blurb}</span>
                <span className="mt-3 flex gap-1">
                  {(p.id === "brand" ? brandColors.slice(0, 4) : swatches(p.id)).map((c) => (
                    <span key={c} className="h-4 flex-1 rounded-full" style={{ background: c }} />
                  ))}
                </span>
              </button>
            ))}
          </div>
          <Button className="mt-auto" size="lg" onClick={next}>
            Continue
          </Button>
        </div>
      ) : null}

      {step === 4 ? (
        <div className="flex flex-1 flex-col gap-4">
          <h1 className="font-display text-3xl">Modules</h1>
          <p className="text-sm text-muted-foreground">
            Recommended for {industryDef.label}. You can enable, disable, and reorder — more industries can be added later.
          </p>
          <ul className="space-y-2">
            {modules.map((id, index) => {
              const def = MODULE_CATALOG[id];
              return (
                <li key={id} className="flex items-center gap-2 rounded-[var(--radius-lg)] border border-border bg-card px-3 py-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{def.label}</p>
                    <p className="text-xs text-muted-foreground">{def.implemented ? def.description : "Coming later"}</p>
                  </div>
                  <div className="flex gap-1">
                    <button type="button" className="size-9 text-sm" onClick={() => moveModule(id, -1)} disabled={index === 0} aria-label="Move up">
                      ↑
                    </button>
                    <button type="button" className="size-9 text-sm" onClick={() => moveModule(id, 1)} disabled={index === modules.length - 1} aria-label="Move down">
                      ↓
                    </button>
                  </div>
                  <Switch checked onCheckedChange={() => toggleModule(id)} label={`Disable ${def.label}`} />
                </li>
              );
            })}
          </ul>
          <p className="text-xs font-medium text-muted-foreground">Also available</p>
          <ul className="space-y-2">
            {available
              .filter((id) => !modules.includes(id))
              .map((id) => {
                const def = MODULE_CATALOG[id];
                return (
                  <li key={id} className="flex items-center gap-2 rounded-[var(--radius-lg)] bg-muted/50 px-3 py-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{def.label}</p>
                      <p className="text-xs text-muted-foreground">{def.implemented ? def.description : "Planned for this industry"}</p>
                    </div>
                    <Switch checked={false} onCheckedChange={() => toggleModule(id)} label={`Enable ${def.label}`} />
                  </li>
                );
              })}
          </ul>
          {error ? <p className="text-sm text-danger">{error}</p> : null}
          <Button className="mt-auto" size="lg" onClick={finish} disabled={busy}>
            Open Business Sutra
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function swatches(preset: ThemePreset): string[] {
  if (preset === "professional") return ["#1B3A4B", "#E8EEF1", "#1C1917"];
  if (preset === "contrast") return ["#111111", "#FAFAF8", "#444444"];
  return ["#0F5C54", "#F4F1EA", "#1C1917"];
}
