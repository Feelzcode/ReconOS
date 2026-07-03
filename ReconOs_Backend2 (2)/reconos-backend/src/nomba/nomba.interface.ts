// src/nomba/nomba.interface.ts
// Both MockNombaProvider and NombaProvider implement this interface.
// Swapping providers on onboarding day = changing ONE line in nomba.module.ts

export interface CreateVirtualAccountDto {
  customerName: string;
  customerId: string;
  organizationId: string;
  subAccountId?: string;   // merchant's Nomba sub-account — overrides env default
  accountRef?: string;     // stable reference for later lookup — defaults to customerId if not given
  expiryDate?: string;     // ISO date string; omit for a permanent VA
  expectedAmount?: number; // in Naira — if set, locks the expected amount on Nomba's side (does NOT block over/under payment at the bank rail level, per Nomba docs)
}

export interface VirtualAccountResponse {
  accountNumber: string;
  accountName: string;
  bankName: string;
  nombaAccountId: string;
}

export interface VerifyTransactionDto {
  reference: string;
}

export interface TransactionVerificationResponse {
  reference: string;
  amount: number;
  status: string;
  payerName: string;
  payerAccount: string;
  timestamp: string;
}

// ── TRANSFERS API ─────────────────────────────────────────────────────────
// Used for: refunding overpayments back to the customer's bank account
export interface InitiateTransferDto {
  amount: number;                // amount in Naira
  destinationAccountNumber: string;
  destinationBankCode: string;
  destinationAccountName: string;
  senderName?: string;          // shown on the recipient's bank statement — defaults to "ReconOs" if omitted
  narration: string;             // e.g. "Refund for overpayment on INV-0247"
  reference: string;             // unique idempotency reference
}

export interface TransferResponse {
  reference: string;
  status: 'successful' | 'pending' | 'failed';
  amount: number;
  destinationAccountNumber: string;
  destinationAccountName: string;
  narration: string;
  timestamp: string;
}

export interface FetchVirtualTransactionsDto {
  virtualAccountNumber: string;
  dateFrom: string;
  dateTo: string;
  limit?: number;
  cursor?: string;
}

export interface FetchVirtualTransactionsResponse {
  transactions: Record<string, unknown>[];
  nextCursor?: string;
  hasMore: boolean;
}

export interface FetchAccountTransactionsDto {
  subAccountId?: string;
  dateFrom: string;
  dateTo: string;
  limit?: number;
  cursor?: string;
}

export interface CreateSubAccountDto {
  accountName: string;
  accountRef: string;
}

export interface SubAccountResponse {
  id: string;
  accountName: string;
  accountRef: string;
  currency?: string;
}

export interface SubAccountBalanceResponse {
  subAccountId: string;
  availableBalance: number; // Naira
  currency: string;
}

export interface BankLookupDto {
  bankCode: string;
  accountNumber: string;
  subAccountId?: string;
}

export interface BankLookupResponse {
  accountName: string;
  accountNumber: string;
  bankCode: string;
}

export interface InitiateSubAccountTransferDto extends InitiateTransferDto {
  subAccountId: string;
}

export interface NombaProvider {
  createVirtualAccount(dto: CreateVirtualAccountDto): Promise<VirtualAccountResponse>;
  createSubAccount(dto: CreateSubAccountDto): Promise<SubAccountResponse>;
  listSubAccounts(): Promise<SubAccountResponse[]>;
  getSubAccountBalance(subAccountId: string): Promise<SubAccountBalanceResponse>;
  lookupBankAccount(dto: BankLookupDto): Promise<BankLookupResponse>;
  verifyTransaction(dto: VerifyTransactionDto): Promise<TransactionVerificationResponse>;
  verifyTransactionForRefund(
    reference: string,
    sessionId?: string,
  ): Promise<TransactionVerificationResponse>;
  verifyWebhookSignature(payload: unknown, signature: string, timestamp?: string): boolean;
  initiateTransfer(dto: InitiateTransferDto): Promise<TransferResponse>;
  initiateTransferFromSubAccount(dto: InitiateSubAccountTransferDto): Promise<TransferResponse>;
  checkTransferStatus(merchantTxRef: string): Promise<TransferResponse>;
  fetchVirtualAccountTransactions(
    dto: FetchVirtualTransactionsDto,
  ): Promise<FetchVirtualTransactionsResponse>;
  fetchSubAccountTransactions(
    dto: FetchAccountTransactionsDto,
  ): Promise<FetchVirtualTransactionsResponse>;
  requeryTransaction(sessionId: string): Promise<TransactionVerificationResponse>;
  requerySessionRaw(sessionId: string): Promise<Record<string, unknown> | null>;
}

export const NOMBA_PROVIDER = 'NOMBA_PROVIDER';

// ── CURRENCY UNIT CONVERSION ────────────────────────────────────────────
// Nomba's API speaks in kobo (smallest unit), e.g. their docs show
// `amount: 1000000` annotated as "₦10,000.00". Every other part of
// ReconOs — the database, the reconciliation engine, the dashboard —
// works in plain Naira decimals, since that's what merchants think in
// and what Decimal(12,2) columns are designed for. These two helpers are
// the ONLY place that conversion should happen — at the real provider's
// API boundary, not scattered through business logic.
export function nairaToKobo(naira: number): number {
  return Math.round(naira * 100);
}

export function koboToNaira(kobo: number): number {
  return kobo / 100;
}
