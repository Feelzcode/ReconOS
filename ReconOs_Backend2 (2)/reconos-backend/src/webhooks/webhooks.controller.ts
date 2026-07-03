// src/webhooks/webhooks.controller.ts

import {
  Controller,
  Post,
  Body,
  Headers,
  HttpCode,
  Logger,
  BadRequestException,
  ForbiddenException,
  Inject,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WebhooksService } from './webhooks.service';
import { NOMBA_PROVIDER, NombaProvider } from '../nomba/nomba.interface';
import { MockNombaProvider } from '../nomba/mock-nomba.provider';
import { NombaWebhookPayload } from '../nomba/nomba-webhook.util';

@Controller('webhooks')
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);

  constructor(
    private webhooksService: WebhooksService,
    @Inject(NOMBA_PROVIDER) private nomba: NombaProvider,
    private mockNomba: MockNombaProvider,
    private config: ConfigService,
  ) {}

  @Post('nomba')
  @HttpCode(200)
  async handleNombaWebhook(
    @Headers('nomba-signature') signature: string,
    @Headers('nomba-timestamp') timestamp: string,
    @Body() payload: NombaWebhookPayload,
  ) {
    const isValid = this.nomba.verifyWebhookSignature(payload, signature || '', timestamp || '');

    if (!isValid) {
      this.logger.warn(
        `Webhook rejected: invalid signature (event=${payload?.event_type ?? payload?.event ?? 'unknown'})`,
      );
      return { received: false, reason: 'invalid_signature' };
    }

    this.logger.log(
      `Webhook verified: ${payload?.event_type ?? payload?.event} — ${payload?.requestId ?? payload?.data?.id}`,
    );

    this.webhooksService.processWebhookAsync(payload, { source: 'nomba' }).catch((err) =>
      this.logger.error('Webhook processing error:', err),
    );

    return { received: true };
  }

  @Post('mock')
  @HttpCode(200)
  async handleMockWebhook(
    @Headers('x-demo-secret') demoSecret: string,
    @Body()
    body: {
      accountNumber: string;
      amount: number;
      payerName?: string;
      payerAccount?: string;
      payerBankCode?: string;
      payerBankName?: string;
      reference?: string;
      organizationId?: string;
      officialFormat?: boolean;
    },
  ) {
    const enabled = this.config.get('DEMO_MODE_ENABLED', 'false') === 'true';
    const expectedSecret =
      this.config.get('DEMO_MODE_SECRET', '') ||
      this.config.get('DEMO_WEBHOOK_SECRET', '');

    if (!enabled || !expectedSecret || demoSecret !== expectedSecret) {
      throw new ForbiddenException('Demo webhook endpoint is disabled or unauthorized');
    }

    if (!body.accountNumber || !body.amount) {
      throw new BadRequestException('accountNumber and amount are required');
    }

    this.logger.log(`[MOCK] Simulating payment: ₦${body.amount} to ${body.accountNumber}`);

    const mockPayload = this.mockNomba.buildMockWebhookPayload(body);

    this.webhooksService
      .processWebhookAsync(mockPayload, { source: 'demo_mock', organizationId: body.organizationId })
      .catch((err) => this.logger.error('Mock webhook processing error:', err));

    return {
      received: true,
      mock: true,
      payload: mockPayload,
    };
  }
}
