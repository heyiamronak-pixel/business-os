import { useMemo, useState } from 'react';
import { CircleDollarSign, Download, Edit3, Receipt, WalletCards } from 'lucide-react';
import { useBusiness } from '@/hooks/use-workspace';
import { AddButton, DeleteButton, EmptyState, inputClass, isoToday, money, PageFrame, PageIntro, SearchField, SectionCard } from '@/components/record-ui';
import type { Expense } from '@/domain/types';

const blank: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'> = { category: '', amount: 0, date: isoToday(), description: '', paymentMethod: 'Cash' };

export default function Expenses() {
  const { state, workspace, saveExpense, deleteExpense } = useBusiness();
  const [form, setForm] = useState(blank); const [editingId, setEditingId] = useState(''); const [open, setOpen] = useState(false); const [search, setSearch] = useState('');
  const filtered = useMemo(() => state.expenses.filter((expense) => `${expense.category} ${expense.description} ${expense.paymentMethod}`.toLowerCase().includes(search.toLowerCase())), [search, state.expenses]);
  const filteredTotal = filtered.reduce((sum, expense) => sum + expense.amount, 0);
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    if (!form.category.trim() || !Number.isFinite(Number(form.amount)) || Number(form.amount) <= 0) {
      setError('Enter a category and an amount greater than zero.');
      return;
    }
    saveExpense({ ...form, category: form.category.trim(), amount: Number(form.amount), id: editingId || undefined });
    setForm({ ...blank }); setEditingId(''); setOpen(false);
  };
  const exportCsv = () => {
    const rows = [['Date','Category','Description','Payment method','Amount'], ...filtered.map(expense => [expense.date, expense.category, expense.description, expense.paymentMethod, String(expense.amount)])];
    const csv = rows.map(row => row.map(value => '"' + String(value ?? '').replace(/"/g, '""') + '"').join(',')).join('\\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'business-sutra-expenses.csv';
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return <PageFrame><PageIntro eyebrow="Finance" title="Expenses" description="Capture actual business costs so profit and margin use real records." action={<div className="flex flex-wrap gap-2"><button type="button" onClick={exportCsv} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[hsl(var(--border))] px-3 text-xs font-semibold"><Download className="size-3.5"/>Export CSV</button><AddButton label="Add expense" onClick={() => { setForm({ ...blank }); setEditingId(''); setError(''); setOpen(true); }} /></div>} />
    <div className="mb-4 grid grid-cols-2 gap-3"><SectionCard><p className="text-xs text-[hsl(var(--muted-foreground))]">Filtered expenses</p><p className="mt-2 text-xl font-semibold">{filtered.length}</p></SectionCard><SectionCard><p className="text-xs text-[hsl(var(--muted-foreground))]">Filtered total</p><p className="mt-2 text-xl font-semibold">{money(filteredTotal, workspace?.currency)}</p></SectionCard></div>
    {error && <p role="alert" className="mb-3 text-xs font-semibold text-[hsl(var(--destructive))]">{error}</p>}
    {open && <SectionCard className="mb-4"><div className="mb-4 flex items-center gap-2"><WalletCards className="size-4" /><h3 className="text-sm font-semibold">{editingId ? 'Edit expense' : 'New expense'}</h3></div><form onSubmit={submit} className="grid gap-4 sm:grid-cols-2"><label className="grid gap-2 text-xs font-semibold">Category<input required value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className={inputClass} /></label><label className="grid gap-2 text-xs font-semibold">Amount<input required type="number" min="0.01" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })} className={inputClass} /></label><label className="grid gap-2 text-xs font-semibold">Date<input required type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className={inputClass} /></label><label className="grid gap-2 text-xs font-semibold">Payment method<select value={form.paymentMethod} onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })} className={inputClass}><option>Cash</option><option>Bank transfer</option><option>Card</option><option>UPI</option><option>Other</option></select></label><label className="grid gap-2 text-xs font-semibold sm:col-span-2">Description<input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={inputClass} /></label>{error && <p role="alert" className="text-xs font-semibold text-[hsl(var(--destructive))] sm:col-span-2">{error}</p>}<div className="flex gap-2 sm:col-span-2"><button type="submit" className="min-h-11 rounded-xl bg-[hsl(var(--primary))] px-4 text-sm font-semibold text-[hsl(var(--primary-foreground))]">{editingId ? 'Save changes' : 'Create expense'}</button><button type="button" onClick={() => setOpen(false)} className="min-h-11 rounded-xl border border-[hsl(var(--border))] px-4 text-sm font-semibold">Cancel</button></div></form></SectionCard>}
    <SectionCard><div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-2"><Receipt className="size-4" /><h3 className="text-sm font-semibold">{state.expenses.length} expenses</h3></div><div className="w-full sm:max-w-xs"><SearchField value={search} onChange={setSearch} placeholder="Search expenses" /></div></div>{filtered.length === 0 ? <EmptyState title={state.expenses.length ? 'No matching expenses' : 'No expenses yet'} description={state.expenses.length ? 'Try another search.' : 'Add actual expenses to make profit reporting useful.'} /> : <div className="grid gap-2">{filtered.map((expense) => <div key={expense.id} className="flex items-center gap-3 rounded-xl border border-[hsl(var(--border))] p-3"><span className="grid size-9 shrink-0 place-items-center rounded-lg bg-[hsl(var(--muted))]"><CircleDollarSign className="size-4" /></span><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{expense.category}</p><p className="mt-0.5 truncate text-xs text-[hsl(var(--muted-foreground))]">{expense.date} · {expense.paymentMethod} {expense.description && `· ${expense.description}`}</p></div><strong className="text-sm">{money(expense.amount, workspace?.currency)}</strong><button type="button" aria-label={`Edit ${expense.category}`} onClick={() => { setEditingId(expense.id); setForm({ category: expense.category, amount: expense.amount, date: expense.date, description: expense.description, paymentMethod: expense.paymentMethod }); setOpen(true); }} className="grid size-10 place-items-center rounded-lg border border-[hsl(var(--border))]"><Edit3 className="size-4" /></button><DeleteButton label="" onClick={() => deleteExpense(expense.id)} /></div>)}</div>}</SectionCard>
  </PageFrame>;
}