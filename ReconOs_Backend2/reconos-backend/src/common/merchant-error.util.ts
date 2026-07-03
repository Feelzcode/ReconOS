/** Merchant-safe error text — never expose raw Nomba JSON or API paths. */

function rawMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

/** Pull a short code from embedded Nomba JSON, e.g. INSUFFICIENT_BALANCE. */
function nombaCodeFromMessage(msg: string): string | undefined {
  const desc = msg.match(/"description"\s*:\s*"([^"]+)"/i)?.[1];
  if (desc) return desc;
  const code = msg.match(/"code"\s*:\s*"([^"]+)"/i)?.[1];
  return code && code !== '400' ? code : undefined;
}

export function merchantRefundFailureMessage(err: unknown): string {
  const msg = rawMessage(err);
  const code = nombaCodeFromMessage(msg) ?? msg;

  if (/INSUFFICIENT/i.test(code) || /insufficient/i.test(msg)) {
    return 'Not enough balance in the payout account to send this refund. Use Credit Wallet instead, or try again later.';
  }
  if (/not_found/i.test(msg) || /could not be confirmed/i.test(msg)) {
    return 'The original payment could not be verified. Please try again in a few moments.';
  }
  if (/verify|verification/i.test(msg)) {
    return 'The original payment could not be verified before refunding. Please try again.';
  }
  if (/account not found|lookup/i.test(msg)) {
    return 'Could not verify the refund destination account. Check the bank details and try again.';
  }
  if (/nomba|transfer api/i.test(msg)) {
    return 'The refund transfer could not be completed right now. Please try again or use Credit Wallet.';
  }
  return 'The refund could not be completed. Please try again or use Credit Wallet.';
}
