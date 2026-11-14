import { useMemo, useState } from 'react';
import { Plus, ShoppingCart, Trash2 } from 'lucide-react';
import { useBusiness } from '@/hooks/use-workspace';
import { EmptyState, inputClass, money, PageFrame, PageIntro, SectionCard } from '@/components/record-ui';
import type { PaymentStatus } from '@/domain/types';

type CartLine = { productId: string; quantity: number };
const newLine = (): CartLine => ({ productId: '', quantity: 1 });

export default function Sales() {
  const { state, workspace, createSale, deleteSale } = useBusiness();
  const [customerId, setCustomerId] = useState('');
  const [lines, setLines] = useState<CartLine[]>([newLine()]);
  const [discount, setDiscount] = useState(0);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('paid');
  const [error, setError] = useState('');

  const preview = useMemo(() => lines.reduce((sum, line) => {
    const product = state.products.find((item) => item.id === line.productId);
    return sum + (product ? product.sellingPrice * Math.max(0, line.quantity) : 0);
  }, 0), [lines, state.products]);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    const validLines = lines.filter((line) => line.productId);
    if (!validLines.length) { setError('Select at least one product.'); return; }
    for (const line of validLines) {
      const product = state.products.find((item) => item.id === line.productId);
      if (!product) { setError('A selected product is no longer available.'); return; }
      if (!Number.isInteger(line.quantity) || line.quantity <= 0) { setError('Enter a whole quantity greater than zero.'); return; }
      const totalRequested = validLines.filter((item) => item.productId === line.productId).reduce((sum, item) => sum + item.quantity, 0);
      if (totalRequested > product.stock) { setError(`${product.name} has only ${product.stock} in stock.`); return; }
    }
    try {
      createSale({ customerId, items: validLines, discount: Number(discount), paymentStatus });
      setLines([newLine()]);
      setCustomerId('');
      setDiscount(0);
      setPaymentStatus('paid');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not create sale.');
    }
  };

  return <PageFrame>
    <PageIntro eyebrow="Revenue" title="Sales" description="Record sales, keep payment status visible, and update inventory automatically." />
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.9fr)]">
      <SectionCard>
        <div className="mb-4 flex items-center gap-2"><ShoppingCart className="size-4" /><h3 className="text-sm font-semibold">Create sale</h3></div>
        {state.products.length === 0 ? <EmptyState title="Add products first" description="Create products and opening stock before recording a sale." /> : <form onSubmit={submit} className="grid gap-4">
          <label className="grid gap-2 text-xs font-semibold">Customer <span className="text-[11px] font-normal text-[hsl(var(--muted-foreground))]">Optional</span><select value={customerId} onChange={(event) => setCustomerId(event.target.value)} className={inputClass}><option value="">Walk-in customer</option>{state.customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}</select></label>
          <div className="grid gap-3">
            {lines.map((line, index) => {
              const product = state.products.find((item) => item.id === line.productId);
              return <div key={index} className="grid gap-2 rounded-xl border border-[hsl(var(--border))] p-3 sm:grid-cols-[minmax(0,1fr)_110px_100px_40px] sm:items-end">
                <label className="grid gap-2 text-xs font-semibold">Product<select required value={line.productId} onChange={(event) => setLines((current) => current.map((item, i) => i === index ? { ...item, productId: event.target.value } : item))} className={inputClass}><option value="">Select product</option>{state.products.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.stock} in stock</option>)}</select></label>
                <label className="grid gap-2 text-xs font-semibold">Quantity<input type="number" min="1" step="1" value={line.quantity} onChange={(event) => setLines((current) => current.map((item, i) => i === index ? { ...item, quantity: Number(event.target.value) } : item))} className={inputClass} /></label>
                <div className="text-xs"><p className="font-semibold text-[hsl(var(--muted-foreground))]">Line total</p><p className="mt-2 font-semibold">{money((product?.sellingPrice ?? 0) * line.quantity, workspace?.currency)}</p></div>
                <button type="button" aria-label="Remove product row" onClick={() => setLines((current) => current.length > 1 ? current.filter((_, i) => i !== index) : [newLine()])} className="grid size-10 place-items-center rounded-lg border border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))]"><Trash2 className="size-4" /></button>
              </div>;
            })}
          </div>
          <button type="button" onClick={() => setLines((current) => [...current, newLine()])} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-dashed border-[hsl(var(--border))] text-xs font-semibold"><Plus className="size-4" /> Add another product</button>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-2 text-xs font-semibold">Discount<input type="number" min="0" max={preview} step="0.01" value={discount} onChange={(event) => setDiscount(Number(event.target.value))} className={inputClass} /></label>
            <label className="grid gap-2 text-xs font-semibold">Payment status<select value={paymentStatus} onChange={(event) => setPaymentStatus(event.target.value as PaymentStatus)} className={inputClass}><option value="paid">Paid</option><option value="pending">Pending</option><option value="refunded">Refunded</option></select></label>
          </div>
          <div className="flex items-center justify-between rounded-xl bg-[hsl(var(--muted)/0.55)] p-3"><span className="text-xs font-semibold">Estimated total</span><strong className="text-lg">{money(Math.max(0, preview - Math.max(0, Number(discount))), workspace?.currency)}</strong></div>
          {error && <p role="alert" className="text-xs font-semibold text-[hsl(var(--destructive))]">{error}</p>}
          <button type="submit" className="min-h-11 rounded-xl bg-[hsl(var(--primary))] px-4 text-sm font-semibold text-[hsl(var(--primary-foreground))]">Save sale</button>
        </form>}
      </SectionCard>
      <SectionCard>
        <div className="mb-4 flex items-center justify-between"><h3 className="text-sm font-semibold">Sales history</h3><span className="rounded-full bg-[hsl(var(--muted))] px-3 py-1 text-xs font-semibold">{state.sales.length} sales</span></div>
        {state.sales.length === 0 ? <EmptyState title="No sales yet" description="Completed sales will appear here with their payment status and totals." /> : <div className="grid gap-2">{state.sales.map((sale) => {
          const customer = state.customers.find((item) => item.id === sale.customerId);
          return <div key={sale.id} className="rounded-xl border border-[hsl(var(--border))] p-3">
            <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-sm font-semibold">{customer?.name ?? 'Walk-in customer'}</p><p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">{new Date(sale.createdAt).toLocaleString()} · {sale.items.reduce((sum, item) => sum + item.quantity, 0)} items</p></div><strong className="shrink-0 text-sm">{money(sale.total, workspace?.currency)}</strong></div>
            <div className="mt-3 flex items-center justify-between gap-2"><span className="rounded-full bg-[hsl(var(--muted))] px-2.5 py-1 text-[10px] font-bold capitalize">{sale.paymentStatus}</span><button type="button" onClick={() => deleteSale(sale.id)} className="text-xs font-semibold text-[hsl(var(--destructive))]">Delete sale & restore stock</button></div>
          </div>;
        })}</div>}
      </SectionCard>
    </div>
  </PageFrame>;
}
