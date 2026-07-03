import { koboToNaira } from './nomba.interface';
import { NormalizedPaymentWebhook } from './nomba-webhook.util';

/** Nomba returns Naira decimals in VA/bank/requery rows; kobo only on some legacy fields. */
export function parseNombaApiAmount(payload: {
  amount?: unknown;
  transactionAmount?: unknown;
}): number {
  if (payload.transactionAmount != null) return Number(payload.transactionAmount);
  const raw = Number(payload.amount ?? 0);
  const rawStr = String(payload.amount ?? '');
  // "100.0" or amounts under ₦10,000 are Naira; large integers are kobo.
  if (rawStr.includes('.') || (raw > 0 && raw < 10000)) return raw;
  return koboToNaira(raw);
}

/** Raw row shape from GET /transactions/virtual (fields vary by Nomba version). */
export type NombaVirtualTransactionRow = Record<string, unknown>;

export function normalizeNombaVirtualTransaction(
  item: NombaVirtualTransactionRow,
  virtualAccountNumber: string,
): NormalizedPaymentWebhook | null {
  const status = String(
    item.status ?? item.transactionStatus ?? item.responseCode ?? 'successful',
  ).toLowerCase();

  const settledStatuses = ['successful', 'success', 'completed', '00', '0', 'SUCCESS'];
  const statusUpper = status.toUpperCase();
  if (status && !settledStatuses.includes(status) && statusUpper !== 'SUCCESS') {
    return null;
  }

  const eventId = String(
    item.sessionId ?? item.transactionId ?? item.id ?? item.reference ?? '',
  );
  if (!eventId) return null;

  const reference = String(
    item.transactionId ?? item.reference ?? item.merchantTxRef ?? eventId,
  );

  const rawAmount = item.transactionAmount ?? item.amount;
  if (rawAmount == null) return null;

  const amount = parseNombaApiAmount({
    amount: item.amount,
    transactionAmount: item.transactionAmount,
  });

  if (!Number.isFinite(amount) || amount <= 0) return null;

  const payer =
    (item.payer as Record<string, unknown> | undefined) ??
    (item.customer as Record<string, unknown> | undefined);

  const accountNumber = String(
    item.recipientAccountNumber ??
      item.virtualAccount ??
      item.aliasAccountNumber ??
      item.accountNumber ??
      virtualAccountNumber,
  );

  const paymentDateRaw =
    item.time ?? item.timestamp ?? item.createdAt ?? item.transactionDate ?? item.timeCreated;

  return {
    kind: 'payment',
    eventId,
    accountNumber,
    reference,
    amount,
    payerName: String(
      item.senderName ?? payer?.name ?? payer?.senderName ?? '',
    ) || undefined,
    payerAccount: String(
      item.senderAccountNumber ?? payer?.accountNumber ?? '',
    ) || undefined,
    payerBankCode: String(payer?.bankCode ?? '') || undefined,
    payerBankName: String(payer?.bankName ?? item.senderBankName ?? '') || undefined,
    paymentDate: new Date(
      typeof paymentDateRaw === 'string' || typeof paymentDateRaw === 'number'
        ? paymentDateRaw
        : Date.now(),
    ),
    rawData: { ...item, _syncSource: item._syncSource ?? 'transactions/virtual' },
  };
}

export function formatNombaDate(d: Date): string {
  return d.toISOString().split('T')[0];
}

/** Whether Nomba considers an inbound payment settled (webhook, requery, or verify). */
export function isNombaPaymentSettled(status: string | null | undefined): boolean {
  const s = String(status ?? '').toLowerCase();
  return ['successful', 'success', 'completed', '00', '0'].includes(s);
}

/** Extract session ID from a stored transaction row for Nomba requery. */
export function sessionIdFromTransaction(tx: {
  nombaEventId?: string | null;
  rawWebhookData?: unknown;
}): string | undefined {
  if (tx.nombaEventId && /^\d{10,}$/.test(tx.nombaEventId)) {
    return tx.nombaEventId;
  }
  const raw = tx.rawWebhookData as Record<string, unknown> | null | undefined;
  const nested = raw?.transaction as Record<string, unknown> | undefined;
  const sessionId = nested?.sessionId ?? raw?.sessionId;
  return sessionId ? String(sessionId) : undefined;
}

/** Resolve the student VA from a Nomba transaction row (webhook, sync, or sub-account list). */
export function extractVaFromNombaRow(row: Record<string, unknown>): string {
  return String(
    row.recipientAccountNumber ??
      row.aliasAccountNumber ??
      row.virtualAccount ??
      row.accountNumber ??
      '',
  );
}
