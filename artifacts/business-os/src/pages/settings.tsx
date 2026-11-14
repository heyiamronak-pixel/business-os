import { ArrowRight, Check, Download, Settings2 } from 'lucide-react';
import { Link } from 'wouter';
import { useWorkspace } from '@/hooks/use-workspace';

export default function Settings() {
  const { workspace, state } = useWorkspace();

  function exportBackup() {
    const backup = {
      app: 'Business Sutra',
      schemaVersion: 1,
      exportedAt: new Date().toISOString(),
      data: state,
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    const date = new Date().toISOString().slice(0, 10);
    anchor.href = url;
    anchor.download = `business-sutra-backup-${date}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
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
            <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">{workspace ? `${workspace.industry} · ${workspace.country} · ${workspace.currency}` : 'Create a workspace to set your operating context.'}</p>
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
            <p className="mt-1 text-xs leading-5 text-[hsl(var(--muted-foreground))]">Download a JSON copy of this browser's workspace, including products, customers, sales, expenses, targets and tasks. Keep it somewhere safe.</p>
            <button type="button" onClick={exportBackup} className="mt-4 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-4 text-sm font-semibold transition-colors hover:bg-[hsl(var(--muted))]">
              <Download className="size-4" /> Download backup
            </button>
          </div>
        </div>
        <p className="mt-4 border-t border-[hsl(var(--border))] pt-3 text-[11px] leading-5 text-[hsl(var(--muted-foreground))]">This app currently stores data in this browser only. A backup is not cloud sync and does not create a shared team workspace.</p>
      </section>
    </div>
  );
}