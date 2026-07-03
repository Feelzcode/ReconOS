'use client';

import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { formatNaira, formatDate, cn } from '@/lib/utils';
import type { PaymentPageData } from '@/lib/api';

type Props = {
  data: PaymentPageData;
  showActions?: boolean;
  onPrint?: () => void;
};

type TrackerKey = PaymentPageData['trackerStatus'];

const TRACKER: Record<
  TrackerKey,
  { label: string; badge: string; accent: string; pulse?: boolean }
> = {
  AWAITING: {
    label: 'Awaiting payment',
    badge: 'bg-info/10 text-info-text',
    accent: 'border-l-info',
  },
  CONFIRMING: {
    label: 'Payment received — confirming',
    badge: 'bg-info/10 text-info-text',
    accent: 'border-l-info',
    pulse: true,
  },
  CONFIRMED: {
    label: 'Payment confirmed',
    badge: 'bg-success/10 text-success-text',
    accent: 'border-l-success',
  },
};

function merchantInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function formatAccountDisplay(num: string): string {
  const digits = num.replace(/\D/g, '');
  return digits.replace(/(\d{4})(?=\d)/g, '$1 ').trim();
}

function dueLabel(dueDate: string): string {
  const due = new Date(dueDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dueDay = new Date(due);
  dueDay.setHours(0, 0, 0, 0);
  const diff = Math.round((dueDay.getTime() - today.getTime()) / 86400000);
  if (diff < 0) return 'Overdue';
  if (diff === 0) return 'Due today';
  if (diff === 1) return 'Due tomorrow';
  if (diff <= 7) return `Due in ${diff} days`;
  return `Due ${formatDate(dueDate)}`;
}

export function PaymentRequestView({ data, showActions = true, onPrint }: Props) {
  const qrRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  const status: TrackerKey =
    data.trackerStatus ?? (data.paymentStatus === 'PAID' ? 'CONFIRMED' : 'AWAITING');
  const tracker = TRACKER[status];
  const isConfirmed = status === 'CONFIRMED';
  const isConfirming = status === 'CONFIRMING';
  const customerLabel = data.merchant.customerLabel;
  const walletCredit = data.walletCreditApplied ?? 0;
  const showWalletLine = walletCredit > 0;
  const due = dueLabel(data.dueDate);
  const isOverdue = due === 'Overdue';

  useEffect(() => {
    if (!qrRef.current || !data.qrPayload || isConfirmed) return;
    const container = qrRef.current;
    container.innerHTML = '';
    const canvas = document.createElement('canvas');
    container.appendChild(canvas);
    QRCode.toCanvas(canvas, data.qrPayload, {
      width: 200,
      margin: 1,
      color: { dark: '#111827', light: '#ffffff' },
      errorCorrectionLevel: 'M',
    }).catch(() => {});
  }, [data.qrPayload, isConfirmed]);

  const copyAccount = async () => {
    if (!data.paymentAccount) return;
    await navigator.clipboard.writeText(data.paymentAccount.accountNumber.replace(/\D/g, ''));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <article
      className={cn(
        'payment-request-doc bg-white text-foreground rounded-DEFAULT border border-border max-w-[480px] mx-auto overflow-hidden shadow-card border-l-4',
        tracker.accent,
      )}
    >
      <div className="p-5 sm:p-6 space-y-5">
        {/* Merchant + status */}
        <header className="text-center pb-5 border-b border-border">
          <div className="w-11 h-11 rounded-DEFAULT bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold mx-auto mb-3">
            {merchantInitials(data.merchant.name)}
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-foreground m-0 tracking-tight">
            {data.merchant.name}
          </h1>
          <span
            className={cn(
              'inline-flex items-center gap-1.5 mt-3 px-2.5 py-1 rounded-full text-[11px] font-semibold',
              tracker.badge,
            )}
          >
            <span
              className={cn(
                'w-1.5 h-1.5 rounded-full bg-current opacity-70',
                tracker.pulse && 'live-dot',
              )}
            />
            {tracker.label}
          </span>
        </header>

        {/* Payment request */}
        <div>
          <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
            Payment request
          </div>
          <h2 className="text-lg font-bold text-foreground m-0">{data.description}</h2>
          <p className="text-sm text-muted-foreground mt-2 m-0">
            <span className="font-semibold text-foreground">{customerLabel}:</span>{' '}
            {data.customer.name}
          </p>
          <p
            className={cn(
              'text-sm font-semibold mt-1 m-0',
              isOverdue ? 'text-danger' : 'text-muted-foreground',
            )}
          >
            {due}
          </p>
        </div>

        {/* Payment summary */}
        <section className="rounded-DEFAULT border border-border bg-muted p-4">
          <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground m-0 mb-3">
            Payment summary
          </h3>
          <div className="space-y-2 text-sm">
            <SummaryRow label="Invoice total" value={formatNaira(data.amount)} />
            {showWalletLine && (
              <SummaryRow
                label="Wallet credit applied"
                value={`−${formatNaira(walletCredit)}`}
                accent="text-success-text"
              />
            )}
            <div className="border-t border-border my-2" />
            <div className="flex justify-between items-end pt-1">
              <span className="text-sm font-bold text-foreground">Amount due</span>
              <span className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight leading-none">
                {formatNaira(isConfirmed ? 0 : data.amountDue)}
              </span>
            </div>
          </div>
        </section>

        {/* Confirmed / receipt */}
        {isConfirmed && data.receipt && (
          <section className="rounded-DEFAULT border border-success/30 bg-success-bg p-5 text-center">
            <div className="text-3xl mb-2 text-success">✓</div>
            <h3 className="text-lg font-bold text-success-text m-0">Payment successful</h3>
            <p className="text-sm text-success mt-1 m-0">Receipt ready</p>
            <div className="mt-4 bg-white rounded-DEFAULT border border-border px-4 py-3 inline-block text-left min-w-[200px]">
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                Receipt no.
              </div>
              <div className="font-mono font-bold text-lg text-foreground">{data.receipt.number}</div>
              <div className="text-sm font-semibold mt-1">{formatNaira(data.receipt.amount)}</div>
              <div className="text-xs text-muted-foreground mt-1">{formatDate(data.receipt.paidAt)}</div>
            </div>
            {showActions && (
              <button
                type="button"
                onClick={() => (onPrint ? onPrint() : window.print())}
                className="mt-4 w-full text-sm font-semibold py-3 rounded-DEFAULT bg-primary text-primary-foreground hover:opacity-90 transition-opacity no-print"
              >
                Download receipt
              </button>
            )}
          </section>
        )}

        {isConfirming && (
          <section className="rounded-DEFAULT border border-info/30 bg-info-bg p-4 text-center text-sm">
            <p className="m-0 font-semibold text-info-text">We received your payment</p>
            <p className="m-0 mt-1 text-muted-foreground">
              Reconciling with {data.merchant.name}…
            </p>
          </section>
        )}

        {/* How to pay */}
        {!isConfirmed && data.paymentAccount && data.amountDue > 0 && (
          <section>
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground m-0 mb-2">
              How to pay
            </h3>
            <p className="text-sm text-foreground m-0 mb-4">
              Transfer exactly{' '}
              <strong className="text-foreground text-base font-extrabold">
                {formatNaira(data.amountDue)}
              </strong>{' '}
              to the dedicated payment account below.
            </p>

            <div className="rounded-DEFAULT border border-border bg-white p-4 text-center shadow-card">
              <div className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground mb-1">
                Dedicated payment account
              </div>
              <div className="text-sm font-semibold text-foreground">{data.paymentAccount.bankName}</div>
              <div className="font-mono text-2xl sm:text-3xl font-extrabold text-foreground tracking-wider my-3 break-all leading-tight">
                {formatAccountDisplay(data.paymentAccount.accountNumber)}
              </div>
              <button
                type="button"
                onClick={copyAccount}
                className="w-full text-base font-bold py-3.5 rounded-DEFAULT bg-primary text-primary-foreground hover:opacity-90 transition-opacity no-print"
              >
                {copied ? 'Copied!' : 'Copy account number'}
              </button>
              <div className="mt-4 pt-3 border-t border-border text-left text-xs">
                <div className="text-muted-foreground uppercase tracking-wide font-bold mb-0.5">
                  Account name
                </div>
                <div className="text-sm font-semibold text-foreground">
                  {data.paymentAccount.accountName}
                </div>
              </div>
            </div>

            {data.qrPayload && (
              <div className="mt-5 text-center no-print">
                <p className="text-xs font-semibold text-muted-foreground mb-3">
                  Open on another device
                </p>
                <div
                  ref={qrRef}
                  className="inline-flex justify-center [&_canvas]:rounded-DEFAULT [&_canvas]:border [&_canvas]:border-border [&_canvas]:shadow-card"
                />
                <p className="text-[10px] text-muted-foreground mt-3 max-w-[280px] mx-auto leading-relaxed">
                  Scan with your banking app&apos;s QR scanner. Compatible with apps that support
                  NIBSS NQR payments.
                </p>
              </div>
            )}
          </section>
        )}

        {/* Support */}
        {(data.merchant.email || data.customer.phone) && (
          <section className="border-t border-border pt-4 text-center text-sm">
            <div className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground mb-2">
              Questions?
            </div>
            <div className="font-semibold text-foreground">{data.merchant.name}</div>
            {data.customer.phone && (
              <a href={`tel:${data.customer.phone}`} className="block text-foreground font-semibold mt-1 underline-offset-2 hover:underline">
                {data.customer.phone}
              </a>
            )}
            {data.merchant.email && (
              <a
                href={`mailto:${data.merchant.email}`}
                className="block text-muted-foreground mt-1 text-xs break-all hover:text-foreground"
              >
                {data.merchant.email}
              </a>
            )}
          </section>
        )}

        {showActions && !isConfirmed && (
          <button
            type="button"
            onClick={() => (onPrint ? onPrint() : window.print())}
            className="w-full text-sm font-semibold py-3 rounded-DEFAULT border border-border text-foreground bg-white hover:bg-muted transition-colors no-print"
          >
            Print payment request
          </button>
        )}
      </div>

      <footer className="text-center text-[10px] text-muted-foreground py-4 border-t border-border bg-muted">
        Powered by ReconOS
      </footer>
    </article>
  );
}

function SummaryRow({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn('font-semibold', accent ?? 'text-foreground')}>{value}</span>
    </div>
  );
}
