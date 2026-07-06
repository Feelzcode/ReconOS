// src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { CustomersModule } from './customers/customers.module';
import { InvoicesModule } from './invoices/invoices.module';
import { TransactionsModule } from './transactions/transactions.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { ReconciliationModule } from './reconciliation/reconciliation.module';
import { ExceptionsModule } from './exceptions/exceptions.module';
import { InsightsModule } from './insights/insights.module';
import { AuditModule } from './audit/audit.module';
import { NombaModule } from './nomba/nomba.module';
import { TreasuryModule } from './treasury/treasury.module';
import { AiModule } from './ai/ai.module';
import { EmailModule } from './email/email.module';
import { PayModule } from './pay/pay.module';

@Module({
  imports: [
    // Config — loads .env
    ConfigModule.forRoot({ isGlobal: true }),

    // Cron jobs (for async AI explanation processing)
    ScheduleModule.forRoot(),

    // Core infrastructure
    PrismaModule,
    NombaModule,
    AiModule,
    AuditModule,
    EmailModule,

    // Feature modules
    AuthModule,
    CustomersModule,
    InvoicesModule,
    TransactionsModule,
    WebhooksModule,
    ReconciliationModule,
    ExceptionsModule,
    InsightsModule,
    TreasuryModule,
    PayModule,
  ],
})
export class AppModule {}
