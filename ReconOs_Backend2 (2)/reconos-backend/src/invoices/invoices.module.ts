// src/invoices/invoices.module.ts
import { Module } from '@nestjs/common';
import { InvoicesController } from './invoices.controller';
import { InvoicesService } from './invoices.service';
import { AuditModule } from '../audit/audit.module';
import { ReconciliationModule } from '../reconciliation/reconciliation.module';
import { PayModule } from '../pay/pay.module';

@Module({
  imports: [AuditModule, ReconciliationModule, PayModule],
  controllers: [InvoicesController],
  providers: [InvoicesService],
  exports: [InvoicesService],
})
export class InvoicesModule {}
