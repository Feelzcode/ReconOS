import type { PaymentTrackerStatus } from '@/lib/api';

/** Public pay page — info blue (#2563EB) for every live status (design guide). */
export const PAYMENT_TRACKER: Record<
  PaymentTrackerStatus,
  {
    label: string;
    badgeClass: string;
    accentClass: string;
    pulse?: boolean;
  }
> = {
  AWAITING: {
    label: 'Awaiting payment',
    badgeClass: 'bg-info-bg text-info-text',
    accentClass: 'border-l-[#2563EB]',
  },
  CONFIRMING: {
    label: 'Payment received — confirming',
    badgeClass: 'bg-info-bg text-info-text',
    accentClass: 'border-l-[#2563EB]',
    pulse: true,
  },
  PARTIAL: {
    label: 'Partial payment received',
    badgeClass: 'bg-info-bg text-info-text',
    accentClass: 'border-l-[#2563EB]',
  },
  CONFIRMED: {
    label: 'Payment successful',
    badgeClass: 'bg-info-bg text-info-text',
    accentClass: 'border-l-[#2563EB]',
  },
};

/** Resolve tracker for display — backend is source of truth, with safe fallbacks. */
export function resolvePaymentTracker(data: {
  trackerStatus?: PaymentTrackerStatus;
  paymentStatus?: string;
  amountDue?: number;
  status?: string;
}): PaymentTrackerStatus {
  const ts = data.trackerStatus;
  if (ts === 'CONFIRMED') return 'CONFIRMED';
  if (
    data.paymentStatus === 'PAID' ||
    data.amountDue === 0 ||
    data.status === 'PAID' ||
    data.status === 'OVERPAID'
  ) {
    return 'CONFIRMED';
  }
  if (ts) return ts;
  return 'AWAITING';
}
