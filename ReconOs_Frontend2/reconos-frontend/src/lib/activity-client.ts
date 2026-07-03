import { api } from '@/lib/api';
import type { ActivityEntry } from '@/components/activity/ActivityFeed';

const OPS_ONLY = new Set([
  'TRANSACTION_SYNC_COMPLETE',
  'RECONCILIATION_ENGINE_RUN',
  'TRANSACTION_VERIFIED',
  'NOMBA_SUBACCOUNT_LINKED',
  'RECONCILIATION_DRIFT_DETECTED',
  'OVERPAYMENT_VERIFICATION_FAILED',
  'OVERPAYMENT_VERIFICATION_MISMATCH',
  'OVERPAYMENT_REFUND_PENDING',
  'DEMO_MOCK_WEBHOOK_FIRED',
]);

const TITLES: Record<string, string> = {
  PAYMENT_RECEIVED: 'Payment received',
  PAYMENT_RECEIVED_WEBHOOK: 'Payment received',
  PAYMENT_RECOVERED: 'Missing payment recovered',
  PAYMENT_RECOVERED_HOURLY_SYNC: 'Missing payment recovered',
  PAYMENT_RECOVERED_MERCHANT_SEARCH: 'Missing payment recovered',
  PAYMENT_RECOVERED_SESSION_REQUERY: 'Missing payment recovered',
  PAYMENT_RECOVERED_NIGHTLY_SYNC: 'Missing payment recovered',
  TRANSACTION_SYNC_RECOVERED: 'Missing payment recovered',
  MATCH_AUTO: 'Payment matched automatically',
  MATCH_CONFIRMED: 'Payment matched',
  MATCH_REVIEW_QUEUED: 'Payment requires review',
  MANUAL_MATCH_APPLIED: 'Payment matched manually',
  OVERRIDE_APPLIED: 'Payment reassigned',
  CUSTOMER_CREATED: 'Customer created',
  CUSTOMER_UPDATED: 'Customer updated',
  CUSTOMER_DELETED: 'Customer deleted',
  INVOICE_CREATED: 'Invoice created',
  INVOICE_UPDATED: 'Invoice updated',
  INVOICE_PARTIALLY_PAID: 'Partial payment received',
  OVERPAYMENT_DETECTED: 'Overpayment detected',
  OVERPAYMENT_RESOLVED: 'Overpayment resolved',
  REFUND_COMPLETED: 'Refund completed',
  REFUND_FAILED: 'Refund failed',
  MERCHANT_WITHDRAWAL: 'Transfer completed',
  EXCEPTION_INVESTIGATING: 'Payment requires attention',
  WALLET_APPLIED: 'Wallet credit applied',
  WALLET_DEBITED: 'Wallet debited',
};

function asObj(v: unknown): Record<string, unknown> {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}

function presentRawLog(log: any): ActivityEntry {
  const v = asObj(log.newValue);
  const title =
    TITLES[log.action] ||
    log.action
      .split('_')
      .map((w: string) => w[0] + w.slice(1).toLowerCase())
      .join(' ');

  const customerName = String(v.customerName || v.payerName || v.name || '') || undefined;
  const invoiceNumber = v.invoiceNumber ? String(v.invoiceNumber) : undefined;
  const amount = v.amount != null ? Number(v.amount) : undefined;
  const confidence = v.confidence != null ? Number(v.confidence) : undefined;

  const lines: string[] = [];
  if (customerName) lines.push(customerName);
  if (amount != null && !Number.isNaN(amount)) lines.push(`₦${amount.toLocaleString('en-NG')}`);
  if (invoiceNumber) lines.push(`Invoice ${invoiceNumber}`);
  if (confidence != null) lines.push(`${confidence}% confidence`);
  if (v.description) lines.push(String(v.description));

  let tone: ActivityEntry['tone'] = 'muted';
  let icon = '•';
  if (log.action.startsWith('MATCH_') || log.action === 'REFUND_COMPLETED') {
    tone = 'success';
    icon = '✓';
  } else if (log.action.startsWith('PAYMENT_') || log.action === 'INVOICE_CREATED') {
    tone = 'info';
    icon = '↓';
  } else if (log.action.includes('EXCEPTION') || log.action.includes('REVIEW')) {
    tone = 'warning';
    icon = '⚠';
  }

  return {
    id: log.id,
    action: log.action,
    createdAt: log.createdAt,
    title,
    summary: lines[0] || title,
    lines,
    icon,
    tone,
    customerName,
    invoiceNumber,
    amount,
    confidence,
    user: log.user ? { name: log.user.name, email: log.user.email } : null,
    technical: {
      entity: log.entity,
      entityId: log.entityId,
      oldValue: log.oldValue,
      newValue: log.newValue,
      ipAddress: log.ipAddress ?? null,
    },
  };
}

/** Merchant activity — prefers enriched API, falls back to legacy /audit-logs. */
export async function fetchMerchantActivity(): Promise<ActivityEntry[]> {
  try {
    const res = await api.get('/audit-logs/activity');
    return res.data;
  } catch (err: any) {
    if (err?.response?.status !== 404) throw err;
    const legacy = await api.get('/audit-logs');
    return (legacy.data as any[])
      .filter((log) => !OPS_ONLY.has(log.action))
      .map(presentRawLog);
  }
}
