import { useMemo, useState } from 'react';
import { Boxes, Edit3, ImagePlus, PackagePlus } from 'lucide-react';
import { useBusiness } from '@/hooks/use-workspace';
import { AddButton, DeleteButton, EmptyState, inputClass, PageFrame, PageIntro, SearchField, SectionCard } from '@/components/record-ui';
import type { Product } from '@/domain/types';

const blank: Omit<Product, 'id' | 'createdAt' | 'updatedAt'> = {
  name: '', sku: '', barcode: '', category: '', costPrice: 0, sellingPrice: 0, stock: 0, minimumStock: 0, unit: 'unit', imageDataUrl: '',
};

export default function Products() {
  const { state, workspace, saveProduct, deleteProduct } = useBusiness();
  const [form, setForm] = useState({ ...blank });
  const [editingId, setEditingId] = useState('');
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const filtered = useMemo(() => state.products.filter((product) => `${product.name} ${product.sku} ${product.barcode} ${product.category}`.toLowerCase().includes(search.toLowerCase())), [search, state.products]);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    try {
      saveProduct({ ...form, name: form.name.trim(), costPrice: Number(form.costPrice), sellingPrice: Number(form.sellingPrice), stock: Number(form.stock), minimumStock: Number(form.minimumStock), sku: form.sku.trim(), barcode: form.barcode.trim(), id: editingId || undefined });
      setForm({ ...blank }); setEditingId(''); setOpen(false);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not save product.');
    }
  };
  const edit = (product: Product) => { setEditingId(product.id); setForm({ ...product }); setOpen(true); setError(''); };
  const remove = (product: Product) => {
    setError('');
    if (!window.confirm('Delete ' + product.name + '?')) return;
    try { deleteProduct(product.id); }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Could not delete product.'); }
  };

  return <PageFrame>
    <PageIntro eyebrow="Operations" title="Products" description="Manage your catalog, pricing, and stock-aware product records." action={<AddButton label="Add product" onClick={() => { setForm({ ...blank }); setEditingId(''); setError(''); setOpen(true); }} />} />
    {error && <p role="alert" className="mb-3 text-xs font-semibold text-[hsl(var(--destructive))]">{error}</p>}
    {open && <SectionCard className="mb-4">
      <div className="mb-4 flex items-center gap-2"><PackagePlus className="size-4 text-[hsl(var(--accent-foreground))]" /><h3 className="text-sm font-semibold">{editingId ? 'Edit product' : 'New product'}</h3></div>
      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-2 text-xs font-semibold sm:col-span-2">Name<input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputClass} /></label>
        <label className="grid gap-2 text-xs font-semibold">SKU<input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} className={inputClass} /></label>
        <label className="grid gap-2 text-xs font-semibold">Barcode<input value={form.barcode} onChange={(e) => setForm({ ...form, barcode: e.target.value })} className={inputClass} /></label>
        <label className="grid gap-2 text-xs font-semibold">Category<input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className={inputClass} /></label>
        <label className="grid gap-2 text-xs font-semibold">Unit<input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} className={inputClass} /></label>
        <label className="grid gap-2 text-xs font-semibold">Cost price<input type="number" min="0" step="0.01" value={form.costPrice} onChange={(e) => setForm({ ...form, costPrice: Number(e.target.value) })} className={inputClass} /></label>
        <label className="grid gap-2 text-xs font-semibold">Selling price<input type="number" min="0" step="0.01" value={form.sellingPrice} onChange={(e) => setForm({ ...form, sellingPrice: Number(e.target.value) })} className={inputClass} /></label>
        <label className="grid gap-2 text-xs font-semibold">Opening stock<input type="number" min="0" step="1" value={form.stock} onChange={(e) => setForm({ ...form, stock: Number(e.target.value) })} className={inputClass} /></label>
        <label className="grid gap-2 text-xs font-semibold">Minimum stock<input type="number" min="0" step="1" value={form.minimumStock} onChange={(e) => setForm({ ...form, minimumStock: Number(e.target.value) })} className={inputClass} /></label>
        <div className="flex items-center gap-3 sm:col-span-2"><label htmlFor="product-image" className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-[hsl(var(--border))] px-4 text-xs font-semibold"><ImagePlus className="size-4" /> {form.imageDataUrl ? 'Replace image' : 'Add image'}<input id="product-image" type="file" accept="image/*" className="sr-only" onChange={(e) => { const file = e.target.files?.[0]; if (!file) return; const reader = new FileReader(); reader.onload = () => setForm({ ...form, imageDataUrl: String(reader.result) }); reader.readAsDataURL(file); }} /></label>{form.imageDataUrl && <img src={form.imageDataUrl} alt="" className="size-11 rounded-lg object-cover" />}</div>
        {error && <p role="alert" className="text-xs font-semibold text-[hsl(var(--destructive))] sm:col-span-2">{error}</p>}
        <div className="flex gap-2 sm:col-span-2"><button type="submit" className="min-h-11 rounded-xl bg-[hsl(var(--primary))] px-4 text-sm font-semibold text-[hsl(var(--primary-foreground))]">{editingId ? 'Save changes' : 'Create product'}</button><button type="button" onClick={() => setOpen(false)} className="min-h-11 rounded-xl border border-[hsl(var(--border))] px-4 text-sm font-semibold">Cancel</button></div>
      </form>
    </SectionCard>}
    <SectionCard>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-2"><Boxes className="size-4" /><h3 className="text-sm font-semibold">{state.products.length} products</h3></div><div className="w-full sm:max-w-xs"><SearchField value={search} onChange={setSearch} placeholder="Search name, SKU, barcode" /></div></div>
      {filtered.length === 0 ? <EmptyState title={state.products.length ? 'No matching products' : 'No products yet'} description={state.products.length ? 'Try a different search.' : 'Create your first product to start inventory and sales flows.'} /> : <div className="grid gap-2">{filtered.map((product) => <div key={product.id} className="flex items-center gap-3 rounded-xl border border-[hsl(var(--border))] p-3"><div className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-lg bg-[hsl(var(--muted))]">{product.imageDataUrl ? <img src={product.imageDataUrl} alt="" className="size-full object-cover" /> : <Boxes className="size-4 text-[hsl(var(--muted-foreground))]" />}</div><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{product.name}</p><p className="mt-0.5 text-xs text-[hsl(var(--muted-foreground))]">{product.sku || 'No SKU'} · {product.stock} {product.unit} · {workspace?.currency ?? 'INR (₹)'} {product.sellingPrice}</p></div><button type="button" aria-label={`Edit ${product.name}`} onClick={() => edit(product)} className="grid size-10 place-items-center rounded-lg border border-[hsl(var(--border))]"><Edit3 className="size-4" /></button><DeleteButton label="" onClick={() => remove(product)} /></div>)}</div>}
    </SectionCard>
  </PageFrame>;
}