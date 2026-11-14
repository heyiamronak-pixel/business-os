import { type ReactNode, useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'wouter';
import { ArrowUpRight, ChevronDown, ChevronRight, Home, Menu, MoreHorizontal, Sparkles, X } from 'lucide-react';
import { modules, settingsModule } from '@/data/modules';
import { useWorkspace } from '@/hooks/use-workspace';

type AppShellProps = { children: ReactNode };

const groupedNavigation = [
  { label: 'Workspace', items: modules.filter((module) => module.group === 'workspace') },
  { label: 'Operations', items: modules.filter((module) => module.group === 'operations') },
  { label: 'Insight', items: modules.filter((module) => module.group === 'insight') },
];

const pageTitles: Record<string, string> = {
  '/': 'Home',
  '/dashboard': 'Home',
  '/sales': 'Sales',
  '/products': 'Products',
  '/inventory': 'Inventory',
  '/customers': 'Customers',
  '/expenses': 'Expenses',
  '/revenue-targets': 'Revenue targets',
  '/marketing': 'Marketing',
  '/tasks': 'Tasks',
  '/team': 'Team',
  '/attendance': 'Attendance',
  '/reports': 'Reports',
  '/ai-advisor': 'AI advisor',
  '/settings': 'Settings',
  '/setup': 'Create workspace',
  '/modules': 'Modules',
};

function BrandMark() {
  return (
    <span className="relative grid size-9 shrink-0 place-items-center rounded-xl bg-[hsl(var(--sidebar-primary))] text-[hsl(var(--sidebar-primary-foreground))]">
      <span className="absolute h-4 w-1.5 -translate-x-1.5 rounded-full bg-current" />
      <span className="absolute h-4 w-1.5 translate-x-1.5 rounded-full bg-current opacity-55" />
    </span>
  );
}

function NavItem({ href, label, icon: Icon, active, onNavigate }: { href: string; label: string; icon: typeof modules[number]['icon']; active: boolean; onNavigate: () => void }) {
  return (
    <Link href={href} onClick={onNavigate} data-testid={`link-nav-${label.toLowerCase().replace(/\s+/g, '-')}`} className={[
      'group flex min-h-10 items-center gap-3 rounded-xl px-3 text-[13px] font-medium transition-colors',
      active ? 'bg-[hsl(var(--sidebar-accent))] text-[hsl(var(--sidebar-accent-foreground))] shadow-[inset_3px_0_0_hsl(var(--sidebar-primary))]' : 'text-[hsl(var(--sidebar-foreground))] hover:bg-[hsl(var(--sidebar-accent)/0.72)] hover:text-[hsl(var(--sidebar-accent-foreground))]',
    ].join(' ')}>
      <Icon className={active ? 'size-[17px] text-[hsl(var(--sidebar-primary))]' : 'size-[17px] opacity-75'} strokeWidth={active ? 2.2 : 1.8} />
      <span className="truncate">{label}</span>
      {active && <span className="ml-auto size-1.5 rounded-full bg-[hsl(var(--sidebar-primary))]" />}
    </Link>
  );
}

function Sidebar({ open, onClose, pathname }: { open: boolean; onClose: () => void; pathname: string }) {
  const { workspace } = useWorkspace();
  return (
    <>
      {open && <button type="button" aria-label="Close navigation" onClick={onClose} data-testid="button-close-navigation-backdrop" className="fixed inset-0 z-40 bg-[hsl(var(--foreground)/0.28)] backdrop-blur-[2px] md:hidden" />}
      <aside data-testid="navigation-sidebar" className={['fixed inset-y-0 left-0 z-50 flex w-[276px] flex-col border-r border-[hsl(var(--sidebar-border))] bg-[hsl(var(--sidebar))] px-4 py-5 text-[hsl(var(--sidebar-foreground))] transition-transform duration-300 md:static md:z-auto md:translate-x-0', open ? 'translate-x-0' : '-translate-x-full'].join(' ')}>
        <div className="flex items-center justify-between px-2">
          <Link href="/dashboard" onClick={onClose} className="flex items-center gap-3" data-testid="link-brand-dashboard"><BrandMark /><span className="flex flex-col leading-tight"><span className="font-semibold tracking-[-0.04em] text-[hsl(var(--sidebar-accent-foreground))]">Business Sutra</span><span className="mt-0.5 text-[9px] font-medium tracking-[0.08em] text-[hsl(var(--sidebar-foreground)/0.62)]">EVERYTHING CONNECTED</span></span></Link>
          <button type="button" onClick={onClose} aria-label="Close navigation" data-testid="button-close-navigation" className="rounded-lg p-2 text-[hsl(var(--sidebar-foreground))] hover:bg-[hsl(var(--sidebar-accent))] md:hidden"><X className="size-4" /></button>
        </div>

        <div className="relative mt-7">
          <div className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-[hsl(var(--sidebar-foreground)/0.55)]">Workspace</div>
          <div className="rounded-2xl border border-[hsl(var(--sidebar-border))] bg-[hsl(var(--sidebar-accent)/0.46)] p-3">
            <div className="flex items-center gap-3">
              <span className="grid size-8 place-items-center rounded-lg border border-dashed border-[hsl(var(--sidebar-primary)/0.72)] text-[hsl(var(--sidebar-primary))]"><Sparkles className="size-4" /></span>
              <div className="min-w-0"><div data-testid="text-sidebar-workspace" className="truncate text-[12px] font-semibold text-[hsl(var(--sidebar-accent-foreground))]">{workspace?.businessName ?? 'No workspace yet'}</div><div className="mt-0.5 text-[11px] text-[hsl(var(--sidebar-foreground)/0.72)]">{workspace ? workspace.industry : 'Set up your business context'}</div></div>
              <ChevronDown className="ml-auto size-4 shrink-0 text-[hsl(var(--sidebar-foreground)/0.65)]" />
            </div>
            <Link href="/setup" onClick={onClose} data-testid="link-workspace-setup" className="mt-3 flex items-center justify-between border-t border-[hsl(var(--sidebar-border)/0.8)] pt-3 text-[11px] font-semibold text-[hsl(var(--sidebar-primary))] hover:text-[hsl(var(--sidebar-accent-foreground))]">{workspace ? 'Edit workspace' : 'Set up workspace'} <ArrowUpRight className="size-3.5" /></Link>
          </div>
        </div>

        <nav className="mt-7 flex-1 space-y-6 overflow-y-auto pr-1" aria-label="Primary navigation">
          {groupedNavigation.map((group) => <div key={group.label}><div className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-[hsl(var(--sidebar-foreground)/0.5)]">{group.label}</div><div className="space-y-1">{group.items.map((item) => <NavItem key={item.slug} href={`/${item.slug}`} label={item.label} icon={item.icon} active={pathname === `/${item.slug}` || (item.slug === 'dashboard' && pathname === '/')} onNavigate={onClose} />)}</div></div>)}
        </nav>

        <div className="mt-5 border-t border-[hsl(var(--sidebar-border))] pt-4">
          <NavItem href="/settings" label={settingsModule.label} icon={settingsModule.icon} active={pathname === '/settings'} onNavigate={onClose} />
          <div className="mt-4 flex items-center gap-2 px-3 text-[10px] text-[hsl(var(--sidebar-foreground)/0.46)]"><span className="size-1.5 rounded-full bg-[hsl(var(--sidebar-primary))]" /> Local workspace mode</div>
        </div>
      </aside>
    </>
  );
}

const moreItems = modules.filter((module) => ['products', 'inventory', 'customers', 'expenses', 'revenue-targets', 'marketing', 'team', 'attendance', 'ai-advisor'].includes(module.slug));

function MobileMore({ onClose }: { onClose: () => void }) {
  const SettingsIcon = settingsModule.icon;
  return (
    <div className="fixed inset-0 z-40 bg-[hsl(var(--foreground)/0.3)] md:hidden" onClick={onClose}>
      <div role="dialog" aria-label="More modules" onClick={(event) => event.stopPropagation()} className="absolute inset-x-0 bottom-0 max-h-[82dvh] overflow-y-auto rounded-t-[24px] border-t border-[hsl(var(--border))] bg-[hsl(var(--card))] px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-4 shadow-[0_-18px_50px_hsl(var(--foreground)/0.15)]">
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-[hsl(var(--border))]" />
        <div className="mb-4 flex items-center justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[hsl(var(--muted-foreground))]">Business Sutra</p><h2 className="mt-1 text-lg font-semibold">More modules</h2></div><button type="button" onClick={onClose} aria-label="Close more modules" data-testid="button-close-more" className="grid size-10 place-items-center rounded-xl border border-[hsl(var(--border))]"><X className="size-4" /></button></div>
        <div className="grid grid-cols-2 gap-2">
          {moreItems.map((module) => { const Icon = module.icon; return <Link href={`/${module.slug}`} onClick={onClose} key={module.slug} data-testid={`link-more-${module.slug}`} className="flex min-h-14 items-center gap-2 rounded-xl border border-[hsl(var(--border))] px-3 text-xs font-semibold"><Icon className="size-4 text-[hsl(var(--accent-foreground))]" />{module.label}</Link>; })}
          <Link href="/settings" onClick={onClose} data-testid="link-more-settings" className="flex min-h-14 items-center gap-2 rounded-xl border border-[hsl(var(--border))] px-3 text-xs font-semibold"><SettingsIcon className="size-4 text-[hsl(var(--accent-foreground))]" />Settings</Link>
        </div>
      </div>
    </div>
  );
}

function MobileBottomNav({ pathname, onMore }: { pathname: string; onMore: () => void }) {
  const items = [
    { href: '/dashboard', label: 'Home', icon: Home, active: pathname === '/' || pathname === '/dashboard' },
    { href: '/sales', label: 'Sales', icon: modules.find((module) => module.slug === 'sales')!.icon, active: pathname === '/sales' },
    { href: '/tasks', label: 'Tasks', icon: modules.find((module) => module.slug === 'tasks')!.icon, active: pathname === '/tasks' },
    { href: '/reports', label: 'Reports', icon: modules.find((module) => module.slug === 'reports')!.icon, active: pathname === '/reports' },
  ];
  return <nav aria-label="Mobile navigation" className="fixed inset-x-0 bottom-0 z-30 border-t border-[hsl(var(--border))] bg-[hsl(var(--card)/0.96)] pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden"><div className="grid h-16 grid-cols-5">{items.map(({ href, label, icon: Icon, active }) => <Link href={href} key={label} data-testid={`link-bottom-${label.toLowerCase()}`} className={['flex min-w-0 flex-col items-center justify-center gap-1 text-[10px] font-semibold', active ? 'text-[hsl(var(--accent-foreground))]' : 'text-[hsl(var(--muted-foreground))]'].join(' ')}><Icon className="size-[18px]" strokeWidth={active ? 2.3 : 1.8} />{label}</Link>)}<button type="button" onClick={onMore} data-testid="button-bottom-more" className="flex min-w-0 flex-col items-center justify-center gap-1 text-[10px] font-semibold text-[hsl(var(--muted-foreground))]"><MoreHorizontal className="size-[18px]" />More</button></div></nav>;
}

export function AppShell({ children }: AppShellProps) {
  const [pathname] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [workspaceMenuOpen, setWorkspaceMenuOpen] = useState(false);
  const { workspace } = useWorkspace();
  const title = useMemo(() => pageTitles[pathname] ?? 'Business Sutra', [pathname]);

  useEffect(() => {
    setMobileOpen(false);
    setMoreOpen(false);
    setWorkspaceMenuOpen(false);
  }, [pathname]);

  return (
    <div className="min-h-[100dvh] bg-[hsl(var(--background))] text-[hsl(var(--foreground))] md:flex">
      <Sidebar open={mobileOpen} onClose={() => setMobileOpen(false)} pathname={pathname} />
      <div className="flex min-h-[100dvh] min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-[62px] items-center justify-between border-b border-[hsl(var(--border)/0.8)] bg-[hsl(var(--background)/0.94)] px-4 backdrop-blur-xl sm:px-6 lg:px-9">
          <div className="flex min-w-0 items-center gap-3">
            <button type="button" onClick={() => setMobileOpen(true)} aria-label="Open navigation" data-testid="button-open-navigation" className="grid size-10 place-items-center rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] text-[hsl(var(--muted-foreground))] md:hidden"><Menu className="size-4" /></button>
            <div className="min-w-0"><div className="hidden text-[10px] font-semibold uppercase tracking-[0.15em] text-[hsl(var(--muted-foreground))] sm:block">Business Sutra</div><h1 data-testid="text-page-title" className="truncate text-base font-semibold tracking-[-0.035em] sm:text-lg">{title}</h1></div>
          </div>
          <div className="relative">
            <button type="button" onClick={() => setWorkspaceMenuOpen((open) => !open)} aria-expanded={workspaceMenuOpen} data-testid="button-workspace-switcher" className="flex max-w-[180px] items-center gap-2 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-3 py-2 text-left text-xs font-semibold shadow-[0_2px_8px_hsl(var(--foreground)/0.03)]">
              <span className="size-2 shrink-0 rounded-full bg-[hsl(var(--accent))]" /><span className="truncate">{workspace?.businessName ?? 'Not set'}</span><ChevronDown className="size-3.5 shrink-0 text-[hsl(var(--muted-foreground))]" />
            </button>
            {workspaceMenuOpen && <div data-testid="popover-workspace-switcher" className="absolute right-0 top-12 z-50 w-[min(280px,calc(100vw-2rem))] rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--popover))] p-3 shadow-[0_18px_50px_hsl(var(--foreground)/0.14)]"><div className="flex gap-3 rounded-xl bg-[hsl(var(--muted)/0.65)] p-3"><span className="grid size-8 shrink-0 place-items-center rounded-lg bg-[hsl(var(--accent)/0.2)] text-[hsl(var(--accent-foreground))]"><Sparkles className="size-4" /></span><div><p className="text-xs font-semibold">{workspace?.businessName ?? 'No workspace selected'}</p><p className="mt-1 text-[11px] leading-4 text-[hsl(var(--muted-foreground))]">{workspace ? `${workspace.industry} · ${workspace.country}` : 'Create a workspace to begin.'}</p></div></div><Link href="/setup" data-testid="link-switcher-settings" className="mt-3 flex items-center justify-between rounded-xl px-3 py-3 text-xs font-semibold hover:bg-[hsl(var(--muted))]">{workspace ? 'Edit workspace' : 'Open setup'} <ChevronRight className="size-3.5" /></Link></div>}
          </div>
        </header>
        <main className="flex-1 pb-20 md:pb-0">{children}</main>
      </div>
      <MobileBottomNav pathname={pathname} onMore={() => setMoreOpen(true)} />
      {moreOpen && <MobileMore onClose={() => setMoreOpen(false)} />}
    </div>
  );
}