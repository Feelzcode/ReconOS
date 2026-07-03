import { Module } from '@nestjs/common';
import { WebhooksController } from './webhooks.controller';
import { WebhooksService } from './webhooks.service';
import { ReconciliationModule } from '../reconciliation/reconciliation.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [ReconciliationModule, AuditModule],
  controllers: [WebhooksController],
  providers: [WebhooksService],
})
export class WebhooksModule {}
