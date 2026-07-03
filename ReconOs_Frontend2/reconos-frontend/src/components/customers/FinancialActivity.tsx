'use client';

import { useState } from 'react';
import Link from 'next/link';
import { formatNaira, formatDateTime } from '@/lib/utils';

export type FinancialEvent = {
  id: string;
  type: string;
  amount: number;
  timestamp: string;
  status: 'pending' | 'completed' | 'failed';
  title: string;
  lines: string[];
  icon: string;
  tone: 'success' | 'info' | 'warning' | 'danger' | 'violet' | 'muted';
  relatedInvoiceNumber?: string;
  actionHref?: string;
  actionLabel?: string;
  technical?: { reference?: string; paymentReference?: string };
};

const TONE: Record<FinancialEvent['tone'], string> = {
  success: 'border-success/20 bg-success/5',
  info: 'border-info/20 bg-info/5',
  warning: 'border-warning/20 bg-warning/5',
  danger: 'border-danger/20 bg-danger/5',
  violet: 'border-violet-200 bg-violet-50',
  muted: 'border-border bg-muted/40',
};

const STATUS_LABEL: Record<FinancialEvent['status'], string> = {
  pending: 'In progress',
  completed: 'Completed',
  failed: 'Failed',
};

const MONEY_EVENT_TYPES = new Set([
  'OVERPAYMENT_DISPOSITION',
  'WALLET_APPLIED',
]);

export function FinancialActivity({ events }: { events: FinancialEvent[] }) {
  if (!events.length) {
    return (
      <div className="px-5 py-10 text-center text-sm text-muted-foreground">
        No financial activity yet
      </div>
    );
  }

  return (
    <div className="divide-y divide-border">
      {events.map((event) => (
        <FinancialEventRow key={event.id} event={event} />
      ))}
    </div>
  );
}

function FinancialEventRow({ event }: { event: FinancialEvent }) {
  const [open, setOpen] = useState(false);
  const isCard = MONEY_EVENT_TYPES.has(event.type);

  return (
    <div className={`px-5 py-4 ${isCard ? '' : ''}`}>
      <div className={`rounded-sm border p-4 ${TONE[event.tone]}`}>
        <div className="flex items-start gap-3">
          <span className="text-lg leading-none mt-0.5" aria-hidden>
            {event.icon}
          </span>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="text-sm font-bold text-foreground">{event.title}</span>
              <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                {STATUS_LABEL[event.status]}
              </span>
              {event.relatedInvoiceNumber && (
                <span className="text-[11px] font-mono text-muted-foreground">
                  {event.relatedInvoiceNumber}
                </span>
              )}
            </div>
            <div className="text-lg font-extrabold text-foreground tracking-tight mb-1">
              {formatNaira(event.amount)}
            </div>
            <ul className="space-y-0.5">
              {event.lines.map((line) => (
                <li key={line} className="text-xs text-muted-foreground">
                  {line}
                </li>
              ))}
            </ul>
            <div className="text-[11px] text-muted-foreground mt-2">
              {formatDateTime(event.timestamp)}
            </div>
            {event.actionHref && event.actionLabel && (
              <Link
                href={event.actionHref}
                className="inline-block mt-2 text-xs font-semibold text-info hover:underline"
              >
                {event.actionLabel} →
              </Link>
            )}
            {event.technical && (
              <button
                type="button"
                onClick={() => setOpen((o) => !o)}
                className="block mt-2 text-[11px] font-semibold text-muted-foreground hover:text-foreground"
              >
                {open ? 'Hide details' : 'Show payment details'}
              </button>
            )}
            {open && event.technical && (
              <div className="mt-2 text-[11px] font-mono text-muted-foreground bg-white/60 border border-border rounded-sm px-2 py-1.5 space-y-1">
                {event.technical.reference && (
                  <div>Reference: {event.technical.reference}</div>
                )}
                {event.technical.paymentReference && (
                  <div>Payment reference: {event.technical.paymentReference}</div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
