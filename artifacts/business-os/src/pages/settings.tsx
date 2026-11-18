import { useState } from 'react';
import { ArrowRight, Check, Download, FileUp, Settings2, ShieldCheck } from 'lucide-react';
import { Link } from 'wouter';
import { useWorkspace } from '@/hooks/use-workspace';
import type { BusinessState } from '@/domain/types';

type BackupDocument = { app?: string; schemaVersion?: number; data?: Partial<BusinessState> };

export default function Settings() {
  const { workspace, state, restoreBackup } = useWorkspace();
  const [preview, setPreview] = useState<BusinessState | null>(null);
  const [replaceConfirmed, setReplaceConfirmed] = useState(false);
  const [importError, setImportError] = useState('');
  const [notice, setNotice] = useState('');

  function exportBackup() {
    const backup = { app: 'Business Sutra', schemaVersion: 1, exportedAt: new Date().toISOString(), data: state };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    const date = new Date().toISOString().slice(0, 10);
    anchor.href = url;
    anchor.download = 'business-sutra-backup-' + date + '.json';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function inspectBackup(file?: File) {
    setImportError('');
    setNotice('');
    setPreview(null);
    setReplaceConfirmed(false);
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      setImportError('Backup file is larger than 10 MB. Choose a smaller JSON backup.');
      return;
    }
    try {
      const parsed: unknown = JSON.parse(await file.text());
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('This is not a valid Business Sutra backup file.');
      const document = parsed as BackupDocument;
      if (document.app !== 'Business Sutra' || document.schemaVersion !== 1 || !document.data) throw new Error('The app name or backup version does not match.');
      const data = document.data;
      const required = ['products','inventoryMovements','customers','sales','expenses','revenueTargets','tasks'] as const;
      if (required.some(key => !Array.isArray(data[key]))) throw new Error('Backup is incomplete. Required workspace records are missing.');
      const safeData: BusinessState = {
        workspace: data.workspace && typeof data.workspace === 'object' ? data.workspace : null,
        products: data.products as BusinessState['products'],
        inventoryMovements: data.inventoryMovements as BusinessState['inventoryMovements'],
        customers: data.customers as BusinessState['customers'],
        sales: data.sales as BusinessState['sales'],
        expenses: data.expenses as BusinessState['expenses'],
        revenueTargets: data.revenueTargets as BusinessState['revenueTargets'],
        tasks: data.tasks as BusinessState['tasks'],
        teamMembers: Array.isArray(data.teamMembers) ? data.teamMembers : [],
        campaigns: Array.isArray(data.campaigns) ? data.campaigns : [],
        suppliers: Array.isArray(data.suppliers) ? data.suppliers : [],
        purchases: Array.isArray(data.purchases) ? data.purchases : [],
      };
      setPreview(safeData);
    } catch (caught) {
      setImportError(caught instanceof Error ? caught.message : 'Could not read this backup file.');
    }
  }

  function confirmRestore() {
    if (!preview || !replaceConfirmed) return;
    try {
      exportBackup();
      restoreBackup(preview);
      setPreview(null);
      setReplaceConfirmed(false);
      setNotice('Backup restored. A copy of the previous workspace was downloaded before replacement.');
    } catch (caught) {
      setImportError(caught instanceof Error ? caught.message : 'Could not restore this backup.');
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-5 pb-28 sm:px-6 sm:py-8 lg:px-9 lg:pb-10">
      <div className="animate-enter mb-6">
        <div className="mb-3 flex size-10 items-center justify-center rounded-xl bg-[hsl(var(--accent)/0.17)] text-[hsl(var(--accent-foreground))]"><Settings2 className="size-5" /></div>
        <p className="text-[10px] font-bold uppercase tracking-[0.17em] text-[hsl(var(--muted-foreground))]">Workspace preferences</p>
        <h2 data-testid="text-settings-title" className="mt-1 text-2xl font-semibold tracking-[-0.045em]">Settings</h2>
        <p className="mt-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">Manage your business profile and protect your workspace data.</p>
      </div>

      <section className="animate-enter animate-enter-delay-1 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 sm:p-6">
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[hsl(var(--chart-2)/0.13)] text-[hsl(var(--chart-2))]"><Check className="size-5" /></span>
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-[hsl(var(--muted-foreground))]">Workspace</p>
            <h3 data-testid="text-settings-workspace-name" className="mt-1 truncate text-lg font-semibold">{workspace?.businessName ?? 'Not set'}</h3>
            <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">{workspace ? workspace.industry + ' · ' + workspace.country + ' · ' + workspace.currency : 'Create a workspace to set your operating context.'}</p>
          </div>
        </div>
        <Link href="/setup" data-testid="link-settings-setup" className="mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-4 text-sm font-semibold text-[hsl(var(--primary-foreground))]">
          {workspace ? 'Edit workspace details' : 'Set up your workspace'} <ArrowRight className="size-4" />
        </Link>
      </section>

      <section className="mt-4 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 sm:p-6">
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[hsl(var(--muted))] text-[hsl(var(--foreground))]"><Download className="size-5" /></span>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold">Data backup</h3>
            <p className="mt-1 text-xs leading-5 text-[hsl(var(--muted-foreground))]">Download a JSON backup containing your workspace profile, products, inventory, customers, sales, expenses, targets, tasks, team directory, marketing campaigns, suppliers and purchases.</p>
            <button type="button" onClick={exportBackup} className="mt-4 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-4 text-sm font-semibold transition-colors hover:bg-[hsl(var(--muted))]"><Download className="size-4" /> Download backup</button>
          </div>
        </div>
      </section>

      <section className="mt-4 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 sm:p-6">
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[hsl(var(--muted))] text-[hsl(var(--foreground))]"><FileUp className="size-5" /></span>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold">Restore a backup</h3>
            <p className="mt-1 text-xs leading-5 text-[hsl(var(--muted-foreground))]">Select a Business Sutra JSON backup. The file is checked first so you can review its contents before replacing the current browser workspace.</p>
            <label className="mt-4 flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-4 text-sm font-semibold hover:bg-[hsl(var(--muted))]"><FileUp className="size-4"/> Choose backup file<input type="file" accept="application/json,.json" className="sr-only" onChange={event=>{const file=event.currentTarget.files?.[0];event.currentTarget.value='';void inspectBackup(file);}}/></label>
            {importError&&<p role="alert" className="mt-3 text-xs font-semibold text-[hsl(var(--destructive))]">{importError}</p>}
            {notice&&<p role="status" className="mt-3 text-xs font-semibold text-emerald-700">{notice}</p>}
            {preview&&<div className="mt-4 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.3)] p-4">
              <div className="flex items-center gap-2"><ShieldCheck className="size-4 text-emerald-700"/><p className="text-xs font-semibold">Backup validated · Preview</p></div>
              <p className="mt-2 text-sm font-semibold">{preview.workspace?.businessName??'Workspace without a name'}</p>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">{[{label:'Products',count:preview.products.length},{label:'Customers',count:preview.customers.length},{label:'Sales',count:preview.sales.length},{label:'Expenses',count:preview.expenses.length},{label:'Tasks',count:preview.tasks.length},{label:'Team',count:preview.teamMembers.length},{label:'Campaigns',count:preview.campaigns.length},{label:'Suppliers',count:preview.suppliers.length},{label:'Purchases',count:preview.purchases.length},{label:'Stock movements',count:preview.inventoryMovements.length}].map(item=><div key={item.label} className="rounded-lg bg-[hsl(var(--card))] p-2"><p className="text-[hsl(var(--muted-foreground))]">{item.label}</p><p className="mt-1 font-semibold">{item.count}</p></div>)}</div>
              <p className="mt-3 text-[11px] leading-5 text-[hsl(var(--muted-foreground))]">Restoring replaces the current browser workspace with the selected backup. A backup of the current data will be downloaded first.</p>
              <label className="mt-3 flex items-start gap-2 text-xs leading-5"><input type="checkbox" checked={replaceConfirmed} onChange={e=>setReplaceConfirmed(e.target.checked)} className="mt-0.5"/><span>I understand the current workspace will be replaced by this backup.</span></label>
              <div className="mt-3 flex flex-wrap gap-2"><button type="button" disabled={!replaceConfirmed} onClick={confirmRestore} className="min-h-10 rounded-xl bg-[hsl(var(--primary))] px-4 text-xs font-semibold text-[hsl(var(--primary-foreground))] disabled:opacity-40">Download current backup & restore</button><button type="button" onClick={()=>{setPreview(null);setReplaceConfirmed(false);}} className="min-h-10 rounded-xl border border-[hsl(var(--border))] px-4 text-xs font-semibold">Cancel</button></div>
            </div>}
          </div>
        </div>
        <p className="mt-4 border-t border-[hsl(var(--border))] pt-3 text-[11px] leading-5 text-[hsl(var(--muted-foreground))]">This app currently stores data in this browser only. Backup and restore do not create cloud sync or a shared team workspace.</p>
      </section>
    </div>
  );
}
