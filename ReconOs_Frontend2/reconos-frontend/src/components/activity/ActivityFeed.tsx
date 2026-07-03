'use client';

import { useMemo, useState } from 'react';
import { Card, StatCard } from '@/components/ui';
import { formatDateTime, cn } from '@/lib/utils';

export interface ActivityEntry {
  id: string;
  action: string;
  createdAt: string;
  title: string;
  summary: string;
  lines: string[];
  icon: string;
  tone: 'success' | 'info' | 'warning' | 'danger' | 'muted' | 'violet';
  customerName?: string;
  invoiceNumber?: string;
  amount?: number;
  confidence?: number;
  user?: { name: string; email: string } | null;
  technical: {
    entity: string;
    entityId: string;
    oldValue: unknown;
    newValue: unknown;
    ipAddress: string | null;
  };
}

const TONE_CLASS: Record<ActivityEntry['tone'], string> = {
  success: 'bg-success/10 text-success',
  info: 'bg-info/10 text-info',
  warning: 'bg-warning/10 text-warning',
  danger: 'bg-danger/10 text-danger',
  muted: 'bg-muted text-muted-foreground',
  violet: 'bg-violet-50 text-violet-600',
};

const MERCHANT_FILTERS: Record<string, (a: string) => boolean> = {
  ALL: () => true,
  Payments: (a) =>
    a.startsWith('PAYMENT_') ||
    a.startsWith('REFUND_') ||
    a === 'MERCHANT_WITHDRAWAL' ||
    a === 'TRANSACTION_SYNC_RECOVERED',
  Invoices: (a) => a.startsWith('INVOICE_'),
  Reconciliation: (a) =>
    a.startsWith('MATCH_') ||
    a.includes('OVERRIDE') ||
    a.includes('MANUAL_MATCH') ||
    a.startsWith('OVERPAYMENT_') ||
    a.startsWith('PAYMENT_RECOVERED'),
  Administration: (a) => a.startsWith('CUSTOMER_') || a.startsWith('WALLET_'),
  Security: (a) => a.includes('EXCEPTION'),
};

const OPS_FILTERS: Record<string, (a: string) => boolean> = {
  ALL: () => true,
  Sync: (a) => a.includes('SYNC') || a.startsWith('PAYMENT_RECOVERED_'),
  Reconciliation: (a) => a.includes('RECONCILIATION') || a.startsWith('MATCH_'),
  Webhooks: (a) => a.includes('WEBHOOK') || a.includes('PAYMENT_RECEIVED'),
  Provider: (a) => a.includes('NOMBA') || a === 'TRANSACTION_VERIFIED',
  Errors: (a) => a.includes('FAILED') || a.includes('DRIFT') || a.includes('EXCEPTION'),
};

function isToday(iso: string) {
  return new Date(iso).toDateString() === new Date().toDateString();
}

function ActivityRow({ entry, opsMode }: { entry: ActivityEntry; opsMode?: boolean }) {
  const [open, setOpen] = useState(false);
  const displayLines = entry.lines.filter((l) => l !== entry.summary);

  return (
    <div className="px-5 py-4">
      <div className="flex items-start gap-3.5">
        <div
          className={cn(
            'w-8 h-8 rounded-sm flex items-center justify-center flex-shrink-0 text-sm',
            TONE_CLASS[entry.tone],
          )}
        >
          {entry.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold text-foreground">{entry.title}</div>
          <div className="mt-1 space-y-0.5">
            {displayLines.map((line) => (
              <div key={line} className="text-xs text-muted-foreground">
                {line}
              </div>
            ))}
          </div>
          {entry.user && (
            <div className="text-[11px] text-muted-foreground/70 mt-1">By {entry.user.name}</div>
          )}
          {opsMode && (
            <div className="text-[10px] font-mono text-muted-foreground mt-1">{entry.action}</div>
          )}
          <button
            type="button"
            onClick={() => setOpen(!open)}
            className="text-[11px] font-semibold text-info hover:underline mt-2"
          >
            {open ? '▲ Hide technical details' : '▼ View technical details'}
          </button>
          {open && (
            <pre className="mt-2 text-[10px] font-mono bg-muted border border-border rounded-sm p-3 overflow-x-auto text-muted-foreground max-h-64">
              {JSON.stringify(
                {
                  action: entry.action,
                  entity: entry.technical.entity,
                  entityId: entry.technical.entityId,
                  ipAddress: entry.technical.ipAddress,
                  oldValue: entry.technical.oldValue,
                  newValue: entry.technical.newValue,
                },
                null,
                2,
              )}
            </pre>
          )}
        </div>
        <div className="text-[11px] text-muted-foreground whitespace-nowrap pt-0.5">
          {formatDateTime(entry.createdAt)}
        </div>
      </div>
    </div>
  );
}

export default function ActivityFeed({
  entries,
  opsMode = false,
  emptyMessage = 'No activity recorded yet.',
}: {
  entries: ActivityEntry[];
  opsMode?: boolean;
  emptyMessage?: string;
}) {
  const [filter, setFilter] = useState('ALL');
  const [search, setSearch] = useState('');

  const filters = opsMode ? OPS_FILTERS : MERCHANT_FILTERS;
  const tabs = Object.keys(filters);

  const filtered = useMemo(() => {
    const pred = filters[filter] || (() => true);
    const needle = search.trim().toLowerCase();
    return entries.filter((e) => {
      if (!pred(e.action)) return false;
      if (!needle) return true;
      return (
        e.title.toLowerCase().includes(needle) ||
        e.customerName?.toLowerCase().includes(needle) ||
        e.invoiceNumber?.toLowerCase().includes(needle) ||
        e.lines.some((l) => l.toLowerCase().includes(needle)) ||
        e.action.toLowerCase().includes(needle)
      );
    });
  }, [entries, filter, search, filters]);

  const stats = useMemo(() => {
    const today = entries.filter((e) => isToday(e.createdAt));
    return {
      today: today.length,
      matched: today.filter((e) => ['MATCH_AUTO', 'MATCH_CONFIRMED'].includes(e.action)).length,
      reviews: today.filter((e) =>
        ['MATCH_REVIEW_QUEUED', 'OVERRIDE_APPLIED', 'MANUAL_MATCH_APPLIED'].includes(e.action),
      ).length,
      payments: today.filter((e) => e.action.startsWith('PAYMENT_') || e.action.startsWith('REFUND_')).length,
    };
  }, [entries]);

  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Today's Activity" value={String(stats.today)} delta="Events recorded today" />
        <StatCard
          label="Payments Matched"
          value={String(stats.matched)}
          delta="Matched automatically or confirmed"
          deltaUp={stats.matched > 0}
        />
        <StatCard label="Manual Reviews" value={String(stats.reviews)} delta="Awaiting or manual action" />
        <StatCard
          label="Payment Events"
          value={String(stats.payments)}
          delta="Received or refunded today"
          deltaUp={stats.payments > 0}
        />
      </div>

      <Card>
        <div className="px-5 py-3 border-b border-border">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by customer, invoice, payment reference, or activity…"
            className="w-full max-w-lg px-3 py-2 border border-border rounded-sm bg-input text-sm outline-none focus:border-primary"
          />
        </div>
        <div className="flex items-center gap-2 px-5 py-3 border-b border-border overflow-x-auto">
          {tabs.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setFilter(t)}
              className={cn(
                'px-3 py-1.5 rounded-sm text-xs font-semibold whitespace-nowrap transition-colors',
                filter === t ? 'bg-primary text-white' : 'bg-muted text-muted-foreground hover:text-foreground',
              )}
            >
              {t === 'ALL' ? 'All' : t}
            </button>
          ))}
        </div>
        <div className="divide-y divide-border">
          {filtered.length === 0 ? (
            <div className="px-5 py-12 text-center text-sm text-muted-foreground">{emptyMessage}</div>
          ) : (
            filtered.map((entry) => <ActivityRow key={entry.id} entry={entry} opsMode={opsMode} />)
          )}
        </div>
      </Card>
    </>
  );
}
