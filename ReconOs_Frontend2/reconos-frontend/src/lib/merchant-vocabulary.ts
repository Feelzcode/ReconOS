// Merchant-facing copy only — internal field names, audit actions, and stored
// match reasons stay unchanged in the API/DB; call these helpers when rendering.

const REPLACEMENTS: Array<[RegExp, string]> = [
  [/\bdedicated virtual account\b/gi, 'dedicated payment account'],
  [/\bvirtual account\b/gi, 'dedicated payment account'],
  [/\bon VA\b/gi, 'on dedicated payment account'],
  [/\bwebhook\b/gi, 'payment notification'],
  [/\bHMAC\b/g, 'Verified'],
  [/\bsession ID\b/gi, 'payment reference'],
  [/\btransaction sync\b/gi, 'background sync'],
  [/\breconciliation engine\b/gi, 'automatic matching'],
  [/\breview queue\b/gi, 'payments awaiting review'],
  [/\bTRANSACTION_SYNC_RECOVERED\b/g, 'Recovered during background sync'],
  [/\bPAYMENT_RECOVERED\b/g, 'Payment recovered'],
];

/** Translate internal/system text for merchant UI. */
export function toMerchantText(text: string | null | undefined): string {
  if (!text) return '';
  return REPLACEMENTS.reduce((out, [pattern, replacement]) => out.replace(pattern, replacement), text);
}

/** Score breakdown row labels — maps internal signals to merchant language. */
export const SCORE_SIGNAL_LABELS = {
  amount: 'Amount matched',
  customer: 'Dedicated payment account',
  time: 'Payment received within expected period',
  reference: 'Payment reference provided',
} as const;

export function confidenceDisplayLabel(score: number): string {
  if (score >= 90) return 'High match confidence';
  if (score >= 70) return 'Medium match confidence';
  return 'Review match confidence';
}

/** Strip infrastructure/provider details from API errors shown to merchants. */
export function sanitizeMerchantError(
  message: string | null | undefined,
  fallback = 'Something went wrong. Please try again.',
): string {
  if (!message?.trim()) return fallback;
  const m = message.trim();
  if (/^internal server error$/i.test(m)) return fallback;
  if (/insufficient.*balance/i.test(m)) {
    return 'Insufficient cleared balance for this transfer. Try a smaller amount — transfer fees apply.';
  }
  if (/nomba|sandbox\.nomba|hmac|webhook|ENOTFOUND|getaddrinfo|NOMBA_/i.test(m)) {
    if (/timeout|unavailable|fetch failed|ENOTFOUND|getaddrinfo|sandbox/i.test(m)) {
      return 'Payment services are temporarily unavailable. Please try again in a few moments.';
    }
    if (/virtual account|payment account|provisioning|limit reached/i.test(m)) {
      return 'Unable to create payment account. Please try again in a few moments.';
    }
    if (/verify|lookup|recipient|transfer/i.test(m)) {
      return 'Unable to complete the transfer. Check the account details and try again.';
    }
    return fallback;
  }
  return m;
}

/** Merchant-safe failure text for overpayment refund / verify errors shown in UI. */
export function sanitizeOverpaymentFailure(
  message: string | null | undefined,
  fallback = 'This action could not be completed. Please try again.',
): string {
  if (!message?.trim()) return fallback;
  const m = message.trim();

  if (/insufficient/i.test(m) || /INSUFFICIENT_BALANCE/i.test(m)) {
    return 'Not enough balance in the payout account to send this refund. Use Credit Wallet instead, or try again later.';
  }
  if (/not_found/i.test(m) || /could not be confirmed/i.test(m)) {
    return 'The original payment could not be verified. Please try again in a few moments.';
  }
  if (/nomba transfer api|transfer api error/i.test(m) || /\{"code"/.test(m)) {
    return sanitizeMerchantError(m, 'The refund transfer could not be completed. Try Credit Wallet or try again later.');
  }
  return sanitizeMerchantError(m, fallback);
}

/** Read Nest/axios error payload into a single merchant-safe string. */
export function apiErrorMessage(
  err: { response?: { data?: { message?: string | string[] } } } | null | undefined,
  fallback: string,
): string {
  const raw = err?.response?.data?.message;
  const message = Array.isArray(raw) ? raw.join('. ') : raw;
  return sanitizeMerchantError(message, fallback);
}
