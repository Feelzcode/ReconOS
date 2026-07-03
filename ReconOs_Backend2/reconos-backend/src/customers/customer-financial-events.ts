/** Project customer rows into merchant-facing financial activity events. */

export type FinancialEventType =
  | 'PAYMENT_RECEIVED'
  | 'INVOICE_SETTLED'
  | 'OVERPAYMENT_DISPOSITION'
  | 'WALLET_APPLIED';

export type FinancialEventStatus = 'pending' | 'completed' | 'failed';

export interface CustomerFinancialEvent {
  id: string;
  type: FinancialEventType;
  amount: number;
  timestamp: string;
  status: FinancialEventStatus;
  title: string;
  lines: string[];
  icon: string;
  tone: 'success' | 'info' | 'warning' | 'danger' | 'violet' | 'muted';
  relatedInvoiceId?: string;
  relatedInvoiceNumber?: string;
  actionHref?: string;
  actionLabel?: string;
  technical?: {
    reference?: string;
    paymentReference?: string;
  };
}

type TxnRow = {
  id: string;
  amount: unknown;
  status: string;
  paymentDate: Date;
  nombaReference: string;
  nombaEventId: string;
  match?: {
    id: string;
    createdAt: Date;
    confidenceScore: number;
    autoMatched: boolean;
    invoice: { id: string; invoiceNumber: string; amount: unknown; amountPaid: unknown; status: string };
  } | null;
};

type OverpayRow = {
  id: string;
  excessAmount: unknown;
  actionType: string;
  status: string;
  transferStatus: string | null;
  failureReason: string | null;
  refundReference: string | null;
  appliedToInvoiceId: string | null;
  createdAt: Date;
  updatedAt: Date;
  resolvedAt: Date | null;
  invoice: { id: string; invoiceNumber: string };
};

type WalletAuditRow = {
  id: string;
  entityId: string;
  createdAt: Date;
  newValue: unknown;
};

function refShort(ref: string): string {
  if (ref.length <= 16) return ref;
  return `${ref.slice(0, 10)}…${ref.slice(-4)}`;
}

function merchantFailureReason(raw: string | null | undefined): string | undefined {
  if (!raw?.trim()) return undefined;
  if (/insufficient/i.test(raw)) {
    return 'Not enough balance in the payout account to send this refund.';
  }
  if (/not_found/i.test(raw)) {
    return 'The original payment could not be verified.';
  }
  if (/\{"code"/.test(raw) || /nomba/i.test(raw)) {
    return 'The refund transfer could not be completed.';
  }
  return raw.length > 120 ? `${raw.slice(0, 117)}…` : raw;
}

function formatNairaInline(n: number): string {
  return `₦${n.toLocaleString('en-NG')}`;
}

function paymentEvent(txn: TxnRow): CustomerFinancialEvent {
  const amount = Number(txn.amount);
  const matched = txn.status === 'MATCHED' || txn.status === 'MANUALLY_MATCHED';
  const inReview = txn.status === 'IN_REVIEW';

  let status: FinancialEventStatus = 'pending';
  const lines: string[] = ['Transferred to dedicated payment account'];

  if (matched) {
    status = 'completed';
    lines.unshift('Payment matched to an invoice');
  } else if (inReview) {
    lines.unshift('Awaiting your confirmation in Reconciliation');
  } else if (txn.status === 'UNMATCHED') {
    lines.unshift('Matching in progress');
  } else if (txn.status === 'EXCEPTION') {
    status = 'failed';
    lines.unshift('Requires attention in Payment Exceptions');
  }

  return {
    id: `payment-${txn.id}`,
    type: 'PAYMENT_RECEIVED',
    amount,
    timestamp: txn.paymentDate.toISOString(),
    status,
    title: 'Payment received',
    lines,
    icon: '↓',
    tone: matched ? 'success' : inReview ? 'warning' : txn.status === 'EXCEPTION' ? 'danger' : 'info',
    relatedInvoiceId: txn.match?.invoice.id,
    relatedInvoiceNumber: txn.match?.invoice.invoiceNumber,
    actionHref: txn.status === 'EXCEPTION' || inReview ? '/reconciliation' : undefined,
    actionLabel:
      txn.status === 'EXCEPTION'
        ? 'Review in Reconciliation'
        : inReview
          ? 'Confirm match'
          : undefined,
    technical: {
      reference: refShort(txn.nombaReference),
      paymentReference: /^\d{10,}$/.test(txn.nombaEventId) ? txn.nombaEventId : undefined,
    },
  };
}

function settleEvent(txn: TxnRow): CustomerFinancialEvent | null {
  if (!txn.match) return null;
  const inv = txn.match.invoice;
  const applied = Math.min(Number(txn.amount), Number(inv.amount));

  return {
    id: `settle-${txn.match.id}`,
    type: 'INVOICE_SETTLED',
    amount: applied,
    timestamp: txn.match.createdAt.toISOString(),
    status: 'completed',
    title: 'Invoice settled',
    lines: [
      `Applied ${formatNairaInline(applied)} to ${inv.invoiceNumber}`,
      txn.match.autoMatched ? 'Matched automatically' : 'Matched after your confirmation',
    ],
    icon: '✓',
    tone: 'success',
    relatedInvoiceId: inv.id,
    relatedInvoiceNumber: inv.invoiceNumber,
    technical: {
      reference: refShort(txn.nombaReference),
    },
  };
}

/** One card per overpayment — content follows status + actionType. */
function overpaymentDispositionEvent(
  op: OverpayRow,
  invoiceNumbers: Map<string, string>,
): CustomerFinancialEvent {
  const amount = Number(op.excessAmount);
  const sourceInvoice = op.invoice.invoiceNumber;

  if (op.status === 'FAILED' && op.actionType === 'REFUND') {
    const reason = merchantFailureReason(op.failureReason);
    return {
      id: `overpay-${op.id}`,
      type: 'OVERPAYMENT_DISPOSITION',
      amount,
      timestamp: (op.resolvedAt ?? op.updatedAt).toISOString(),
      status: 'failed',
      title: 'Overpayment · Refund failed',
      lines: [reason ?? 'The refund could not be completed', `From ${sourceInvoice}`, 'Retry or choose another option in Payment Exceptions'],
      icon: '✕',
      tone: 'danger',
      relatedInvoiceId: op.invoice.id,
      relatedInvoiceNumber: sourceInvoice,
      actionHref: '/exceptions',
      actionLabel: 'Retry in Payment Exceptions',
    };
  }

  if (op.status === 'PENDING' && op.actionType === 'REFUND' && op.transferStatus === 'pending') {
    return {
      id: `overpay-${op.id}`,
      type: 'OVERPAYMENT_DISPOSITION',
      amount,
      timestamp: (op.resolvedAt ?? op.updatedAt ?? op.createdAt).toISOString(),
      status: 'pending',
      title: 'Overpayment · Refund pending',
      lines: ['Waiting for bank confirmation', `From ${sourceInvoice}`],
      icon: '⏳',
      tone: 'warning',
      relatedInvoiceId: op.invoice.id,
      relatedInvoiceNumber: sourceInvoice,
      actionHref: '/exceptions',
      actionLabel: 'View in Payment Exceptions',
      technical: op.refundReference ? { reference: refShort(op.refundReference) } : undefined,
    };
  }

  if (op.status === 'COMPLETED') {
    const ts = (op.resolvedAt ?? op.createdAt).toISOString();

    if (op.actionType === 'CREDIT_WALLET') {
      return {
        id: `overpay-${op.id}`,
        type: 'OVERPAYMENT_DISPOSITION',
        amount,
        timestamp: ts,
        status: 'completed',
        title: 'Overpayment · Wallet credited',
        lines: ['Available for future invoices', `From ${sourceInvoice}`],
        icon: '💳',
        tone: 'info',
        relatedInvoiceId: op.invoice.id,
        relatedInvoiceNumber: sourceInvoice,
      };
    }

    if (op.actionType === 'REFUND') {
      return {
        id: `overpay-${op.id}`,
        type: 'OVERPAYMENT_DISPOSITION',
        amount,
        timestamp: ts,
        status: 'completed',
        title: 'Overpayment · Refund issued',
        lines: ['Returned to the payer', `From ${sourceInvoice}`],
        icon: '↩',
        tone: 'success',
        relatedInvoiceId: op.invoice.id,
        relatedInvoiceNumber: sourceInvoice,
        technical: op.refundReference ? { reference: refShort(op.refundReference) } : undefined,
      };
    }

    if (op.actionType === 'APPLY_TO_FUTURE_INVOICE' && op.appliedToInvoiceId) {
      const target = invoiceNumbers.get(op.appliedToInvoiceId) ?? 'another invoice';
      return {
        id: `overpay-${op.id}`,
        type: 'OVERPAYMENT_DISPOSITION',
        amount,
        timestamp: ts,
        status: 'completed',
        title: 'Overpayment · Applied to invoice',
        lines: [`Applied to ${target}`, `From ${sourceInvoice}`],
        icon: '➡',
        tone: 'success',
        relatedInvoiceId: op.appliedToInvoiceId,
        relatedInvoiceNumber: target,
      };
    }
  }

  // PENDING — merchant has not finished resolving (includes default CREDIT_WALLET suggestion)
  return {
    id: `overpay-${op.id}`,
    type: 'OVERPAYMENT_DISPOSITION',
    amount,
    timestamp: op.createdAt.toISOString(),
    status: 'pending',
    title: 'Overpayment · Action required',
    lines: [
      `Excess on ${sourceInvoice}`,
      'Choose refund, wallet credit, or apply to a future invoice',
    ],
    icon: '↺',
    tone: 'violet',
    relatedInvoiceId: op.invoice.id,
    relatedInvoiceNumber: sourceInvoice,
    actionHref: '/exceptions',
    actionLabel: 'Manage in Payment Exceptions',
  };
}

function walletAppliedEvent(
  log: WalletAuditRow,
  invoiceNumbers: Map<string, string>,
): CustomerFinancialEvent | null {
  const raw = log.newValue as { appliedAmount?: number; invoiceNumber?: string } | null;
  const appliedAmount = Number(raw?.appliedAmount ?? 0);
  if (appliedAmount <= 0) return null;

  const invoiceNumber = raw?.invoiceNumber ?? invoiceNumbers.get(log.entityId) ?? 'invoice';

  return {
    id: `wallet-applied-audit-${log.id}`,
    type: 'WALLET_APPLIED',
    amount: appliedAmount,
    timestamp: log.createdAt.toISOString(),
    status: 'completed',
    title: 'Wallet credit applied',
    lines: [
      `Applied ${formatNairaInline(appliedAmount)} to ${invoiceNumber}`,
      'Remaining balance is due via payment account',
    ],
    icon: '➡',
    tone: 'success',
    relatedInvoiceId: log.entityId,
    relatedInvoiceNumber: invoiceNumber,
  };
}

export function buildCustomerFinancialEvents(input: {
  transactions: TxnRow[];
  overpaymentActions: OverpayRow[];
  invoiceNumbers: Map<string, string>;
  walletAppliedLogs?: WalletAuditRow[];
}): CustomerFinancialEvent[] {
  const events: CustomerFinancialEvent[] = [];

  for (const txn of input.transactions) {
    events.push(paymentEvent(txn));
    const settled = settleEvent(txn);
    if (settled) events.push(settled);
  }

  for (const op of input.overpaymentActions) {
    events.push(overpaymentDispositionEvent(op, input.invoiceNumbers));
  }

  for (const log of input.walletAppliedLogs ?? []) {
    const evt = walletAppliedEvent(log, input.invoiceNumbers);
    if (evt) events.push(evt);
  }

  events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  return events;
}

/** Derived fields merchants need on every invoice row. */
export function enrichInvoiceAmounts<T extends { amount: unknown; amountPaid?: unknown | null }>(
  invoice: T,
) {
  const amount = Number(invoice.amount);
  const amountPaid = Number(invoice.amountPaid ?? 0);
  const amountDue = Math.max(amount - amountPaid, 0);
  return {
    ...invoice,
    amount,
    amountPaid,
    amountDue,
    collectViaPaymentAccount: amountDue,
  };
}
