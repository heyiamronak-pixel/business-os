import { type ReactNode } from 'react';
import { Plus, Search, Trash2 } from 'lucide-react';

export function PageFrame({ children }: { children: ReactNode }) {
  return <div className="mx-auto w-full max-w-[1600px] px-4 py-5 pb-28 sm:px-6 sm:py-8 lg:px-9 lg:pb-10">{children}</div>;
}

export function PageIntro({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[hsl(var(--muted-foreground))]">{eyebrow}</p>
        <h2 className="mt-1 text-2xl font-semibold tracking-[-0.045em]">{title}</h2>
        <p className="mt-2 max-w-xl text-sm leading-6 text-[hsl(var(--muted-foreground))]">{description}</p>
      </div>
      {action}
    </div>
  );
}

export function SectionCard({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 sm:p-5 ${className}`}>{children}</section>;
}

export function EmptyState({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.25)] p-6 text-center">
      <p className="text-sm font-semibold">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-xs leading-5 text-[hsl(var(--muted-foreground))]">{description}</p>
      {action}
    </div>
  );
}

export function SearchField({ value, onChange, placeholder = 'Search records' }: { value: string; onChange: (value: string) => void; placeholder?: string }) {
  return (
    <label className="relative block">
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" />
      <input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="min-h-11 w-full rounded-xl border border-[hsl(var(--input))] bg-[hsl(var(--background))] pl-9 pr-3 text-sm outline-none focus:border-[hsl(var(--accent))] focus:ring-2 focus:ring-[hsl(var(--accent)/0.16)]" />
    </label>
  );
}

export function AddButton({ onClick, label = 'Add record' }: { onClick: () => void; label?: string }) {
  return <button type="button" onClick={onClick} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-4 text-sm font-semibold text-[hsl(var(--primary-foreground))]"><Plus className="size-4" />{label}</button>;
}

export function DeleteButton({ onClick, label = 'Delete' }: { onClick: () => void; label?: string }) {
  return <button type="button" onClick={onClick} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[hsl(var(--destructive)/0.3)] px-3 text-xs font-semibold text-[hsl(var(--destructive))]"><Trash2 className="size-3.5" />{label}</button>;
}

export function money(value: number, currency = 'INR (₹)') {
  const symbol = currency.includes('₹') || currency.toUpperCase().includes('INR') ? '₹' : currency.split(' ')[0] || '';
  return `${symbol}${value.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}

export const isoToday = () => new Date().toISOString().slice(0, 10);

export const inputClass = 'min-h-11 rounded-xl border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 text-sm outline-none focus:border-[hsl(var(--accent))] focus:ring-2 focus:ring-[hsl(var(--accent)/0.16)]';