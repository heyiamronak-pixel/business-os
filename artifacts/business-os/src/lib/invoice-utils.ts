import type { InvoiceLineItem, InvoiceRecord, InvoiceSupplyType } from "@/lib/domain";
export interface InvoiceLineDraft { id:string; productId?:string; description:string; hsnSac:string; quantity:string; unit:string; rate:string; discount:string; taxRate:string; }
export function isValidGstin(value:string):boolean { return /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(value.trim().toUpperCase()); }
export function financialYearFor(value:string):string { const d=new Date(value+"T00:00:00"); const y=d.getFullYear(); const start=d.getMonth()>=3?y:y-1; return `${String(start).slice(-2)}-${String(start+1).slice(-2)}`; }
export function nextInvoiceNumber(invoices:InvoiceRecord[],businessId:string,prefixValue:string,issueDate:string):string {
 const prefix=prefixValue.trim().toUpperCase().replace(/[^A-Z0-9-]/g,"").slice(0,4)||"INV";
 const stem=`${prefix}/${financialYearFor(issueDate)}/`;
 const nums=invoices.filter(x=>x.businessId===businessId&&x.invoiceNumber.startsWith(stem)).map(x=>Number(x.invoiceNumber.slice(stem.length))).filter(x=>Number.isInteger(x)&&x>0);
 const result=stem+String(Math.max(0,...nums)+1).padStart(3,"0");
 if(result.length>16) throw new Error("Invoice number has reached the 16-character limit.");
 return result;
}
const round2=(n:number)=>Math.round((n+Number.EPSILON)*100)/100;
const n=(s:string)=>Number.isFinite(Number(s))?Number(s):0;
export function calculateInvoiceTotals(drafts:InvoiceLineDraft[],gstRegistered:boolean,supplyType:InvoiceSupplyType):{
 items:InvoiceLineItem[];subtotal:number;discountTotal:number;taxableValue:number;cgst:number;sgst:number;igst:number;taxTotal:number;total:number;
}{
 const items=drafts.map((d):InvoiceLineItem=>{
  const quantity=Math.max(0,n(d.quantity)),rate=Math.max(0,n(d.rate)),gross=round2(quantity*rate);
  const discount=Math.min(gross,Math.max(0,n(d.discount))),taxableValue=round2(gross-discount);
  const taxRate=gstRegistered?Math.max(0,n(d.taxRate)):0,taxAmount=round2(taxableValue*taxRate/100);
  return {id:d.id,...(d.productId?{productId:d.productId}:{}),description:d.description.trim(),hsnSac:d.hsnSac.trim()||undefined,quantity,unit:d.unit.trim()||"unit",rate,discount,taxRate,taxableValue,taxAmount,total:round2(taxableValue+taxAmount)};
 }).filter(x=>x.description.length>0&&x.quantity>0);
 const subtotal=round2(items.reduce((s,x)=>s+x.quantity*x.rate,0)),discountTotal=round2(items.reduce((s,x)=>s+x.discount,0)),taxableValue=round2(items.reduce((s,x)=>s+x.taxableValue,0)),taxTotal=round2(items.reduce((s,x)=>s+x.taxAmount,0));
 const cgst=gstRegistered&&supplyType==="intra"?round2(taxTotal/2):0,sgst=gstRegistered&&supplyType==="intra"?round2(taxTotal-cgst):0,igst=gstRegistered&&supplyType==="inter"?taxTotal:0;
 return {items,subtotal,discountTotal,taxableValue,cgst,sgst,igst,taxTotal:round2(cgst+sgst+igst),total:round2(taxableValue+cgst+sgst+igst)};
}


export interface InvoicePaymentSummary {
 paidAmount: number;
 balance: number;
 status: "paid" | "partial" | "unpaid";
}
export function getInvoicePaymentSummary(total: number, payments: Array<{ amount: number }> = []): InvoicePaymentSummary {
 const safeTotal = round2(Math.max(0, Number.isFinite(total) ? total : 0));
 const paidAmount = round2(Math.min(safeTotal, payments.reduce((sum, payment) => {
  const amount = Number(payment.amount);
  return sum + (Number.isFinite(amount) && amount > 0 ? amount : 0);
 }, 0)));
 const balance = round2(Math.max(0, safeTotal - paidAmount));
 return { paidAmount, balance, status: balance === 0 ? "paid" : paidAmount > 0 ? "partial" : "unpaid" };
}
export function addInvoicePayment(invoice: InvoiceRecord, payment: import("@/lib/domain").InvoicePayment): InvoiceRecord {
 if (invoice.status !== "issued") throw new Error("Payments can only be recorded for issued invoices.");
 if (!Number.isFinite(payment.amount) || payment.amount <= 0) throw new Error("Enter a payment amount greater than zero.");
 const summary = getInvoicePaymentSummary(invoice.total, invoice.payments);
 if (payment.amount > summary.balance + 0.009) throw new Error("Payment cannot exceed the outstanding invoice balance.");
 if (!payment.id.trim()) throw new Error("Payment reference is missing.");
 if (!payment.receivedAt.trim()) throw new Error("Payment date is missing.");
 return { ...invoice, payments: [...(invoice.payments ?? []), { ...payment, amount: round2(payment.amount) }], updatedAt: payment.receivedAt };
}
