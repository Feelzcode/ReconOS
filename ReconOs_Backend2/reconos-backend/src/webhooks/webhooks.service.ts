// src/webhooks/webhooks.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { PaymentIngestionService } from '../reconciliation/payment-ingestion.service';
import {
  normalizeNombaWebhook,
  NormalizedPayoutWebhook,
  NombaWebhookPayload,
} from '../nomba/nomba-webhook.util';

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(
    private prisma: PrismaService,
    private ingestion: PaymentIngestionService,
    private audit: AuditService,
  ) {}

  async processWebhookAsync(
    payload: NombaWebhookPayload,
    opts: { source?: 'nomba' | 'demo_mock'; organizationId?: string } = {},
  ): Promise<void> {
    const normalized = normalizeNombaWebhook(payload);

    if (!normalized) {
      const eventType = payload.event_type ?? payload.event ?? 'unknown';
      this.logger.log(`Ignored unsupported webhook event: ${eventType}`);
      return;
    }

    if (normalized.kind === 'payment') {
      await this.ingestion.ingestPayment(normalized, {
        source: opts.source === 'demo_mock' ? 'demo_mock' : 'nomba',
        organizationId: opts.organizationId,
      });
      return;
    }

    await this.processPayout(normalized, opts);
  }

  private async processPayout(
    payout: NormalizedPayoutWebhook,
    opts: { source?: 'nomba' | 'demo_mock' },
  ): Promise<void> {
    const refs = [payout.merchantTxRef, payout.transactionId].filter(Boolean) as string[];

    if (refs.length === 0) {
      this.logger.warn(`Payout webhook ${payout.eventId} missing merchant reference`);
      return;
    }

    const overpayment = await this.prisma.overpaymentAction.findFirst({
      where: { refundReference: { in: refs } },
      include: { customer: true, invoice: true },
    });

    if (!overpayment) {
      this.logger.log(
        `Payout webhook ${payout.eventType} — no OverpaymentAction for refs: ${refs.join(', ')}`,
      );
      return;
    }

    const success = payout.eventType === 'payout_success' || payout.eventType === 'payout_refund';

    await this.prisma.overpaymentAction.update({
      where: { id: overpayment.id },
      data: success
        ? {
            status: 'COMPLETED',
            transferStatus: 'successful',
            failureReason: null,
          }
        : {
            status: 'FAILED',
            transferStatus: 'failed',
            failureReason: `Nomba ${payout.eventType} webhook`,
          },
    });

    await this.audit.log({
      organizationId: overpayment.customer.organizationId,
      action: success ? 'REFUND_COMPLETED' : 'REFUND_FAILED',
      entity: 'OverpaymentAction',
      entityId: overpayment.id,
      newValue: {
        eventType: payout.eventType,
        eventId: payout.eventId,
        refundReference: overpayment.refundReference,
        viaWebhook: opts.source !== 'demo_mock',
      },
    });

    this.logger.log(
      `Payout webhook ${payout.eventType} applied to OverpaymentAction ${overpayment.id}`,
    );
  }
}
