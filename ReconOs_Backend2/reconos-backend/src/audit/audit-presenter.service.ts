import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { isMerchantActivityAction } from './audit-audience';

type AuditRow = {
  id: string;
  action: string;
  entity: string;
  entityId: string;
  oldValue: unknown;
  newValue: unknown;
  ipAddress: string | null;
  createdAt: Date;
  user: { id: string; name: string; email: string } | null;
};

export interface PresentedAuditEntry {
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

const MERCHANT_TITLES: Record<string, string> = {
  PAYMENT_RECEIVED: 'Payment received',
  PAYMENT_RECEIVED_WEBHOOK: 'Payment received',
  PAYMENT_RECOVERED: 'Missing payment recovered',
  PAYMENT_RECOVERED_MERCHANT_SEARCH: 'Missing payment recovered',
  PAYMENT_RECOVERED_SESSION_REQUERY: 'Missing payment recovered',
  PAYMENT_RECOVERED_HOURLY_SYNC: 'Missing payment recovered',
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

const OPS_TITLES: Record<string, string> = {
  ...MERCHANT_TITLES,
  TRANSACTION_SYNC_COMPLETE: 'Background payment sync completed',
  RECONCILIATION_ENGINE_RUN: 'Automatic reconciliation completed',
  TRANSACTION_VERIFIED: 'Payment verification completed',
  NOMBA_SUBACCOUNT_LINKED: 'Payment infrastructure linked',
  RECONCILIATION_DRIFT_DETECTED: 'Reconciliation drift detected',
  OVERPAYMENT_VERIFICATION_FAILED: 'Overpayment verification failed',
  OVERPAYMENT_VERIFICATION_MISMATCH: 'Overpayment verification mismatch',
  OVERPAYMENT_REFUND_PENDING: 'Refund pending',
  DEMO_MOCK_WEBHOOK_FIRED: 'Demo payment injected',
};

type ContextInvoice = {
  id: string;
  invoiceNumber: string;
  description: string;
  customer: { name: string };
};

type ContextTransaction = {
  id: string;
  amount: unknown;
  nombaReference: string;
  customer: { name: string };
};

type ContextCustomer = { id: string; name: string };

type AuditContext = {
  invoices: Map<string, ContextInvoice>;
  transactions: Map<string, ContextTransaction>;
  customers: Map<string, ContextCustomer>;
};

@Injectable()
export class AuditPresenterService {
  constructor(private prisma: PrismaService) {}

  async present(
    rows: AuditRow[],
    mode: 'merchant' | 'ops',
  ): Promise<PresentedAuditEntry[]> {
    const filtered =
      mode === 'merchant' ? rows.filter((r) => isMerchantActivityAction(r.action)) : rows;

    const ctx = await this.buildContext(filtered);

    return filtered.map((row) => this.presentOne(row, mode, ctx));
  }

  private async buildContext(rows: AuditRow[]): Promise<AuditContext> {
    const invoiceIds = new Set<string>();
    const transactionIds = new Set<string>();
    const customerIds = new Set<string>();

    for (const row of rows) {
      const v = asRecord(row.newValue);
      if (v.invoiceId) invoiceIds.add(String(v.invoiceId));
      if (v.transactionId) transactionIds.add(String(v.transactionId));
      if (row.entity === 'Customer') customerIds.add(row.entityId);
      if (row.entity === 'Invoice') invoiceIds.add(row.entityId);
      if (row.entity === 'Transaction') transactionIds.add(row.entityId);
    }

    const [invoices, transactions, customers] = await Promise.all([
      invoiceIds.size
        ? this.prisma.invoice.findMany({
            where: { id: { in: [...invoiceIds] } },
            select: {
              id: true,
              invoiceNumber: true,
              description: true,
              customer: { select: { name: true } },
            },
          })
        : ([] as ContextInvoice[]),
      transactionIds.size
        ? this.prisma.transaction.findMany({
            where: { id: { in: [...transactionIds] } },
            select: {
              id: true,
              amount: true,
              nombaReference: true,
              customer: { select: { name: true } },
            },
          })
        : ([] as ContextTransaction[]),
      customerIds.size
        ? this.prisma.customer.findMany({
            where: { id: { in: [...customerIds] } },
            select: { id: true, name: true },
          })
        : ([] as ContextCustomer[]),
    ]);

    return {
      invoices: new Map(invoices.map((i) => [i.id, i] as const)),
      transactions: new Map(transactions.map((t) => [t.id, t] as const)),
      customers: new Map(customers.map((c) => [c.id, c] as const)),
    };
  }

  private presentOne(
    row: AuditRow,
    mode: 'merchant' | 'ops',
    ctx: AuditContext,
  ): PresentedAuditEntry {
    const v = asRecord(row.newValue);
    const titles = mode === 'ops' ? OPS_TITLES : MERCHANT_TITLES;
    const title =
      titles[row.action] ||
      row.action
        .split('_')
        .map((w) => w[0] + w.slice(1).toLowerCase())
        .join(' ');

    const invoice =
      (v.invoiceId && ctx.invoices.get(String(v.invoiceId))) ||
      (row.entity === 'Invoice' ? ctx.invoices.get(row.entityId) : undefined);
    const transaction =
      (v.transactionId && ctx.transactions.get(String(v.transactionId))) ||
      (row.entity === 'Transaction' ? ctx.transactions.get(row.entityId) : undefined);
    const customer =
      (row.entity === 'Customer' ? ctx.customers.get(row.entityId) : undefined) ||
      (transaction?.customer ? { name: transaction.customer.name } : undefined);

    const customerName =
      String(v.customerName || v.payerName || customer?.name || invoice?.customer?.name || '') ||
      undefined;
    const invoiceNumber = invoice?.invoiceNumber;
    const amount = num(v.amount) ?? num(transaction?.amount) ?? num(v.amountPaid) ?? num(v.excessAmount);
    const confidence = num(v.confidence);

    const lines = this.buildLines(row, mode, {
      customerName,
      invoiceNumber,
      amount,
      confidence,
      v,
    });

    const summary = lines[0] || title;
    const { icon, tone } = toneFor(row.action);

    return {
      id: row.id,
      action: row.action,
      createdAt: row.createdAt.toISOString(),
      title,
      summary,
      lines,
      icon,
      tone,
      customerName,
      invoiceNumber,
      amount,
      confidence,
      user: row.user ? { name: row.user.name, email: row.user.email } : null,
      technical: {
        entity: row.entity,
        entityId: row.entityId,
        oldValue: row.oldValue,
        newValue: row.newValue,
        ipAddress: row.ipAddress,
      },
    };
  }

  private buildLines(
    row: AuditRow,
    mode: 'merchant' | 'ops',
    ctx: {
      customerName?: string;
      invoiceNumber?: string;
      amount?: number;
      confidence?: number;
      v: Record<string, unknown>;
    },
  ): string[] {
    const { customerName, invoiceNumber, amount, confidence, v } = ctx;
    const lines: string[] = [];

    if (row.action === 'TRANSACTION_SYNC_COMPLETE') {
      const label = String(v.label || 'background');
      lines.push(`${label.charAt(0).toUpperCase() + label.slice(1)} background sync completed`);
      if (v.virtualAccounts != null) {
        lines.push(`Checked: ${v.virtualAccounts} payment account${Number(v.virtualAccounts) !== 1 ? 's' : ''}`);
      }
      if (v.recovered != null) {
        const n = Number(v.recovered);
        lines.push(
          n > 0 ? `Recovered: ${n} payment${n !== 1 ? 's' : ''}` : 'Recovered: 0 payments',
        );
      }
      if (v.errors != null) {
        const n = Number(v.errors);
        lines.push(n > 0 ? `Errors: ${n}` : 'Errors: None');
      }
      return lines;
    }

    if (row.action === 'TRANSACTION_VERIFIED') {
      const ok = v.statusOk === true;
      if (mode === 'merchant') {
        lines.push(ok ? 'Payment verified' : 'Verification could not be confirmed');
        if (ok) {
          lines.push('Amount confirmed');
          lines.push('Status confirmed');
        }
      } else {
        lines.push(ok ? 'Verification completed' : 'Verification failed');
        if (v.amountMatches === false) lines.push('Amount mismatch detected');
      }
      return lines;
    }

    if (customerName) lines.push(customerName);
    if (amount != null) lines.push(`₦${amount.toLocaleString('en-NG')}`);
    if (invoiceNumber) lines.push(`Invoice ${invoiceNumber}`);
    if (confidence != null) lines.push(`${confidence}% confidence`);

    if (row.action.startsWith('PAYMENT_RECOVERED') && customerName && !lines.includes(customerName)) {
      lines.unshift('Payment recovered automatically');
    }

    if (lines.length === 0 && v.reason) lines.push(String(v.reason));
    if (lines.length === 0 && row.user?.name) lines.push(`By ${row.user.name}`);

    return lines;
  }
}

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}

function num(v: unknown): number | undefined {
  if (v == null || v === '') return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

function toneFor(action: string): { icon: string; tone: PresentedAuditEntry['tone'] } {
  if (action.startsWith('MATCH_') || action === 'REFUND_COMPLETED' || action === 'CUSTOMER_CREATED') {
    return { icon: '✓', tone: 'success' };
  }
  if (action.startsWith('PAYMENT_') || action === 'INVOICE_CREATED' || action === 'MERCHANT_WITHDRAWAL') {
    return { icon: '↓', tone: 'info' };
  }
  if (action.includes('REVIEW') || action.includes('PARTIAL') || action === 'OVERPAYMENT_DETECTED') {
    return { icon: '⏳', tone: 'warning' };
  }
  if (action.includes('EXCEPTION') || action.includes('FAILED') || action.includes('DRIFT')) {
    return { icon: '⚠', tone: 'danger' };
  }
  if (action.includes('OVERRIDE') || action.includes('MANUAL')) {
    return { icon: '✎', tone: 'violet' };
  }
  if (action === 'TRANSACTION_SYNC_COMPLETE' || action === 'RECONCILIATION_ENGINE_RUN') {
    return { icon: '⚙', tone: 'muted' };
  }
  return { icon: '•', tone: 'muted' };
}
