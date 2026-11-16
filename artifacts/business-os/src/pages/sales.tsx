import { useMemo, useState } from 'react';
import { Plus, ShoppingCart, Trash2 } from 'lucide-react';
import { useBusiness } from '@/hooks/use-workspace';
import { EmptyState, inputClass, money, PageFrame, PageIntro, SectionCard } from '@/components/record-ui';
import { salePaymentAmounts } from '@/services/business-logic';

type CartLine = { productId: string; quantity: number };

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character] ?? character);
}

function openSaleReceipt(sale: import('@/domain/types').Sale, customer: import('@/domain/types').Customer | undefined, workspace: import('@/domain/types').WorkspaceSetup | null) {
  const printWindow = window.open('', '_blank', 'width=760,height=800');
  if (!printWindow) return false;

  const businessDetails = [
    workspace?.address,
    workspace?.phone ? 'Phone: ' + workspace.phone : '',
    workspace?.email ? 'Email: ' + workspace.email : '',
    workspace?.gstRegistered && workspace.gstin ? 'GSTIN: ' + workspace.gstin : '',
  ].filter((value): value is string => typeof value === 'string' && value.length > 0).map(value => '<p>' + escapeHtml(value) + '</p>').join('');

  const items = sale.items.map(item =>
    '<tr><td>' + escapeHtml(item.name) + '</td><td class="number">' + item.quantity +
    '</td><td class="number">' + escapeHtml(money(item.unitPrice, workspace?.currency)) +
    '</td><td class="number">' + escapeHtml(money(item.total, workspace?.currency)) + '</td></tr>'
  ).join('');

  const paymentAmounts = salePaymentAmounts(sale);
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Sales receipt</title>
<style>
  * { box-sizing: border-box; }
  body { margin: 0; padding: 36px; color: #171717; font: 14px/1.5 Arial, sans-serif; }
  .receipt { max-width: 720px; margin: 0 auto; }
  header { display: flex; justify-content: space-between; gap: 24px; padding-bottom: 20px; border-bottom: 2px solid #222; }
  h1 { margin: 0 0 8px; font-size: 24px; }
  h2 { margin: 28px 0 8px; font-size: 15px; }
  p { margin: 2px 0; color: #555; }
  .meta { text-align: right; }
  table { width: 100%; margin-top: 20px; border-collapse: collapse; }
  th, td { padding: 10px 8px; border-bottom: 1px solid #ddd; text-align: left; }
  th { font-size: 11px; text-transform: uppercase; color: #666; }
  .number { text-align: right; white-space: nowrap; }
  .totals { width: 280px; margin: 18px 0 0 auto; }
  .totals div { display: flex; justify-content: space-between; gap: 16px; padding: 5px 0; }
  .grand { border-top: 2px solid #222; margin-top: 5px; padding-top: 10px !important; font-size: 17px; font-weight: 700; }
  .status { display: inline-block; margin-top: 12px; border: 1px solid #999; border-radius: 20px; padding: 4px 10px; font-size: 11px; text-transform: uppercase; }
  footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #ddd; color: #666; font-size: 11px; }
  @media print { body { padding: 0; } .receipt { max-width: none; } }
</style>
</head>
<body>
<div class="receipt">
<header>
  <div><h1>${escapeHtml(workspace?.businessName || 'Business')}</h1>${businessDetails}</div>
  <div class="meta"><h1>Sales Receipt</h1><p>Reference: ${escapeHtml(sale.id)}</p><p>${escapeHtml(new Date(sale.createdAt).toLocaleString())}</p><span class="status">${escapeHtml(sale.paymentStatus)}</span></div>
</header>
<section><h2>Customer</h2><p>${escapeHtml(customer?.name || 'Walk-in customer')}</p>${customer?.phone ? '<p>' + escapeHtml(customer.phone) + '</p>' : ''}${customer?.email ? '<p>' + escapeHtml(customer.email) + '</p>' : ''}</section>
<table><thead><tr><th>Item</th><th class="number">Qty</th><th class="number">Unit price</th><th class="number">Total</th></tr></thead><tbody>${items}</tbody></table>
<div class="totals">
  <div><span>Subtotal</span><strong>${escapeHtml(money(sale.subtotal, workspace?.currency))}</strong></div>
  <div><span>Discount</span><strong>${escapeHtml(money(sale.discount, workspace?.currency))}</strong></div>
  <div><span>Amount received</span><strong>${escapeHtml(money(paymentAmounts.paidAmount, workspace?.currency))}</strong></div>
  <div><span>Balance due</span><strong>${escapeHtml(money(paymentAmounts.balance, workspace?.currency))}</strong></div>
  <div class="grand"><span>Total</span><strong>${escapeHtml(money(sale.total, workspace?.currency))}</strong></div>
</div>
<footer><p>Thank you for your business.</p><p>This is a sales receipt generated from the records in this workspace. It does not calculate GST or replace a compliant tax invoice.</p></footer>
</div>
</body>
</html>`;
  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  window.setTimeout(() => printWindow.print(), 250);
  return true;
}
const newLine = (): CartLine => ({ productId: '', quantity: 1 });

export default function Sales() {
  const { state, workspace, createSale, recordSalePayment, deleteSale } = useBusiness();
  const [customerId, setCustomerId] = useState('');
  const [lines, setLines] = useState<CartLine[]>([newLine()]);
  const [discount, setDiscount] = useState(0);
  const [paymentMode, setPaymentMode] = useState<'paid' | 'partial' | 'pending'>('paid');
  const [amountReceived, setAmountReceived] = useState(0);
  const [collectionSaleId, setCollectionSaleId] = useState('');
  const [collectionAmount, setCollectionAmount] = useState(0);
  const [error, setError] = useState('');

  const preview = useMemo(() => lines.reduce((sum, line) => {
    const product = state.products.find((item) => item.id === line.productId);
    return sum + (product ? product.sellingPrice * Math.max(0, line.quantity) : 0);
  }, 0), [lines, state.products]);
  const totalPreview = Math.max(0, preview - Math.max(0, Number(discount) || 0));

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
    const paidAmount = paymentMode === 'paid' ? totalPreview : paymentMode === 'pending' ? 0 : Number(amountReceived);
    if (paymentMode === 'partial' && (!Number.isFinite(paidAmount) || paidAmount <= 0 || paidAmount >= totalPreview)) {
      setError('For a partial payment, enter an amount greater than zero and less than the sale total.');
      return;
    }
    try {
      createSale({ customerId, items: validLines, discount: Number(discount), paidAmount });
      setLines([newLine()]);
      setCustomerId('');
      setDiscount(0);
      setPaymentMode('paid');
      setAmountReceived(0);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not create sale.');
    }
  };

  return <PageFrame>
    {error && <p role="alert" className="mb-3 text-xs font-semibold text-[hsl(var(--destructive))]">{error}</p>}
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
            <label className="grid gap-2 text-xs font-semibold">Payment collection<select value={paymentMode} onChange={(event) => setPaymentMode(event.target.value as 'paid' | 'partial' | 'pending')} className={inputClass}><option value="paid">Paid in full</option><option value="partial">Partial payment</option><option value="pending">Payment pending</option></select></label>
            {paymentMode === 'partial' && <label className="grid gap-2 text-xs font-semibold">Amount received<input type="number" min="0.01" max={Math.max(0,totalPreview - 0.01)} step="0.01" value={amountReceived} onChange={event => setAmountReceived(Number(event.target.value))} className={inputClass}/></label>}
          </div>
          <div className="rounded-xl bg-[hsl(var(--muted)/0.55)] p-3"><div className="flex items-center justify-between"><span className="text-xs font-semibold">Estimated total</span><strong className="text-lg">{money(totalPreview, workspace?.currency)}</strong></div><div className="mt-2 flex items-center justify-between text-xs text-[hsl(var(--muted-foreground))]"><span>Amount received</span><span>{money(paymentMode === 'paid' ? totalPreview : paymentMode === 'partial' ? Math.max(0,amountReceived) : 0, workspace?.currency)}</span></div><div className="mt-1 flex items-center justify-between text-xs text-[hsl(var(--muted-foreground))]"><span>Balance due</span><span>{money(Math.max(0,totalPreview - (paymentMode === 'paid' ? totalPreview : paymentMode === 'partial' ? Math.max(0,amountReceived) : 0)), workspace?.currency)}</span></div></div>
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
            {(() => { const amounts = salePaymentAmounts(sale); return <><div className="mt-3 flex flex-wrap items-center justify-between gap-2"><span className="rounded-full bg-[hsl(var(--muted))] px-2.5 py-1 text-[10px] font-bold capitalize">{sale.paymentStatus}</span><span className="text-[11px] text-[hsl(var(--muted-foreground))]">Received {money(amounts.paidAmount, workspace?.currency)} · Balance {money(amounts.balance, workspace?.currency)}</span><div className="flex flex-wrap gap-2"><button type="button" onClick={() => { if (!openSaleReceipt(sale, customer, workspace)) setError('Allow pop-ups to print the sales receipt.'); }} className="min-h-9 rounded-lg border border-[hsl(var(--border))] px-3 text-xs font-semibold">Print receipt</button>{amounts.balance > 0 && sale.paymentStatus !== 'refunded' && <button type="button" onClick={() => { setCollectionSaleId(sale.id); setCollectionAmount(0); setError(''); }} className="min-h-9 rounded-lg border border-[hsl(var(--border))] px-3 text-xs font-semibold">Record payment</button>}<button type="button" onClick={() => { if (window.confirm('Delete this sale and restore its stock quantities?')) deleteSale(sale.id); }} className="min-h-9 rounded-lg border border-[hsl(var(--destructive)/0.3)] px-3 text-xs font-semibold text-[hsl(var(--destructive))]">Delete & restore stock</button></div></div>{collectionSaleId === sale.id && <form onSubmit={event => { event.preventDefault(); setError(''); try { recordSalePayment(sale.id, collectionAmount); setCollectionSaleId(''); setCollectionAmount(0); } catch (caught) { setError(caught instanceof Error ? caught.message : 'Could not record payment.'); } }} className="mt-3 flex flex-wrap items-end gap-2 rounded-lg bg-[hsl(var(--muted)/0.5)] p-3"><label className="grid min-w-[180px] flex-1 gap-1 text-[11px] font-semibold">Payment received now<input type="number" min="0.01" max={amounts.balance} step="0.01" value={collectionAmount} onChange={event => setCollectionAmount(Number(event.target.value))} className={inputClass}/></label><button type="submit" className="min-h-10 rounded-lg bg-[hsl(var(--primary))] px-3 text-xs font-semibold text-[hsl(var(--primary-foreground))]">Save payment</button><button type="button" onClick={() => setCollectionSaleId('')} className="min-h-10 rounded-lg border border-[hsl(var(--border))] px-3 text-xs font-semibold">Cancel</button></form>}</>; })()}
          </div>;
        })}</div>}
      </SectionCard>
    </div>
  </PageFrame>;
}
