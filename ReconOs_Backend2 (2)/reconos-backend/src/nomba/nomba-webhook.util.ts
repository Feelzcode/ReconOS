import * as crypto from 'crypto';

/** Official Nomba webhook shape (developer.nomba.com/docs/api-basics/webhook) */
export interface NombaWebhookPayload {
  event_type?: string;
  event?: string;
  requestId?: string;
  request_id?: string;
  data?: {
    merchant?: {
      userId?: string;
      walletId?: string;
      walletBalance?: number;
    };
    terminal?: Record<string, unknown>;
    transaction?: {
      aliasAccountNumber?: string;
      aliasAccountName?: string;
      aliasAccountReference?: string;
      aliasAccountType?: string;
      transactionId?: string;
      transactionAmount?: number;
      type?: string;
      time?: string;
      responseCode?: string;
      narration?: string;
      fee?: number;
      sessionId?: string;
      merchantTxRef?: string;
    };
    customer?: {
      senderName?: string;
      accountNumber?: string;
      bankCode?: string;
      bankName?: string;
    };
    id?: string;
    amount?: number;
    reference?: string;
    timestamp?: string;
    account?: { accountNumber?: string; accountName?: string; bankName?: string };
    payer?: {
      name?: string;
      accountNumber?: string;
      bankCode?: string;
      bankName?: string;
    };
  };
}

export interface NormalizedPaymentWebhook {
  kind: 'payment';
  eventId: string;
  accountNumber: string;
  reference: string;
  amount: number;
  payerName?: string;
  payerAccount?: string;
  payerBankCode?: string;
  payerBankName?: string;
  paymentDate: Date;
  rawData: unknown;
}

export interface NormalizedPayoutWebhook {
  kind: 'payout';
  eventType: 'payout_success' | 'payout_failed' | 'payout_refund';
  eventId: string;
  merchantTxRef?: string;
  transactionId?: string;
  rawData: unknown;
}

export type NormalizedWebhook = NormalizedPaymentWebhook | NormalizedPayoutWebhook;

/** All Nomba identifiers for one payment (session ID, transaction ID, request ID). */
export function collectNombaPaymentIds(payment: NormalizedPaymentWebhook): string[] {
  const ids = new Set<string>();
  if (payment.eventId) ids.add(payment.eventId);
  if (payment.reference) ids.add(payment.reference);

  const raw = payment.rawData as Record<string, unknown> | undefined;
  const tx = raw?.transaction as Record<string, unknown> | undefined;
  if (tx?.sessionId) ids.add(String(tx.sessionId));
  if (tx?.transactionId) ids.add(String(tx.transactionId));

  return [...ids].filter((id) => id.length > 0);
}

export function buildNombaSigningString(
  payload: NombaWebhookPayload,
  timestamp: string,
): string | null {
  const eventType = payload.event_type ?? payload.event;
  const requestId = payload.requestId ?? payload.request_id;
  const merchant = payload.data?.merchant;
  const tx = payload.data?.transaction;

  if (
    !eventType ||
    !requestId ||
    !merchant?.userId ||
    !merchant?.walletId ||
    !tx?.transactionId ||
    !tx?.type ||
    !tx?.time ||
    !timestamp
  ) {
    return null;
  }

  let responseCode = tx.responseCode ?? '';
  if (responseCode === 'null') responseCode = '';

  return [
    eventType,
    requestId,
    merchant.userId,
    merchant.walletId,
    tx.transactionId,
    tx.type,
    tx.time,
    responseCode,
    timestamp,
  ].join(':');
}

export function verifyNombaWebhookSignature(
  payload: NombaWebhookPayload,
  signature: string,
  timestamp: string,
  secret: string,
): boolean {
  if (!secret?.trim() || !signature?.trim() || !timestamp?.trim()) {
    return false;
  }

  const signingString = buildNombaSigningString(payload, timestamp);
  if (!signingString) {
    return false;
  }

  const expected = crypto.createHmac('sha256', secret).update(signingString).digest('base64');

  try {
    const received = Buffer.from(signature.trim(), 'base64');
    const computed = Buffer.from(expected, 'base64');
    if (received.length !== computed.length) {
      return false;
    }
    return crypto.timingSafeEqual(received, computed);
  } catch {
    return signature.trim() === expected;
  }
}

export function normalizeNombaWebhook(payload: NombaWebhookPayload): NormalizedWebhook | null {
  const eventType = (payload.event_type ?? payload.event ?? '').toLowerCase();

  if (eventType === 'payment_success' || eventType === 'payment.received') {
    return normalizePayment(payload, eventType);
  }

  if (
    eventType === 'payout_success' ||
    eventType === 'payout_failed' ||
    eventType === 'payout_refund'
  ) {
    return normalizePayout(payload, eventType);
  }

  return null;
}

function normalizePayment(
  payload: NombaWebhookPayload,
  eventType: string,
): NormalizedPaymentWebhook | null {
  const data = payload.data;
  if (!data) return null;

  if (eventType === 'payment_success') {
    const tx = data.transaction;
    const customer = data.customer;
    const eventId = tx?.sessionId ?? payload.requestId ?? payload.request_id;
    const accountNumber = tx?.aliasAccountNumber;
    const amount = tx?.transactionAmount;

    if (!eventId || !accountNumber || amount == null) return null;

    return {
      kind: 'payment',
      eventId,
      accountNumber,
      reference: tx?.transactionId ?? eventId,
      amount: Number(amount),
      payerName: customer?.senderName,
      payerAccount: customer?.accountNumber,
      payerBankCode: customer?.bankCode,
      payerBankName: customer?.bankName,
      paymentDate: new Date(tx?.time ?? Date.now()),
      rawData: data,
    };
  }

  const eventId = data.id;
  const accountNumber = data.account?.accountNumber;
  const rawAmountKobo = data.amount;

  if (!eventId || !accountNumber || rawAmountKobo == null) return null;

  return {
    kind: 'payment',
    eventId,
    accountNumber,
    reference: data.reference ?? eventId,
    amount: Number(rawAmountKobo) / 100,
    payerName: data.payer?.name,
    payerAccount: data.payer?.accountNumber,
    payerBankCode: data.payer?.bankCode,
    payerBankName: data.payer?.bankName,
    paymentDate: new Date(data.timestamp ?? Date.now()),
    rawData: data,
  };
}

function normalizePayout(
  payload: NombaWebhookPayload,
  eventType: string,
): NormalizedPayoutWebhook | null {
  const data = payload.data;
  const tx = data?.transaction;
  const eventId = payload.requestId ?? payload.request_id;

  if (!eventId) return null;

  return {
    kind: 'payout',
    eventType: eventType as NormalizedPayoutWebhook['eventType'],
    eventId,
    merchantTxRef: tx?.merchantTxRef ?? tx?.aliasAccountReference ?? tx?.transactionId,
    transactionId: tx?.transactionId,
    rawData: data,
  };
}
