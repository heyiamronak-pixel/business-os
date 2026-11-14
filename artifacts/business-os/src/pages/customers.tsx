import { useMemo, useState } from 'react';
import { ContactRound, Edit3, UserPlus } from 'lucide-react';
import { useBusiness } from '@/hooks/use-workspace';
import { AddButton, DeleteButton, EmptyState, inputClass, PageFrame, PageIntro, SearchField, SectionCard } from '@/components/record-ui';
import type { Customer } from '@/domain/types';

const blank: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'> = { name: '', phone: '', email: '', notes: '' };

export default function Customers() {
  const { state, saveCustomer, deleteCustomer } = useBusiness();
  const [form, setForm] = useState(blank);
  const [editingId, setEditingId] = useState('');
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const filtered = useMemo(() => state.customers.filter((customer) => `${customer.name} ${customer.phone} ${customer.email}`.toLowerCase().includes(search.toLowerCase())), [search, state.customers]);
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.name.trim()) return;
    saveCustomer({ ...form, name: form.name.trim(), id: editingId || undefined });
    setForm({ ...blank }); setEditingId(''); setOpen(false);
  };
  return <PageFrame>
    <PageIntro eyebrow="Relationships" title="Customers" description="Keep a clean customer record that sales and follow-up work can reference." action={<AddButton label="Add customer" onClick={() => { setForm({ ...blank }); setEditingId(''); setOpen(true); }} />} />
    {open && <SectionCard className="mb-4"><div className="mb-4 flex items-center gap-2"><UserPlus className="size-4 text-[hsl(var(--accent-foreground))]" /><h3 className="text-sm font-semibold">{editingId ? 'Edit customer' : 'New customer'}</h3></div><form onSubmit={submit} className="grid gap-4 sm:grid-cols-2"><label className="grid gap-2 text-xs font-semibold">Name<input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputClass} /></label><label className="grid gap-2 text-xs font-semibold">Phone<input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={inputClass} /></label><label className="grid gap-2 text-xs font-semibold">Email<input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={inputClass} /></label><label className="grid gap-2 text-xs font-semibold sm:col-span-2">Notes<textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className={`${inputClass} py-3`} /></label><div className="flex gap-2 sm:col-span-2"><button type="submit" className="min-h-11 rounded-xl bg-[hsl(var(--primary))] px-4 text-sm font-semibold text-[hsl(var(--primary-foreground))]">{editingId ? 'Save changes' : 'Create customer'}</button><button type="button" onClick={() => setOpen(false)} className="min-h-11 rounded-xl border border-[hsl(var(--border))] px-4 text-sm font-semibold">Cancel</button></div></form></SectionCard>}
    <SectionCard><div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-2"><ContactRound className="size-4" /><h3 className="text-sm font-semibold">{state.customers.length} customers</h3></div><div className="w-full sm:max-w-xs"><SearchField value={search} onChange={setSearch} placeholder="Search customers" /></div></div>{filtered.length === 0 ? <EmptyState title={state.customers.length ? 'No matching customers' : 'No customers yet'} description={state.customers.length ? 'Try another search.' : 'Add customers as real relationships are created.'} /> : <div className="grid gap-2">{filtered.map((customer) => <div key={customer.id} className="flex items-center gap-3 rounded-xl border border-[hsl(var(--border))] p-3"><span className="grid size-10 shrink-0 place-items-center rounded-full bg-[hsl(var(--muted))] text-sm font-bold">{customer.name.slice(0, 1).toUpperCase()}</span><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{customer.name}</p><p className="mt-0.5 truncate text-xs text-[hsl(var(--muted-foreground))]">{customer.phone || customer.email || 'No contact details'}</p></div><button type="button" aria-label={`Edit ${customer.name}`} onClick={() => { setEditingId(customer.id); setForm({ name: customer.name, phone: customer.phone, email: customer.email, notes: customer.notes }); setOpen(true); }} className="grid size-10 place-items-center rounded-lg border border-[hsl(var(--border))]"><Edit3 className="size-4" /></button><DeleteButton label="" onClick={() => deleteCustomer(customer.id)} /></div>)}</div>}</SectionCard>
  </PageFrame>;
}