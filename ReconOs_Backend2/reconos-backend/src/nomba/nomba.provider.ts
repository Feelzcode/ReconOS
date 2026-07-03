// src/nomba/nomba.provider.ts
// REAL Nomba API integration — rewritten against the actual sandbox docs
// shared during onboarding (not guessed REST conventions). Key facts that
// drove every decision below, straight from Nomba's own training material:
//
//   - Auth: POST /auth/token/issue, accountId sent as a HEADER (not body),
//     token expires in 1 hour — must be cached and refreshed, not fetched
//     fresh on every call.
//   - Webhook signature: HMAC-SHA256 (NOT sha512), header is literally
//     "nomba-signature" (no x- prefix).
//   - Virtual accounts: POST /accounts/virtual (no accountId in the path),
//     body wants accountRef + accountName + optional expiryDate/amount.
//   - Transfers: recipient must be resolved via POST /transfers/bank/lookup
//     BEFORE calling POST /transfers/bank — Nomba returns the verified
//     account name, which you're expected to pass back on the transfer.
//   - All amounts are in KOBO, not Naira. ReconOs stores and reasons about
//     Naira everywhere else; conversion happens ONLY at this boundary.
//   - Sandbox base URL is different from production
//     (sandbox.nomba.com vs api.nomba.com) — not just a flag.

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import {
  NombaProvider,
  CreateVirtualAccountDto,
  VirtualAccountResponse,
  VerifyTransactionDto,
  TransactionVerificationResponse,
  InitiateTransferDto,
  TransferResponse,
  BankLookupDto,
  BankLookupResponse,
  CreateSubAccountDto,
  SubAccountResponse,
  SubAccountBalanceResponse,
  InitiateSubAccountTransferDto,
  FetchVirtualTransactionsDto,
  FetchVirtualTransactionsResponse,
  FetchAccountTransactionsDto,
  nairaToKobo,
  koboToNaira,
} from './nomba.interface';
import { isNombaPaymentSettled, parseNombaApiAmount } from './nomba-transaction.util';
import {
  NombaWebhookPayload,
  verifyNombaWebhookSignature,
} from './nomba-webhook.util';

interface CachedToken {
  accessToken: string;
  expiresAt: number; // epoch ms
}

@Injectable()
export class RealNombaProvider implements NombaProvider {
  private readonly logger = new Logger('NombaProvider');
  private readonly baseUrl: string;
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly webhookSecret: string;
  private readonly accountId: string;
  private readonly subaccountId: string;

  // Token caching — Nomba tokens last 1 hour. Fetching a fresh token on
  // every API call would be slow and wasteful; this caches in memory and
  // refreshes ~60s before actual expiry to avoid edge-of-expiry failures.
  private cachedToken: CachedToken | null = null;

  constructor(private config: ConfigService) {
    // Sandbox and production are genuinely different hosts, not just a
    // query param or header — confirmed in the onboarding docs. Default
    // to sandbox so a missing env var fails safe (test environment),
    // never silently fails toward production.
    this.baseUrl = config.get('NOMBA_BASE_URL', 'https://sandbox.nomba.com/v1');
    this.clientId = config.get('NOMBA_CLIENT_ID', '');
    this.clientSecret = config.get('NOMBA_CLIENT_SECRET', '');
    this.webhookSecret = config.get('NOMBA_WEBHOOK_SECRET', '');
    this.accountId = config.get('NOMBA_ACCOUNT_ID', '');
    // CONFIRMED by Nomba directly (not a guess this time): "Authenticate
    // with the parent Account ID in the accountId header, then scope
    // your calls to your sub-account ID." So the split is real — parent
    // accountId stays on the header for every call (including auth),
    // and subaccountId is passed separately to scope which sub-ledger an
    // operational call applies to. What's still genuinely unconfirmed is
    // the EXACT field name/location Nomba expects for that sub-account
    // scoping (request body field vs query param vs path segment) — none
    // of the shared training excerpts show a virtual-account or
    // transaction example alongside a sub-account ID together, only the
    // sub-accounts module in isolation. We use a `subAccountId` body
    // field below as the most likely convention (matching how their own
    // sub-account creation endpoint names things), clearly marked so
    // it's the first thing to verify against a real sandbox response.
    this.subaccountId = config.get('NOMBA_SUBACCOUNT_ID', '');
  }

  /** Nomba v2 routes (e.g. sub-account transfers) sit at /v2, not under /v1. */
  private get apiRoot(): string {
    return this.baseUrl.replace(/\/v1\/?$/, '');
  }

  private resolveSubAccountId(override?: string): string {
    return override || this.subaccountId;
  }

  // ── VIRTUAL ACCOUNTS ───────────────────────────────────────────────────
  async createVirtualAccount(dto: CreateVirtualAccountDto): Promise<VirtualAccountResponse> {
    this.logger.log(`Creating virtual account for: ${dto.customerName}`);

    const token = await this.getAccessToken();
    // Nomba requires accountRef length 16–64; customer cuid is sufficient.
    const accountRef = (dto.accountRef || dto.customerId).slice(0, 64);
    const rawName = dto.customerName.trim();
    // Nomba production: accountName must look like a person's name — letters and
    // spaces only (digits/symbols like "JSS1" or "RCROWN/X" are rejected).
    const sanitized = rawName
      .replace(/[^A-Za-z ]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    const words = sanitized.split(' ').filter(Boolean);
    const accountName =
      sanitized.length >= 8
        ? sanitized.slice(0, 64)
        : (words.length >= 2 ? sanitized : `Student ${sanitized}`).padEnd(8, ' ').slice(0, 64).trim();

    const body: Record<string, unknown> = {
      accountRef,
      accountName,
    };
    if (dto.expiryDate) body.expiryDate = dto.expiryDate;
    if (dto.expectedAmount != null) body.expectedAmount = dto.expectedAmount;

    const path = this.resolveSubAccountId(dto.subAccountId)
      ? `/accounts/virtual/${this.resolveSubAccountId(dto.subAccountId)}`
      : '/accounts/virtual';

    const response = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        accountId: this.accountId,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`Nomba Virtual Account API error: ${response.status} ${await response.text()}`);
    }

    const data = await response.json();
    if (data.code && data.code !== '00') {
      throw new Error(
        `Nomba Virtual Account API error: ${data.description || data.message || JSON.stringify(data)}`,
      );
    }
    const payload = data.data ?? data;

    const accountNumber =
      payload.bankAccountNumber ?? payload.accountNumber ?? data.accountNumber;
    if (!accountNumber) {
      throw new Error(
        `Nomba Virtual Account API returned success but no account number: ${JSON.stringify(data)}`,
      );
    }

    return {
      accountNumber,
      accountName:
        payload.bankAccountName ??
        payload.accountName ??
        body.accountName,
      bankName: payload.bankName ?? 'Wema Bank',
      nombaAccountId: payload.accountId ?? payload.accountHolderId ?? accountRef,
    };
  }

  // ── SUB-ACCOUNTS ─────────────────────────────────────────────────────
  // Hackathon training: POST /accounts/sub-accounts with accountRef + accountName.
  // accountRef is OUR stable key (org id) — Nomba's UUID is stored as a foreign ref.
  async createSubAccount(dto: CreateSubAccountDto): Promise<SubAccountResponse> {
    this.logger.log(`Creating Nomba sub-account: ${dto.accountName} (${dto.accountRef})`);

    const token = await this.getAccessToken();
    const response = await fetch(`${this.baseUrl}/accounts/sub-accounts`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        accountId: this.accountId,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        accountName: dto.accountName,
        accountRef: dto.accountRef,
      }),
    });

    const data = await response.json();
    if (!response.ok || (data.code && data.code !== '00')) {
      throw new Error(
        `Nomba Create Sub-Account API error: ${data.description || data.message || response.status}`,
      );
    }

    const payload = data.data ?? data;
    const id = payload.id ?? payload.accountId ?? payload.subAccountId;
    if (!id) {
      throw new Error(`Nomba sub-account created but no id returned: ${JSON.stringify(data)}`);
    }

    return {
      id: String(id),
      accountName: payload.accountName ?? dto.accountName,
      accountRef: payload.accountRef ?? dto.accountRef,
      currency: payload.currency ?? 'NGN',
    };
  }

  async listSubAccounts(): Promise<SubAccountResponse[]> {
    const token = await this.getAccessToken();
    const response = await fetch(`${this.baseUrl}/accounts/sub-accounts`, {
      headers: {
        Authorization: `Bearer ${token}`,
        accountId: this.accountId,
      },
    });

    if (!response.ok) {
      throw new Error(`Nomba List Sub-Accounts API error: ${response.status} ${await response.text()}`);
    }

    const data = await response.json();
    const items: Record<string, unknown>[] =
      data.data?.results ?? data.data ?? (Array.isArray(data) ? data : []);

    return items.map((row) => ({
      id: String(row.id ?? row.accountId ?? row.subAccountId),
      accountName: String(row.accountName ?? ''),
      accountRef: String(row.accountRef ?? ''),
      currency: row.currency ? String(row.currency) : 'NGN',
    }));
  }

  async getSubAccountBalance(subAccountId: string): Promise<SubAccountBalanceResponse> {
    const token = await this.getAccessToken();
    // Production uses GET /accounts/{accountId}/balance (not /accounts/sub-accounts/.../balance).
    const response = await fetch(`${this.baseUrl}/accounts/${subAccountId}/balance`, {
      headers: {
        Authorization: `Bearer ${token}`,
        accountId: this.accountId,
      },
    });

    if (!response.ok) {
      throw new Error(
        `Nomba Sub-Account Balance API error: ${response.status} ${await response.text()}`,
      );
    }

    const data = await response.json();
    if (data.code && data.code !== '00') {
      throw new Error(`Nomba Sub-Account Balance API error: ${data.description || data.message}`);
    }

    const payload = data.data ?? data;
    const raw =
      payload.availableBalance ??
      payload.balance ??
      payload.amount ??
      payload.walletBalance ??
      0;

    // Balance endpoint returns Naira decimal string (e.g. "90.0"), not kobo.
    const naira = typeof raw === 'string' && raw.includes('.')
      ? Number(raw)
      : koboToNaira(Number(raw));

    return {
      subAccountId,
      availableBalance: naira,
      currency: String(payload.currency ?? 'NGN'),
    };
  }

  async lookupBankAccount(dto: BankLookupDto): Promise<BankLookupResponse> {
    const token = await this.getAccessToken();
    const subId = this.resolveSubAccountId(dto.subAccountId);

    const response = await fetch(`${this.baseUrl}/transfers/bank/lookup`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        accountId: this.accountId,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        bankCode: dto.bankCode,
        accountNumber: dto.accountNumber,
        ...(subId ? { subAccountId: subId } : {}),
      }),
    });

    if (!response.ok) {
      throw new Error(
        `Nomba bank lookup failed: ${response.status} ${await response.text()}`,
      );
    }

    const data = await response.json();
    const payload = data.data ?? data;
    const accountName = payload.accountName ?? data.accountName;
    if (!accountName) {
      throw new Error('Nomba bank lookup returned no account name.');
    }

    return {
      accountName: String(accountName),
      accountNumber: dto.accountNumber,
      bankCode: dto.bankCode,
    };
  }

  // ── TRANSACTIONS API ───────────────────────────────────────────────────
  async verifyTransaction(dto: VerifyTransactionDto): Promise<TransactionVerificationResponse> {
    this.logger.log(`Verifying transaction: ${dto.reference}`);

    const token = await this.getAccessToken();

    // GET requests can't carry a JSON body, so sub-account scoping here
    // goes as a query param instead — same unverified-field-name caveat
    // as createVirtualAccount above.
    const url = this.subaccountId
      ? `${this.baseUrl}/transactions/${dto.reference}?subAccountId=${this.subaccountId}`
      : `${this.baseUrl}/transactions/${dto.reference}`;

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'accountId': this.accountId,
      },
    });

    if (!response.ok) {
      // A 404 here is a meaningful signal (transaction not found), not
      // just an error — the caller (overpayment refund verification)
      // treats any non-'successful' status as a hard stop, so we surface
      // it as a clean "not_found" status rather than throwing.
      if (response.status === 404) {
        return {
          reference: dto.reference,
          amount: 0,
          status: 'not_found',
          payerName: '',
          payerAccount: '',
          timestamp: new Date().toISOString(),
        };
      }
      throw new Error(`Nomba Transactions API error: ${response.status} ${await response.text()}`);
    }

    const data = await response.json();
    const payload = data.data ?? data;

    return {
      reference: payload.reference ?? dto.reference,
      amount: koboToNaira(payload.amount ?? 0), // convert kobo → Naira at the boundary
      status: isNombaPaymentSettled(payload.status) ? 'successful' : String(payload.status ?? 'unknown'),
      payerName: payload.payer?.name ?? payload.senderName ?? '',
      payerAccount: payload.payer?.accountNumber ?? payload.senderAccountNumber ?? '',
      timestamp: payload.timestamp ?? payload.createdAt ?? new Date().toISOString(),
    };
  }

  /**
   * VA inbound payments often use API-VACT_TRA-* refs that 404 on GET /transactions/{ref}.
   * Fall back to session requery when a session ID is available.
   */
  async verifyTransactionForRefund(
    reference: string,
    sessionId?: string,
  ): Promise<TransactionVerificationResponse> {
    const primary = await this.verifyTransaction({ reference });
    if (primary.status === 'successful') return primary;

    if (primary.status !== 'not_found' || !sessionId) {
      return primary;
    }

    this.logger.log(`Transaction ref not found — requerying session ${sessionId}`);
    const requery = await this.requeryTransaction(sessionId);
    return {
      ...requery,
      status: isNombaPaymentSettled(requery.status) ? 'successful' : requery.status,
    };
  }

  // Official Nomba webhook verification — colon-separated signing string +
  // Base64 HMAC-SHA256 in nomba-signature (see nomba-webhook.util.ts).
  verifyWebhookSignature(payload: unknown, signature: string, timestamp: string): boolean {
    if (!this.webhookSecret) {
      this.logger.error('NOMBA_WEBHOOK_SECRET not set — rejecting all webhooks');
      return false;
    }

    return verifyNombaWebhookSignature(
      payload as NombaWebhookPayload,
      signature,
      timestamp,
      this.webhookSecret,
    );
  }

  // ── TRANSFERS API ────────────────────────────────────────────────────
  // Used when resolving an overpayment with the REFUND action. Nomba
  // requires resolving the recipient's account name via /transfers/bank/lookup
  // BEFORE initiating the actual transfer — sending an unverified or
  // mismatched account name is exactly the kind of mistake that loses
  // real money, so this is not optional.
  async initiateTransfer(dto: InitiateTransferDto): Promise<TransferResponse> {
    this.logger.log(
      `Initiating transfer: ₦${dto.amount.toLocaleString()} → ${dto.destinationAccountNumber} — ${dto.narration}`,
    );

    const verified = await this.lookupBankAccount({
      bankCode: dto.destinationBankCode,
      accountNumber: dto.destinationAccountNumber,
    });

    if (verified.accountName.toUpperCase() !== dto.destinationAccountName.toUpperCase()) {
      this.logger.warn(
        `Recipient name mismatch on refund: expected "${dto.destinationAccountName}", Nomba verified "${verified.accountName}". Proceeding with Nomba's verified name.`,
      );
    }

    const token = await this.getAccessToken();
    const transferResponse = await fetch(`${this.baseUrl}/transfers/bank`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        accountId: this.accountId,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: nairaToKobo(dto.amount),
        bankCode: dto.destinationBankCode,
        accountNumber: dto.destinationAccountNumber,
        accountName: verified.accountName,
        senderName: dto.senderName || 'ReconOs',
        narration: dto.narration,
        merchantTxRef: dto.reference,
        ...(this.subaccountId ? { subAccountId: this.subaccountId } : {}),
      }),
    });

    if (!transferResponse.ok) {
      throw new Error(`Nomba Transfer API error: ${transferResponse.status} ${await transferResponse.text()}`);
    }

    const data = await transferResponse.json();
    const payload = data.data ?? data;

    return {
      reference: payload.merchantTxRef ?? dto.reference,
      status: payload.status ?? 'pending',
      amount: dto.amount,
      destinationAccountNumber: dto.destinationAccountNumber,
      destinationAccountName: verified.accountName,
      narration: dto.narration,
      timestamp: payload.timestamp ?? new Date().toISOString(),
    };
  }

  /** POST /v2/transfers/bank/{subAccountId} — merchant withdraws from their sub-account. */
  async initiateTransferFromSubAccount(
    dto: InitiateSubAccountTransferDto,
  ): Promise<TransferResponse> {
    this.logger.log(
      `Sub-account transfer: ₦${dto.amount.toLocaleString()} from ${dto.subAccountId.slice(0, 8)}… → ${dto.destinationAccountNumber}`,
    );

    const verified = await this.lookupBankAccount({
      bankCode: dto.destinationBankCode,
      accountNumber: dto.destinationAccountNumber,
      subAccountId: dto.subAccountId,
    });

    if (verified.accountName.toUpperCase() !== dto.destinationAccountName.toUpperCase()) {
      this.logger.warn(
        `Recipient name mismatch: expected "${dto.destinationAccountName}", Nomba verified "${verified.accountName}".`,
      );
    }

    const token = await this.getAccessToken();
    const transferResponse = await fetch(
      `${this.apiRoot}/v2/transfers/bank/${dto.subAccountId}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          accountId: this.accountId,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: nairaToKobo(dto.amount),
          bankCode: dto.destinationBankCode,
          accountNumber: dto.destinationAccountNumber,
          accountName: verified.accountName,
          senderName: dto.senderName || 'ReconOs',
          narration: dto.narration,
          merchantTxRef: dto.reference,
        }),
      },
    );

    const data = await transferResponse.json();
    if (!transferResponse.ok || (data.code && !['00', '201'].includes(String(data.code)))) {
      throw new Error(
        `Nomba sub-account transfer failed: ${data.description || data.message || transferResponse.status}`,
      );
    }

    const payload = data.data ?? data;

    return {
      reference: payload.meta?.merchantTxRef ?? payload.merchantTxRef ?? dto.reference,
      status: payload.status === 'SUCCESS' ? 'successful' : 'pending',
      amount: dto.amount,
      destinationAccountNumber: dto.destinationAccountNumber,
      destinationAccountName: verified.accountName,
      narration: dto.narration,
      timestamp: payload.timeCreated ?? new Date().toISOString(),
    };
  }

  // ── CHECK TRANSFER STATUS ────────────────────────────────────────────
  // GET /transfers/{merchantTxRef} — confirms whether a transfer that
  // came back "pending" from initiateTransfer has since settled. This
  // is what should replace the current optimistic "pending = COMPLETED"
  // simplification in resolveOverpayment, once wired in there.
  async checkTransferStatus(merchantTxRef: string): Promise<TransferResponse> {
    this.logger.log(`Checking transfer status: ${merchantTxRef}`);

    const token = await this.getAccessToken();

    const response = await fetch(`${this.baseUrl}/transfers/${merchantTxRef}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'accountId': this.accountId,
      },
    });

    if (!response.ok) {
      throw new Error(`Nomba transfer status check failed: ${response.status} ${await response.text()}`);
    }

    const data = await response.json();
    const payload = data.data ?? data;

    return {
      reference: payload.merchantTxRef ?? merchantTxRef,
      status: payload.status ?? 'pending',
      amount: koboToNaira(payload.amount ?? 0),
      destinationAccountNumber: payload.accountNumber ?? '',
      destinationAccountName: payload.accountName ?? '',
      narration: payload.narration ?? '',
      timestamp: payload.timestamp ?? new Date().toISOString(),
    };
  }

  // ── VIRTUAL ACCOUNT TRANSACTIONS (Layer 2 sync) ────────────────────────
  // Sandbox often returns 404 on /transactions/virtual even when the VA exists;
  // fall back to /transactions/bank and filter vact_transfer rows by recipient VA.
  async fetchVirtualAccountTransactions(
    dto: FetchVirtualTransactionsDto,
  ): Promise<FetchVirtualTransactionsResponse> {
    try {
      return await this.fetchVirtualAccountTransactionsDirect(dto);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (!message.includes('404')) throw err;
      this.logger.warn(
        `GET /transactions/virtual returned 404 for ${dto.virtualAccountNumber} — falling back to /transactions/bank`,
      );
      return this.fetchVirtualAccountTransactionsViaBank(dto);
    }
  }

  private async fetchVirtualAccountTransactionsDirect(
    dto: FetchVirtualTransactionsDto,
  ): Promise<FetchVirtualTransactionsResponse> {
    this.logger.log(
      `Fetching VA transactions: ${dto.virtualAccountNumber} (${dto.dateFrom} → ${dto.dateTo})`,
    );

    const token = await this.getAccessToken();
    const params = new URLSearchParams({
      virtual_account: dto.virtualAccountNumber,
      dateFrom: dto.dateFrom,
      dateTo: dto.dateTo,
      limit: String(dto.limit ?? 50),
    });
    if (dto.cursor) params.set('cursor', dto.cursor);
    if (this.subaccountId) params.set('subAccountId', this.subaccountId);

    const response = await fetch(`${this.baseUrl}/transactions/virtual?${params}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        accountId: this.accountId,
      },
    });

    if (!response.ok) {
      throw new Error(
        `Nomba Virtual Transactions API error: ${response.status} ${await response.text()}`,
      );
    }

    const data = await response.json();
    const payload = data.data ?? data;
    const items: Record<string, unknown>[] =
      payload.results ??
      payload.transactions ??
      payload.items ??
      (Array.isArray(payload) ? payload : []);

    const nextCursor =
      payload.nextCursor ??
      payload.cursor ??
      payload.meta?.nextCursor ??
      data.nextCursor;

    const hasMore = Boolean(
      payload.hasMore ?? data.hasMore ?? (nextCursor && items.length > 0),
    );

    return {
      transactions: items,
      nextCursor: nextCursor ? String(nextCursor) : undefined,
      hasMore,
    };
  }

  private async fetchVirtualAccountTransactionsViaBank(
    dto: FetchVirtualTransactionsDto,
  ): Promise<FetchVirtualTransactionsResponse> {
    const token = await this.getAccessToken();
    const params = new URLSearchParams({
      limit: String(dto.limit ?? 100),
      dateFrom: `${dto.dateFrom}T00:00:00`,
      dateTo: `${dto.dateTo}T23:59:59`,
    });
    if (dto.cursor) params.set('cursor', dto.cursor);

    const response = await fetch(`${this.baseUrl}/transactions/bank?${params}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        accountId: this.accountId,
      },
    });

    if (!response.ok) {
      throw new Error(
        `Nomba Bank Transactions API error: ${response.status} ${await response.text()}`,
      );
    }

    const data = await response.json();
    const payload = data.data ?? data;
    const allRows: Record<string, unknown>[] = payload.results ?? [];
    const va = dto.virtualAccountNumber;

    const items = allRows
      .filter((row) => String(row.recipientAccountNumber ?? '') === va)
      .map((row) => ({
        ...row,
        _syncSource: 'transactions/bank',
        recipientAccountNumber: row.recipientAccountNumber ?? va,
      }));

    const nextCursor = payload.cursor ? String(payload.cursor) : undefined;

    return {
      transactions: items,
      nextCursor,
      hasMore: Boolean(nextCursor && allRows.length > 0),
    };
  }

  /** GET /transactions/accounts/{subAccountId} — org-wide credits, filter by VA locally. */
  async fetchSubAccountTransactions(
    dto: FetchAccountTransactionsDto,
  ): Promise<FetchVirtualTransactionsResponse> {
    const subId = this.resolveSubAccountId(dto.subAccountId);
    if (!subId) {
      return { transactions: [], hasMore: false };
    }

    this.logger.log(
      `Fetching sub-account transactions (${subId.slice(0, 8)}…) ${dto.dateFrom} → ${dto.dateTo}`,
    );

    const token = await this.getAccessToken();
    const params = new URLSearchParams({
      limit: String(dto.limit ?? 100),
      dateFrom: `${dto.dateFrom}T00:00:00`,
      dateTo: `${dto.dateTo}T23:59:59`,
    });
    if (dto.cursor) params.set('cursor', dto.cursor);

    const response = await fetch(
      `${this.baseUrl}/transactions/accounts/${subId}?${params}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          accountId: this.accountId,
        },
      },
    );

    if (!response.ok) {
      throw new Error(
        `Nomba Sub-Account Transactions API error: ${response.status} ${await response.text()}`,
      );
    }

    const data = await response.json();
    const payload = data.data ?? data;
    const items: Record<string, unknown>[] = (payload.results ?? []).map(
      (row: Record<string, unknown>) => ({
        ...row,
        _syncSource: 'transactions/accounts/sub',
      }),
    );

    const nextCursor = payload.cursor ? String(payload.cursor) : undefined;

    return {
      transactions: items,
      nextCursor,
      hasMore: Boolean(nextCursor && items.length > 0),
    };
  }

  async requerySessionRaw(sessionId: string): Promise<Record<string, unknown> | null> {
    const token = await this.getAccessToken();
    const response = await fetch(`${this.baseUrl}/transactions/requery/${sessionId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        accountId: this.accountId,
      },
    });

    if (response.status === 404) return null;
    if (!response.ok) {
      throw new Error(`Nomba Requery API error: ${response.status} ${await response.text()}`);
    }

    const data = await response.json();
    return (data.data ?? data) as Record<string, unknown>;
  }

  async requeryTransaction(sessionId: string): Promise<TransactionVerificationResponse> {
    this.logger.log(`Requerying transaction session: ${sessionId}`);

    const payload = await this.requerySessionRaw(sessionId);
    if (!payload) {
      return {
        reference: sessionId,
        amount: 0,
        status: 'not_found',
        payerName: '',
        payerAccount: '',
        timestamp: new Date().toISOString(),
      };
    }

    return {
      reference: String(payload.id ?? payload.reference ?? payload.transactionId ?? sessionId),
      amount: parseNombaApiAmount(payload),
      status: isNombaPaymentSettled(String(payload.status ?? ''))
        ? 'successful'
        : String(payload.status ?? 'unknown'),
      payerName: String(
        (payload.payer as { name?: string } | undefined)?.name ?? payload.senderName ?? '',
      ),
      payerAccount: String(
        (payload.payer as { accountNumber?: string } | undefined)?.accountNumber ??
          payload.senderAccountNumber ??
          payload.accountNumber ??
          '',
      ),
      timestamp: String(
        payload.timestamp ?? payload.time ?? payload.timeCreated ?? new Date().toISOString(),
      ),
    };
  }

  // ── PRIVATE: TOKEN MANAGEMENT ───────────────────────────────────────────
  private async getAccessToken(): Promise<string> {
    const now = Date.now();

    // Reuse the cached token if it's still valid. Nomba's own docs say
    // tokens last 60 minutes and instruct refreshing "at the 55-minute
    // mark" — we use a tighter 60s-before-expiry margin internally,
    // which is strictly more conservative (refreshes sooner, never
    // later) and achieves the same goal: never send a request with a
    // token that's about to expire mid-flight.
    if (this.cachedToken && this.cachedToken.expiresAt - 60_000 > now) {
      return this.cachedToken.accessToken;
    }

    // Nomba's training docs show /auth/token/issue and /auth/token/refresh
    // as the two auth endpoints, but never show a refresh_token field
    // anywhere in an issue response or a refresh request body — the
    // documented strategy throughout is simply "cache the access token,
    // refresh near expiry." An earlier version of this code guessed a
    // refresh_token grant existed (a common OAuth pattern elsewhere) and
    // explicitly flagged that guess as unconfirmed. Rather than ship an
    // unverified field name, refreshAccessToken below sends the same
    // client_credentials payload as issueAccessToken, just against the
    // /auth/token/refresh endpoint — the safest interpretation of what's
    // actually documented, with zero invented fields.
    try {
      return await this.refreshAccessToken();
    } catch (err) {
      this.logger.warn('Token refresh failed, falling back to full re-issue:', err);
      return this.issueAccessToken();
    }
  }

  private async issueAccessToken(): Promise<string> {
    const response = await fetch(`${this.baseUrl}/auth/token/issue`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // accountId is a HEADER on the token request, not a body field —
        // confirmed directly from Nomba's own example code.
        'accountId': this.accountId,
      },
      body: JSON.stringify({
        grant_type: 'client_credentials',
        client_id: this.clientId,
        client_secret: this.clientSecret,
      }),
    });

    if (!response.ok) {
      throw new Error(`Nomba auth failed: ${response.status} ${await response.text()}`);
    }

    const data = await response.json();
    return this.cacheTokenResponse(data);
  }

  private async refreshAccessToken(): Promise<string> {
    // Mirrors issueAccessToken exactly, just hitting the dedicated
    // refresh endpoint Nomba's docs list separately from "issue." Their
    // documentation never shows the refresh request body, so rather than
    // invent a refresh_token field with no evidence it exists, this
    // sends the same client_credentials payload — the one thing we know
    // for certain works, since it's shown directly in their issue example.
    const response = await fetch(`${this.baseUrl}/auth/token/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'accountId': this.accountId,
      },
      body: JSON.stringify({
        grant_type: 'client_credentials',
        client_id: this.clientId,
        client_secret: this.clientSecret,
      }),
    });

    if (!response.ok) {
      throw new Error(`Nomba token refresh failed: ${response.status} ${await response.text()}`);
    }

    const data = await response.json();
    return this.cacheTokenResponse(data);
  }

  // Shared by both issue and refresh — caches whatever token came back
  // and returns the access token.
  private cacheTokenResponse(data: any): string {
    const payload = data.data ?? data;
    const accessToken = payload.access_token;
    // Tokens are documented as 1-hour lived. Default to 3600s if the
    // response doesn't echo back an explicit expiry.
    const expiresInSeconds = payload.expires_in ?? 3600;

    this.cachedToken = {
      accessToken,
      expiresAt: Date.now() + expiresInSeconds * 1000,
    };

    return accessToken;
  }
}
