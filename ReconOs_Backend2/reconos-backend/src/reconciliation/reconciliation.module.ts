import { Module } from '@nestjs/common';
import { ReconciliationController } from './reconciliation.controller';
import { ReconciliationService } from './reconciliation.service';
import { ReconciliationEngine } from './reconciliation.engine';
import { WalletService } from './wallet.service';
import { PaymentIngestionService } from './payment-ingestion.service';
import { TransactionSyncService } from './transaction-sync.service';
import { AuditModule } from '../audit/audit.module';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [AuditModule, AiModule],
  controllers: [ReconciliationController],
  providers: [
    ReconciliationService,
    ReconciliationEngine,
    WalletService,
    PaymentIngestionService,
    TransactionSyncService,
  ],
  exports: [ReconciliationEngine, WalletService, PaymentIngestionService, TransactionSyncService],
})
export class ReconciliationModule {}
