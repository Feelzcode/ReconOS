// src/nomba/mock-nomba.provider.ts
// USE THIS until onboarding week (June 24-29) when real API keys arrive.
// Returns realistic Nomba-shaped responses so the reconciliation engine
// works identically against mock and real data.
// Switch: change nomba.module.ts to use NombaProvider instead.

import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import {
  NombaProvider,
  CreateVirtualAccountDto,
  VirtualAccountResponse,
  CreateSubAccountDto,
  SubAccountResponse,
  SubAccountBalanceResponse,
  BankLookupDto,
  BankLookupResponse,
  InitiateSubAccountTransferDto,
  VerifyTransactionDto,
  TransactionVerificationResponse,
  InitiateTransferDto,
  TransferResponse,
  FetchVirtualTransactionsDto,
  FetchVirtualTransactionsResponse,
  FetchAccountTransactionsDto,
} from './nomba.interface';

@Injectable()
export class MockNombaProvider implements NombaProvider {
  private readonly logger = new Logger('MockNombaProvider');

  constructor(private prisma: PrismaService) {}

  // Simulates Nomba's virtual account creation
  async createVirtualAccount(dto: CreateVirtualAccountDto): Promise<VirtualAccountResponse> {
    this.logger.log(`[MOCK] Creating virtual account for: ${dto.customerName}`);

    // Generate a realistic-looking 10-digit account number
    const accountNumber = this.generateAccountNumber();
    const accountName = `RECONOS/${dto.customerName.toUpperCase().slice(0, 22)}`;

    // Simulate network latency
    await this.delay(120);

    return {
      accountNumber,
      accountName,
      bankName: 'Wema Bank',
      nombaAccountId: `nomba_va_${crypto.randomBytes(6).toString('hex')}`,
    };
  }

  async createSubAccount(dto: CreateSubAccountDto): Promise<SubAccountResponse> {
    this.logger.log(`[MOCK] Creating sub-account: ${dto.accountName}`);
    await this.delay(100);
    return {
      id: `mock_sub_${dto.accountRef}`,
      accountName: dto.accountName,
      accountRef: dto.accountRef,
      currency: 'NGN',
    };
  }

  async listSubAccounts(): Promise<SubAccountResponse[]> {
    return [];
  }

  async getSubAccountBalance(subAccountId: string): Promise<SubAccountBalanceResponse> {
    await this.delay(60);
    return { subAccountId, availableBalance: 125_000, currency: 'NGN' };
  }

  async lookupBankAccount(dto: BankLookupDto): Promise<BankLookupResponse> {
    await this.delay(80);
    return {
      accountName: 'MOCK ACCOUNT HOLDER',
      accountNumber: dto.accountNumber,
      bankCode: dto.bankCode,
    };
  }

  // Simulates Nomba's transaction verification endpoint
  // Simulates Nomba's transaction verification endpoint.
  // Looks up the REAL transaction we stored from the original webhook,
  // rather than returning a fixed fake amount — otherwise this would
  // never match the actual overpayment amount being verified, and the
  // refund-safety check that consumes this would fail every time in
  // demo/mock mode.
  async verifyTransaction(dto: VerifyTransactionDto): Promise<TransactionVerificationResponse> {
    this.logger.log(`[MOCK] Verifying transaction: ${dto.reference}`);
    await this.delay(80);

    const existing = await this.prisma.transaction.findUnique({
      where: { nombaReference: dto.reference },
    });

    if (existing) {
      return {
        reference: existing.nombaReference,
        amount: Number(existing.amount),
        status: 'successful',
        payerName: existing.payerName ?? 'MOCK PAYER',
        payerAccount: existing.payerAccount ?? '0112233445',
        timestamp: existing.paymentDate.toISOString(),
      };
    }

    // Reference not found in our own records — mirrors how the real
    // Nomba API would behave for an unknown reference. Callers that
    // depend on this (e.g. the refund safety check) should treat a
    // non-'successful' or mismatched response as a hard stop.
    this.logger.warn(`[MOCK] No stored transaction found for reference: ${dto.reference}`);
    return {
      reference: dto.reference,
      amount: 0,
      status: 'not_found',
      payerName: '',
      payerAccount: '',
      timestamp: new Date().toISOString(),
    };
  }

  async verifyTransactionForRefund(
    reference: string,
    sessionId?: string,
  ): Promise<TransactionVerificationResponse> {
    const primary = await this.verifyTransaction({ reference });
    if (primary.status === 'successful' || !sessionId) return primary;
    return this.requeryTransaction(sessionId);
  }

  verifyWebhookSignature(_payload: unknown, _signature: string, _timestamp?: string): boolean {
    this.logger.log(`[MOCK] Webhook signature check: bypassed in mock mode`);
    return true;
  }

  // Simulates Nomba Transfers API — called when resolving REFUND overpayments
  async initiateTransfer(dto: InitiateTransferDto): Promise<TransferResponse> {
    this.logger.log(
      `[MOCK] Transfer: ₦${dto.amount.toLocaleString()} → ${dto.destinationAccountNumber} (${dto.destinationAccountName}) — "${dto.narration}"`,
    );
    await this.delay(180);
    return {
      reference: dto.reference,
      status: 'successful',
      amount: dto.amount,
      destinationAccountNumber: dto.destinationAccountNumber,
      destinationAccountName: dto.destinationAccountName,
      narration: dto.narration,
      timestamp: new Date().toISOString(),
    };
  }

  async initiateTransferFromSubAccount(dto: InitiateSubAccountTransferDto): Promise<TransferResponse> {
    this.logger.log(`[MOCK] Sub-account transfer from ${dto.subAccountId}`);
    return this.initiateTransfer(dto);
  }

  // Mock always reports "successful" — there's no real pending state to
  // simulate without a fake delay/queue, and the real provider's version
  // of this is what matters for actually resolving the pending-transfer
  // simplification once wired into resolveOverpayment.
  async checkTransferStatus(merchantTxRef: string): Promise<TransferResponse> {
    this.logger.log(`[MOCK] Checking transfer status: ${merchantTxRef}`);
    await this.delay(60);
    return {
      reference: merchantTxRef,
      status: 'successful',
      amount: 0,
      destinationAccountNumber: '',
      destinationAccountName: '',
      narration: '',
      timestamp: new Date().toISOString(),
    };
  }

  async fetchVirtualAccountTransactions(
    dto: FetchVirtualTransactionsDto,
  ): Promise<FetchVirtualTransactionsResponse> {
    this.logger.log(
      `[MOCK] fetchVirtualAccountTransactions ${dto.virtualAccountNumber} — returns empty (use real Nomba for sync)`,
    );
    await this.delay(40);
    return { transactions: [], hasMore: false };
  }

  async fetchSubAccountTransactions(
    _dto: FetchAccountTransactionsDto,
  ): Promise<FetchVirtualTransactionsResponse> {
    this.logger.log('[MOCK] fetchSubAccountTransactions — returns empty');
    await this.delay(40);
    return { transactions: [], hasMore: false };
  }

  async requeryTransaction(sessionId: string): Promise<TransactionVerificationResponse> {
    return this.verifyTransaction({ reference: sessionId });
  }

  async requerySessionRaw(sessionId: string): Promise<Record<string, unknown> | null> {
    const existing = await this.prisma.transaction.findFirst({
      where: { OR: [{ nombaEventId: sessionId }, { nombaReference: sessionId }] },
    });
    if (!existing) return null;
    return {
      id: existing.nombaReference,
      sessionId,
      status: 'SUCCESS',
      amount: String(existing.amount),
      senderName: existing.payerName,
      accountNumber: existing.payerAccount,
      recipientAccountNumber: existing.accountNumber,
      timeCreated: existing.paymentDate.toISOString(),
    };
  }

  // ── MOCK WEBHOOK HELPER ─────────────────────────────────────────────
  // Call this from POST /webhooks/mock to simulate a Nomba payment event
  // Shape matches Nomba's real webhook payload so the handler is identical
  buildMockWebhookPayload(options: {
    accountNumber: string;
    amount: number;
    payerName?: string;
    payerAccount?: string;
    payerBankCode?: string;
    payerBankName?: string;
    reference?: string;
    officialFormat?: boolean;
  }) {
    const reference = options.reference || `NMB-${Date.now()}-MOCK`;
    const timestamp = new Date().toISOString();

    if (options.officialFormat !== false) {
      return {
        event_type: 'payment_success',
        requestId: crypto.randomUUID(),
        data: {
          merchant: {
            walletId: 'mock-wallet-id',
            walletBalance: 0,
            userId: 'mock-user-id',
          },
          terminal: {},
          transaction: {
            aliasAccountNumber: options.accountNumber,
            fee: 0,
            sessionId: `mock-session-${Date.now()}`,
            type: 'vact_transfer',
            transactionId: reference,
            aliasAccountName: 'RECONOS MOCK',
            responseCode: '',
            originatingFrom: 'api',
            transactionAmount: options.amount,
            narration: `Mock transfer from ${options.payerName ?? 'MOCK SENDER'}`,
            time: timestamp,
            aliasAccountReference: options.accountNumber,
            aliasAccountType: 'VIRTUAL',
          },
          customer: {
            bankCode: options.payerBankCode || '044',
            senderName: options.payerName || 'MOCK SENDER',
            bankName: options.payerBankName || 'Access Bank',
            accountNumber: options.payerAccount || '0099887766',
          },
        },
      };
    }

    return {
      event: 'payment.received',
      requestId: `req_${crypto.randomBytes(10).toString('hex')}`,
      data: {
        id: `evt_${crypto.randomBytes(8).toString('hex')}`,
        reference,
        amount: Math.round(options.amount * 100),
        currency: 'NGN',
        status: 'successful',
        account: {
          accountNumber: options.accountNumber,
          accountName: 'RECONOS MOCK',
          bankName: 'Wema Bank',
        },
        payer: {
          name: options.payerName || 'MOCK SENDER',
          accountNumber: options.payerAccount || '0099887766',
          bankCode: options.payerBankCode || '044',
          bankName: options.payerBankName || 'Access Bank',
        },
        timestamp,
      },
    };
  }

  // ── UTILS ────────────────────────────────────────────────────────────
  private generateAccountNumber(): string {
    // Nigerian bank account numbers are 10 digits
    const prefix = '00'; // Nomba/Wema prefix
    const suffix = Math.floor(Math.random() * 100000000).toString().padStart(8, '0');
    return prefix + suffix;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
