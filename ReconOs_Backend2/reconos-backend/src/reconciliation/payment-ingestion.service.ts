// Shared payment ingestion — used by webhooks (Layer 1) and transaction sync (Layer 2).
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ReconciliationEngine } from './reconciliation.engine';
import { WalletService } from './wallet.service';
import { AuditService } from '../audit/audit.service';
import { EmailNotificationsService } from '../email/email-notifications.service';
import { NormalizedPaymentWebhook, collectNombaPaymentIds } from '../nomba/nomba-webhook.util';

export type PaymentIngestSource = 'nomba' | 'nomba_sync' | 'demo_mock';

export type PaymentIngestResult = 'imported' | 'duplicate' | 'skipped';

@Injectable()
export class PaymentIngestionService {
  private readonly logger = new Logger(PaymentIngestionService.name);

  constructor(
    private prisma: PrismaService,
    private reconciliation: ReconciliationEngine,
    private wallet: WalletService,
    private audit: AuditService,
    private emailNotify: EmailNotificationsService,
  ) {}

  async ingestPayment(
    payment: NormalizedPaymentWebhook,
    opts: { source: PaymentIngestSource; organizationId?: string },
  ): Promise<PaymentIngestResult> {
    const {
      eventId,
      accountNumber,
      reference,
      amount,
      payerName,
      payerAccount,
      payerBankCode,
      payerBankName,
      paymentDate,
      rawData,
    } = payment;

    const paymentIds = collectNombaPaymentIds(payment);

    const existing = await this.prisma.transaction.findFirst({
      where: {
        OR: paymentIds.flatMap((id) => [
          { nombaEventId: id },
          { nombaReference: id },
        ]),
      },
    });

    if (existing) {
      this.logger.log(`Duplicate payment skipped — ${reference || eventId}`);
      return 'duplicate';
    }

    // Nomba sends the same payment under different IDs (webhook session ID vs sync
    // transaction ref). Reject if we already have any row for this VA + amount + time.
    const windowMs = 2 * 60 * 1000;
    const existingFingerprint = await this.prisma.transaction.findFirst({
      where: {
        accountNumber,
        amount,
        paymentDate: {
          gte: new Date(paymentDate.getTime() - windowMs),
          lte: new Date(paymentDate.getTime() + windowMs),
        },
      },
    });

    if (existingFingerprint) {
      this.logger.log(
        `Duplicate payment skipped (fingerprint) — ₦${amount} on ${accountNumber} already recorded as ${existingFingerprint.nombaReference}`,
      );
      return 'duplicate';
    }

    const customer = await this.prisma.customer.findUnique({
      where: { virtualAccountNumber: accountNumber },
    });

    const transaction = await this.prisma.transaction.create({
      data: {
        customerId: customer?.id ?? null,
        nombaReference: reference,
        nombaEventId: eventId,
        amount,
        accountNumber,
        payerName: payerName ?? null,
        payerAccount: payerAccount ?? null,
        payerBankCode: payerBankCode ?? null,
        payerBankName: payerBankName ?? null,
        paymentDate,
        rawWebhookData: rawData as object,
        status: 'UNMATCHED',
      },
      include: { customer: true },
    });

    const recovered = opts.source === 'nomba_sync';
    this.logger.log(
      `${recovered ? 'Recovered' : 'Stored'} transaction ${transaction.id} — ₦${amount}`,
    );

    if (customer) {
      await this.audit.log({
        organizationId: customer.organizationId,
        action: recovered
          ? 'PAYMENT_RECOVERED'
          : opts.source === 'demo_mock'
            ? 'DEMO_MOCK_WEBHOOK_FIRED'
            : 'PAYMENT_RECEIVED_WEBHOOK',
        entity: 'Transaction',
        entityId: transaction.id,
        newValue: {
          amount,
          accountNumber,
          reference,
          payerName,
          recovered,
          source: opts.source,
        },
      });

      const notifyTemplate = recovered ? 'payment-recovered' : 'payment-received';
      this.emailNotify.notifyMerchant(customer.organizationId, notifyTemplate, {
        customerName: customer.name,
        amount,
        bankName: customer.bankName ?? undefined,
        time: new Date().toISOString(),
        recoveredBy: recovered ? 'Background sync' : undefined,
        originallyReceived: recovered
          ? (payment.paymentDate instanceof Date
              ? payment.paymentDate.toISOString()
              : String(payment.paymentDate ?? new Date().toISOString()))
          : undefined,
      }, '/transactions');
    } else if (opts.organizationId && opts.source === 'demo_mock') {
      await this.audit.log({
        organizationId: opts.organizationId,
        action: 'DEMO_MOCK_WEBHOOK_FIRED',
        entity: 'Transaction',
        entityId: transaction.id,
        newValue: { amount, accountNumber, reference, unmatchedCustomer: true },
      });
    }

    if (customer) {
      const walletResult = await this.wallet.applyToOpenInvoices(
        customer.id,
        customer.organizationId,
      );
      if (walletResult.applied > 0) {
        this.logger.log(
          `Wallet credit applied: ₦${walletResult.applied.toLocaleString()} for ${customer.name}`,
        );
      }
    }

    const result = await this.reconciliation.reconcile(transaction);
    this.logger.log(
      `Reconciliation (${opts.source}): ${result.action} — score ${result.confidenceScore}/100`,
    );

    return 'imported';
  }
}
