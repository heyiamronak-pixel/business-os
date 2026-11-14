import { useMemo, useState, type ChangeEvent, type FormEvent } from 'react';
import {
  ArrowRight,
  Check,
  ChevronLeft,
  Compass,
  ImagePlus,
  Palette,
  RotateCcw,
} from 'lucide-react';
import { Link, useLocation } from 'wouter';
import { defaultModulesForIndustry, moduleLabels, moduleOptions } from '@/data/modules';
import { useWorkspace, type WorkspaceSetup } from '@/hooks/use-workspace';
import {
  extractDominantColor,
  readImageDataUrl,
  themeSuggestions,
  type ThemeSuggestion,
} from '@/services/theme-utils';
import type { ThemeMode } from '@/domain/types';

const industries = [
  'Retail',
  'Travel & Tourism',
  'Hospitality',
  'Agency / Services',
  'Manufacturing',
  'E-commerce',
  'Other',
];

const initialForm: WorkspaceSetup = {
  businessName: '',
  industry: 'Retail',
  country: 'India',
  currency: 'INR (₹)',
  timezone: 'Asia/Kolkata',
  phone: '',
  email: '',
  website: '',
  address: '',
  logoDataUrl: '',
  brandColor: '#1f2937',
  themeId: 'professional',
  themeMode: 'auto',
  enabledModules: defaultModulesForIndustry('Retail'),
};

export default function Setup() {
  const { workspace, saveWorkspace, themeOptions } = useWorkspace();
  const [, setLocation] = useLocation();
  const [form, setForm] = useState<WorkspaceSetup>(workspace ?? initialForm);
  const [brandColor, setBrandColor] = useState(workspace?.brandColor ?? '#1f2937');
  const [saved, setSaved] = useState(false);
  const [imageError, setImageError] = useState('');

  const options = useMemo<ThemeSuggestion[]>(
    () => themeSuggestions(brandColor),
    [brandColor],
  );

  const update = <K extends keyof WorkspaceSetup>(field: K, value: WorkspaceSetup[K]) => {
    setForm((current) => ({ ...current, [field]: value }));
    setSaved(false);
  };

  const changeIndustry = (industry: string) => {
    update('industry', industry);
    update('enabledModules', defaultModulesForIndustry(industry));
  };

  const toggleModule = (module: string) => {
    const next = form.enabledModules.includes(module)
      ? form.enabledModules.filter((item) => item !== module)
      : [...form.enabledModules, module];
    update('enabledModules', next);
  };

  const handleLogo = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setImageError('Choose a PNG, JPG, WEBP, or other image file.');
      return;
    }
    try {
      const dataUrl = await readImageDataUrl(file);
      const dominant = await extractDominantColor(dataUrl);
      update('logoDataUrl', dataUrl);
      update('brandColor', dominant);
      setBrandColor(dominant);
      setImageError('');
    } catch {
      setImageError('This image could not be processed. Try another file.');
    }
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.businessName.trim()) return;
    saveWorkspace({
      ...form,
      businessName: form.businessName.trim(),
      brandColor,
    });
    setSaved(true);
  };

  const setTheme = (suggestion: ThemeSuggestion) => {
    update('themeId', suggestion.id);
    update('brandColor', brandColor);
  };

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-5 pb-28 sm:px-6 sm:py-8 lg:px-9 lg:pb-10">
      <Link href="/dashboard" data-testid="link-setup-back" className="mb-6 inline-flex min-h-10 items-center gap-2 text-xs font-semibold text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]">
        <ChevronLeft className="size-4" /> Back to dashboard
      </Link>

      <div className="animate-enter mb-6">
        <div className="mb-3 flex size-10 items-center justify-center rounded-xl bg-[hsl(var(--accent)/0.17)] text-[hsl(var(--accent-foreground))]">
          <Compass className="size-5" />
        </div>
        <p className="text-[10px] font-bold uppercase tracking-[0.17em] text-[hsl(var(--muted-foreground))]">Business onboarding</p>
        <h2 data-testid="text-setup-title" className="mt-1 text-2xl font-semibold tracking-[-0.045em] sm:text-3xl">Create Your Workspace</h2>
        <p className="mt-2 max-w-lg text-sm leading-6 text-[hsl(var(--muted-foreground))]">Set up your business context, brand, and starting modules. Your records will remain empty until you add them.</p>
      </div>

      <form onSubmit={submit} className="grid gap-4">
        <section className="overflow-hidden rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
          <div className="border-b border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.42)] px-4 py-3 sm:px-6">
            <div className="flex items-center gap-2 text-xs font-semibold"><ImagePlus className="size-4 text-[hsl(var(--accent-foreground))]" /> Brand and business</div>
            <p className="mt-1 text-[11px] text-[hsl(var(--muted-foreground))]">Your logo is processed locally on this device.</p>
          </div>
          <div className="grid gap-5 p-4 sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <label htmlFor="logo-upload" className="grid size-24 shrink-0 cursor-pointer place-items-center overflow-hidden rounded-2xl border border-dashed border-[hsl(var(--input))] bg-[hsl(var(--background))] text-center text-[10px] font-semibold text-[hsl(var(--muted-foreground))]">
                {form.logoDataUrl ? <img src={form.logoDataUrl} alt="Business logo preview" className="size-full object-contain p-2" /> : <span><ImagePlus className="mx-auto mb-1 size-5" />Add logo</span>}
                <input id="logo-upload" type="file" accept="image/*" onChange={handleLogo} className="sr-only" />
              </label>
              <div className="min-w-0">
                <p className="text-sm font-semibold">Business logo</p>
                <p className="mt-1 text-xs leading-5 text-[hsl(var(--muted-foreground))]">Used in the app header and workspace surfaces. PNG, JPG, or WEBP recommended.</p>
                {imageError && <p className="mt-2 text-xs font-semibold text-[hsl(var(--destructive))]">{imageError}</p>}
              </div>
            </div>
            <label className="grid gap-2 text-sm font-semibold" htmlFor="business-name">
              Business name
              <input id="business-name" data-testid="input-business-name" value={form.businessName} onChange={(event) => update('businessName', event.target.value)} placeholder="For example, Northstar Studio" required className="min-h-12 rounded-xl border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 text-sm font-normal outline-none transition-colors placeholder:text-[hsl(var(--muted-foreground)/0.72)] focus:border-[hsl(var(--accent))] focus:ring-2 focus:ring-[hsl(var(--accent)/0.16)]" />
            </label>
            <div className="grid gap-5 sm:grid-cols-2">
              <label className="grid gap-2 text-sm font-semibold" htmlFor="industry">
                Industry
                <select id="industry" data-testid="select-industry" value={form.industry} onChange={(event) => changeIndustry(event.target.value)} className="min-h-12 rounded-xl border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 text-sm font-normal outline-none focus:border-[hsl(var(--accent))] focus:ring-2 focus:ring-[hsl(var(--accent)/0.16)]">
                  {industries.map((industry) => <option key={industry} value={industry}>{industry}</option>)}
                </select>
              </label>
              <label className="grid gap-2 text-sm font-semibold" htmlFor="country">
                Country
                <input id="country" data-testid="input-country" value={form.country} onChange={(event) => update('country', event.target.value)} className="min-h-12 rounded-xl border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 text-sm font-normal outline-none focus:border-[hsl(var(--accent))] focus:ring-2 focus:ring-[hsl(var(--accent)/0.16)]" />
              </label>
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <label className="grid gap-2 text-sm font-semibold" htmlFor="currency">
                Currency
                <input id="currency" data-testid="input-currency" value={form.currency} onChange={(event) => update('currency', event.target.value)} placeholder="INR (₹)" className="min-h-12 rounded-xl border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 text-sm font-normal outline-none focus:border-[hsl(var(--accent))] focus:ring-2 focus:ring-[hsl(var(--accent)/0.16)]" />
              </label>
              <label className="grid gap-2 text-sm font-semibold" htmlFor="timezone">
                Timezone
                <input id="timezone" data-testid="input-timezone" value={form.timezone} onChange={(event) => update('timezone', event.target.value)} placeholder="Asia/Kolkata" className="min-h-12 rounded-xl border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 text-sm font-normal outline-none focus:border-[hsl(var(--accent))] focus:ring-2 focus:ring-[hsl(var(--accent)/0.16)]" />
              </label>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 sm:p-6">
          <div className="mb-4 flex items-center gap-2 text-xs font-semibold"><Palette className="size-4 text-[hsl(var(--accent-foreground))]" /> Theme and appearance</div>
          <div className="grid gap-3 sm:grid-cols-3">
            {options.map((option) => (
              <button type="button" key={option.id} onClick={() => setTheme(option)} className={['rounded-xl border p-3 text-left transition-colors', form.themeId === option.id ? 'border-[hsl(var(--accent))] ring-2 ring-[hsl(var(--accent)/0.18)]' : 'border-[hsl(var(--border))]'].join(' ')}>
                <span className="flex items-center gap-2"><span className="size-4 rounded-full border border-white/70 shadow-sm" style={{ background: `hsl(${option.accent})` }} /><span className="text-xs font-semibold">{option.name}</span>{form.themeId === option.id && <Check className="ml-auto size-4 text-[hsl(var(--chart-2))]" />}</span>
                <span className="mt-2 block text-[11px] leading-4 text-[hsl(var(--muted-foreground))]">{option.description}</span>
              </button>
            ))}
          </div>
          <label className="mt-4 grid gap-2 text-sm font-semibold" htmlFor="theme-mode">
            Display mode
            <select id="theme-mode" value={form.themeMode} onChange={(event) => update('themeMode', event.target.value as ThemeMode)} className="min-h-12 rounded-xl border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 text-sm font-normal">
              <option value="auto">Auto</option><option value="light">Light</option><option value="dark">Dark</option>
            </select>
          </label>
          {workspace?.logoDataUrl && form.logoDataUrl === workspace.logoDataUrl && <p className="mt-3 flex items-center gap-2 text-xs text-[hsl(var(--muted-foreground))]"><RotateCcw className="size-3.5" /> Logo colors are already informing your theme suggestions.</p>}
        </section>

        <section className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 sm:p-6">
          <div className="mb-4">
            <p className="text-xs font-semibold">Contact and location</p>
            <p className="mt-1 text-[11px] text-[hsl(var(--muted-foreground))]">Optional contact details for your future workspace profile.</p>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="grid gap-2 text-sm font-semibold" htmlFor="phone">Phone<input id="phone" value={form.phone} onChange={(event) => update('phone', event.target.value)} className="min-h-12 rounded-xl border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 text-sm font-normal" /></label>
            <label className="grid gap-2 text-sm font-semibold" htmlFor="email">Email<input id="email" type="email" value={form.email} onChange={(event) => update('email', event.target.value)} className="min-h-12 rounded-xl border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 text-sm font-normal" /></label>
          </div>
          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <label className="grid gap-2 text-sm font-semibold" htmlFor="website">Website <span className="text-xs font-normal text-[hsl(var(--muted-foreground))]">Optional</span><input id="website" type="url" value={form.website} onChange={(event) => update('website', event.target.value)} placeholder="https://" className="min-h-12 rounded-xl border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 text-sm font-normal" /></label>
            <label className="grid gap-2 text-sm font-semibold" htmlFor="address">Address <span className="text-xs font-normal text-[hsl(var(--muted-foreground))]">Optional</span><textarea id="address" value={form.address} onChange={(event) => update('address', event.target.value)} rows={2} className="min-h-12 rounded-xl border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 py-3 text-sm font-normal" /></label>
          </div>
        </section>

        <section className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 sm:p-6">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div><p className="text-xs font-semibold">Recommended modules</p><p className="mt-1 text-[11px] text-[hsl(var(--muted-foreground))]">Start with the areas that fit {form.industry}. You can change this later.</p></div>
            <button type="button" className="mt-2 inline-flex min-h-9 items-center gap-2 self-start rounded-lg border border-[hsl(var(--border))] px-3 text-[11px] font-semibold sm:mt-0" onClick={() => update('enabledModules', defaultModulesForIndustry(form.industry))}>Reset recommendations</button>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {moduleOptions.map((module) => (
              <label key={module} className="flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-[hsl(var(--border))] px-3 text-xs font-semibold">
                <input type="checkbox" checked={form.enabledModules.includes(module)} onChange={() => toggleModule(module)} className="size-4 accent-[hsl(var(--accent))]" />
                <span>{moduleLabels[module]}</span>
              </label>
            ))}
          </div>
        </section>

        <div className="flex flex-col gap-3 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.25)] p-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          {saved ? <p data-testid="status-workspace-saved" className="flex items-center gap-2 text-xs font-semibold text-[hsl(var(--chart-2))]"><Check className="size-4" /> Workspace and preferences saved on this device.</p> : <p className="text-xs text-[hsl(var(--muted-foreground))]">No business records are created by onboarding.</p>}
          <button type="submit" data-testid="button-continue-setup" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-5 text-sm font-semibold text-[hsl(var(--primary-foreground))] transition-transform active:scale-[0.98] sm:min-w-36">
            Continue <ArrowRight className="size-4" />
          </button>
        </div>
      </form>

      {saved && <div className="animate-enter mt-4 flex flex-col gap-3 rounded-2xl border border-[hsl(var(--chart-2)/0.35)] bg-[hsl(var(--chart-2)/0.08)] p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-semibold">Your workspace is ready.</p><p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">Your logo, theme, and module choices are active. Add real records when ready.</p></div><button type="button" data-testid="button-open-workspace" onClick={() => setLocation('/dashboard')} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-4 text-xs font-semibold">Open dashboard <ArrowRight className="size-3.5" /></button></div>}
    </div>
  );
}