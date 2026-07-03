/** Ops/infrastructure events — hidden from merchant Activity feed. */
export const OPS_ONLY_ACTIONS = new Set([
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

export function isMerchantActivityAction(action: string): boolean {
  return !OPS_ONLY_ACTIONS.has(action);
}
