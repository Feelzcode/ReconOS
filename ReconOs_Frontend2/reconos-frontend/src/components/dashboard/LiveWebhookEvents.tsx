'use client';
// Payment Activity — merchant-friendly feed with optional developer details.

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { formatNaira, timeAgo } from '@/lib/utils';

interface LiveEvent {
  id: string;
  action: string;
  detail: Record<string, unknown> | null;
  timestamp: string;
}

type EventConfig = {
  icon: string;
  color: string;
  bg: string;
  title: string;
  subtitle: (d: Record<string, unknown>) => string;
  devDetail?: (action: string, d: Record<string, unknown>) => string;
};

const eventConfig: Record<string, EventConfig> = {
  PAYMENT_RECEIVED: {
    icon: '↓',
    color: 'text-info',
    bg: 'bg-info/10',
    title: 'Payment received',
    subtitle: (d) => formatNaira(Number(d?.amount ?? 0)),
    devDetail: () => 'POST /api/webhooks/nomba · HMAC verified',
  },
  PAYMENT_RECOVERED: {
    icon: '↻',
    color: 'text-info',
    bg: 'bg-info/10',
    title: 'Missing payment recovered',
    subtitle: () => 'Payment imported and reconciled',
    devDetail: (action) => action,
  },
  PAYMENT_RECOVERED_MERCHANT_SEARCH: {
    icon: '↻',
    color: 'text-info',
    bg: 'bg-info/10',
    title: 'Missing payment recovered',
    subtitle: () => 'Found via payment search',
    devDetail: (action) => action,
  },
  PAYMENT_RECOVERED_SESSION_REQUERY: {
    icon: '↻',
    color: 'text-info',
    bg: 'bg-info/10',
    title: 'Missing payment recovered',
    subtitle: () => 'Recovered from payment reference',
    devDetail: (action) => action,
  },
  PAYMENT_RECOVERED_HOURLY_SYNC: {
    icon: '↻',
    color: 'text-info',
    bg: 'bg-info/10',
    title: 'Missing payment recovered',
    subtitle: () => 'Recovered during background sync',
    devDetail: (action) => action,
  },
  PAYMENT_RECOVERED_NIGHTLY_SYNC: {
    icon: '↻',
    color: 'text-info',
    bg: 'bg-info/10',
    title: 'Missing payment recovered',
    subtitle: () => 'Recovered during background sync',
    devDetail: (action) => action,
  },
  TRANSACTION_SYNC_RECOVERED: {
    icon: '↻',
    color: 'text-info',
    bg: 'bg-info/10',
    title: 'Missing payment recovered',
    subtitle: () => 'Recovered during background sync',
    devDetail: (action) => action,
  },
  MATCH_AUTO: {
    icon: '✓',
    color: 'text-success',
    bg: 'bg-success/10',
    title: 'Payment automatically matched',
    subtitle: (d) => {
      const inv = d?.invoiceNumber ? `Invoice ${d.invoiceNumber}` : 'Invoice matched';
      const conf = d?.confidence != null ? ` · ${d.confidence}% match confidence` : '';
      return `${inv}${conf}`;
    },
    devDetail: (action, d) =>
      `${action} · ${d?.confidence ?? '—'}% · ${d?.settlement ?? 'EXACT'}`,
  },
  MATCH_REVIEW_QUEUED: {
    icon: '⏳',
    color: 'text-warning',
    bg: 'bg-warning/10',
    title: 'Payment awaiting review',
    subtitle: (d) =>
      d?.confidence != null
        ? `${d.confidence}% match confidence — needs your confirmation`
        : 'Needs your confirmation',
    devDetail: (action, d) => `${action} · ${d?.confidence ?? '—'}%`,
  },
  INVOICE_PARTIALLY_PAID: {
    icon: '◐',
    color: 'text-warning',
    bg: 'bg-warning/10',
    title: 'Partial payment received',
    subtitle: (d) => `${formatNaira(Number(d?.remainingBalance ?? 0))} still outstanding`,
    devDetail: (action) => action,
  },
  OVERPAYMENT_DETECTED: {
    icon: '⬆',
    color: 'text-violet-600',
    bg: 'bg-violet-50',
    title: 'Overpayment detected',
    subtitle: (d) => `${formatNaira(Number(d?.excessAmount ?? 0))} excess`,
    devDetail: (action) => action,
  },
  OVERPAYMENT_RESOLVED: {
    icon: '⚙',
    color: 'text-violet-600',
    bg: 'bg-violet-50',
    title: 'Overpayment resolved',
    subtitle: (d) => String(d?.actionType ?? 'Action completed'),
    devDetail: (action) => action,
  },
};

function defaultConfig(action: string): EventConfig {
  return {
    icon: '•',
    color: 'text-muted-foreground',
    bg: 'bg-muted',
    title: action.replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase()),
    subtitle: () => '',
    devDetail: (a) => a,
  };
}

export default function LiveWebhookEvents() {
  const [showDevDetails, setShowDevDetails] = useState(false);

  const { data: events = [], isFetching } = useQuery<LiveEvent[]>({
    queryKey: ['live-events'],
    queryFn: () => api.get('/audit-logs/live-events').then((r) => r.data),
    refetchInterval: 3000,
    refetchIntervalInBackground: true,
  });

  return (
    <div className="bg-white border border-border rounded-DEFAULT shadow-card overflow-hidden mb-5">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="text-sm font-bold text-foreground">Payment activity</div>
          <span className="flex items-center gap-1.5 text-[11px] font-semibold text-success bg-success/10 px-2 py-0.5 rounded-full">
            <span className={`w-1.5 h-1.5 bg-success rounded-full ${isFetching ? 'live-dot' : ''}`} />
            Live updates enabled
          </span>
        </div>
        <button
          type="button"
          onClick={() => setShowDevDetails(!showDevDetails)}
          className="text-[11px] text-muted-foreground hover:text-foreground font-medium"
        >
          {showDevDetails ? 'Hide developer details' : 'Developer details'}
        </button>
      </div>

      <div className="divide-y divide-border">
        {events.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-muted-foreground">
            Payment activity will appear here as collections are processed.
          </div>
        ) : (
          events.map((event) => {
            const d = event.detail ?? {};
            const config = eventConfig[event.action] ?? defaultConfig(event.action);
            return (
              <div key={event.id} className="px-5 py-3">
                <div className="flex items-start gap-3">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs mt-0.5 ${config.bg} ${config.color}`}
                  >
                    {config.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-foreground">{config.title}</div>
                    {config.subtitle(d) && (
                      <div className="text-xs text-muted-foreground mt-0.5">{config.subtitle(d)}</div>
                    )}
                    {showDevDetails && config.devDetail && (
                      <div className="text-[10px] font-mono text-muted-foreground mt-1.5 bg-muted px-2 py-1 rounded-sm">
                        {config.devDetail(event.action, d)}
                      </div>
                    )}
                  </div>
                  <div className="text-[11px] text-muted-foreground whitespace-nowrap">
                    {timeAgo(event.timestamp)}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
