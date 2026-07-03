'use client';
// src/components/layout/DashboardLayout.tsx

import { useState, useEffect, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth.store';
import { useMerchantLabels } from '@/lib/merchant-labels';
import { needsOnboarding } from '@/lib/onboarding';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

type NavItem = {
  href: string;
  label: string;
  icon: string;
  badge?: string;
  highlight?: boolean;
};

const navItems: { label: string; items: NavItem[] }[] = [
  {
    label: 'Overview',
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: 'grid' },
    ],
  },
  {
    label: 'Payments',
    items: [
      { href: '/treasury', label: 'Treasury', icon: 'wallet' },
      { href: '/customers', label: 'Customers', icon: 'users' },
      { href: '/invoices', label: 'Invoices', icon: 'file-text', badge: 'invoices' },
      { href: '/transactions', label: 'Transactions', icon: 'dollar-sign' },
    ],
  },
  {
    label: 'Operations',
    items: [
      { href: '/reconciliation', label: 'Reconciliation', icon: 'activity', badge: 'review' },
      { href: '/exceptions', label: 'Payment Exceptions', icon: 'alert', badge: 'exceptions' },
      { href: '/activity', label: 'Activity', icon: 'list' },
      { href: '/timeline', label: 'Operations Timeline', icon: 'clock' },
      { href: '/insights', label: 'AI Insights', icon: 'box' },
    ],
  },
  {
    label: 'System',
    items: [
      { href: '/integrations', label: 'Integrations', icon: 'plug' },
      { href: '/demo', label: 'Event Simulator', icon: 'play' },
    ],
  },
];

const icons: Record<string, React.ReactNode> = {
  grid: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>,
  users: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  'file-text': <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
  'dollar-sign': <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>,
  activity: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
  clock: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  box: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>,
  alert: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
  play: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><polygon points="5 3 19 12 5 21 5 3"/></svg>,
  wallet: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/></svg>,
  shield: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
  list: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>,
  plug: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path d="M12 22v-5"/><path d="M9 8V2"/><path d="M15 8V2"/><path d="M18 8v5a6 6 0 0 1-12 0V8z"/></svg>,
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, org, token, logout, hydrateFromStorage } = useAuthStore();
  const labels = useMerchantLabels();
  const [authChecked, setAuthChecked] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navigation = useMemo(() => {
    const opsEnabled = process.env.NEXT_PUBLIC_ENABLE_OPS_AUDIT === 'true';
    return navItems.map((section) => ({
      ...section,
      items: section.items
        .filter((item) => item.href !== '/ops/audit' || opsEnabled)
        .map((item) => {
          if (item.href === '/customers') return { ...item, label: labels.customers };
          if (item.href === '/invoices') return { ...item, label: labels.invoices };
          return item;
        }),
    })).map((section) =>
      opsEnabled && section.label === 'System'
        ? {
            ...section,
            items: [
              ...section.items,
              { href: '/ops/audit', label: 'System Audit', icon: 'shield' },
            ],
          }
        : section,
    );
  }, [labels.customers, labels.invoices]);

  const { data: insights } = useQuery({
    queryKey: ['insights'],
    queryFn: () => api.get('/insights').then(r => r.data),
    enabled: !!token,
    refetchInterval: 30000,
  });

  useEffect(() => {
    if (!useAuthStore.getState().token) {
      hydrateFromStorage();
    }
    setAuthChecked(true);
  }, [hydrateFromStorage]);

  useEffect(() => {
    if (!authChecked) return;
    if (!useAuthStore.getState().token) router.push('/auth');
    else if (needsOnboarding(org)) router.push('/onboarding');
  }, [authChecked, router, org]);

  if (!authChecked || !token) return null;

  const initials = user?.name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || 'U';

  return (
    <div className="flex min-h-screen bg-background">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        'fixed top-0 left-0 h-full w-60 bg-white border-r border-border z-50 flex flex-col transition-transform duration-200',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      )}>
        {/* Logo */}
        <div className="px-5 py-5 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
              </svg>
            </div>
            <div>
              <div className="text-sm font-bold text-foreground tracking-tight">Recon<span className="text-blue-500">Os</span></div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Payment OS</div>
            </div>
          </div>
        </div>

        {/* Org pill */}
        <div className="mx-3 mt-3 mb-1 px-3 py-2.5 bg-muted border border-border rounded-sm cursor-pointer hover:bg-gray-100 transition-colors">
          <div className="text-xs font-semibold text-foreground truncate">{org?.name || 'My Business'}</div>
          <div className="text-[11px] text-muted-foreground">{org?.industry || 'Pro plan'} · Lagos, NG</div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-2 px-3">
          {navigation.map((section) => (
            <div key={section.label} className="mb-1">
              <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-2 py-2">
                {section.label}
              </div>
              {section.items.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={cn(
                      'flex items-center gap-2.5 px-2.5 py-2 rounded-sm text-[13.5px] font-medium transition-all mb-0.5',
                      isActive
                        ? 'bg-primary text-white'
                        : item.highlight
                        ? 'text-amber-600 border border-amber-200 bg-amber-50 hover:bg-amber-100'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    )}
                  >
                    <span className={isActive ? 'text-white' : ''}>{icons[item.icon]}</span>
                    <span className="flex-1">{item.label}</span>
                    {item.badge === 'invoices' && (insights?.pendingInvoices ?? 0) > 0 && (
                      <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded-full', isActive ? 'bg-white/20 text-white' : 'bg-danger text-white')}>{insights.pendingInvoices}</span>
                    )}
                    {item.badge === 'review' && (insights?.reviewQueueCount ?? 0) > 0 && (
                      <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded-full', isActive ? 'bg-white/20 text-white' : 'bg-danger text-white')}>{insights.reviewQueueCount}</span>
                    )}
                    {item.badge === 'exceptions' && (insights?.exceptionsCount ?? 0) > 0 && (
                      <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded-full', isActive ? 'bg-white/20 text-white' : 'bg-violet-500 text-white')}>{insights.exceptionsCount}</span>
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* User */}
        <div className="border-t border-border p-3">
          <div className="flex items-center gap-2.5 px-2 py-2 rounded-sm hover:bg-muted cursor-pointer transition-colors group">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-foreground truncate">{user?.name}</div>
              <div className="text-[11px] text-muted-foreground truncate">{user?.email}</div>
            </div>
            <button
              onClick={logout}
              className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-danger transition-all"
              title="Sign out"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 lg:ml-60 min-h-screen flex flex-col">
        {/* Topbar */}
        <header className="h-14 bg-white border-b border-border flex items-center px-4 lg:px-6 gap-3 sticky top-0 z-30">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden w-8 h-8 flex items-center justify-center rounded-sm hover:bg-muted text-muted-foreground"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
              <line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          </button>

          {/* Search */}
          <div className="flex items-center gap-2 bg-muted border border-border rounded-sm px-3 py-1.5 flex-1 min-w-0 max-w-xs sm:max-w-sm">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input
              type="text"
              placeholder="Search payments, invoices…"
              className="bg-transparent outline-none text-sm text-foreground placeholder:text-muted-foreground w-full"
            />
            <kbd className="hidden sm:block text-[10px] text-muted-foreground bg-white border border-border px-1.5 py-0.5 rounded-sm font-mono">⌘K</kbd>
          </div>

          <div className="ml-auto flex items-center gap-2">
            {/* Notification bell */}
            <button className="relative w-8 h-8 flex items-center justify-center rounded-sm border border-border hover:bg-muted text-muted-foreground transition-colors">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-danger rounded-full border border-white"/>
            </button>

            {/* New invoice */}
            <Link href="/invoices" className="flex sm:hidden items-center justify-center w-8 h-8 bg-primary text-white rounded-sm" title="New invoice" aria-label="New invoice">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
            </Link>
            <Link href="/invoices" className="hidden sm:flex items-center gap-1.5 bg-primary text-white text-xs font-semibold px-3 py-2 rounded-sm hover:bg-gray-800 transition-colors">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3.5 h-3.5">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              New Invoice
            </Link>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 lg:p-6 page-enter">
          {children}
        </main>
      </div>
    </div>
  );
}
