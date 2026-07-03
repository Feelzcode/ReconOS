// Layer 2 — Background Transaction Synchronization (hourly + nightly).
// Pulls Virtual Account + sub-account history from Nomba and imports payments missed by webhooks.
import { BadRequestException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { NOMBA_PROVIDER, NombaProvider } from '../nomba/nomba.interface';
import {
  extractVaFromNombaRow,
  formatNombaDate,
  normalizeNombaVirtualTransaction,
} from '../nomba/nomba-transaction.util';
import { PaymentIngestionService } from './payment-ingestion.service';

export interface TransactionSyncReport {
  organizations: number;
  virtualAccounts: number;
  nombaRowsChecked: number;
  paymentsRecovered: number;
  duplicatesSkipped: number;
  errors: string[];
  startedAt: string;
  completedAt: string;
}

export interface NombaPaymentCandidate {
  sessionId: string;
  reference: string;
  amount: number;
  payerName?: string;
  paymentDate: string;
  virtualAccount: string;
  alreadyImported: boolean;
  source: string;
}

type CustomerRow = {
  id: string;
  name: string;
  organizationId: string;
  virtualAccountNumber: string | null;
};

@Injectable()
export class TransactionSyncService {
  private readonly logger = new Logger(TransactionSyncService.name);
  private syncInProgress = false;

  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private ingestion: PaymentIngestionService,
    @Inject(NOMBA_PROVIDER) private nomba: NombaProvider,
  ) {}

  @Cron('0 * * * *')
  async runHourlySync(): Promise<void> {
    await this.runSync({ lookbackHours: 25, label: 'hourly' });
  }

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async runNightlySync(): Promise<void> {
    await this.runSync({ lookbackHours: 24 * 7, label: 'nightly' });
  }

  async syncOrganization(organizationId: string): Promise<TransactionSyncReport> {
    return this.runSync({ lookbackHours: 25, label: 'manual', organizationId });
  }

  async searchPaymentsForCustomer(
    organizationId: string,
    customerId: string,
    opts: { dateFrom?: string; dateTo?: string; amount?: number } = {},
  ): Promise<NombaPaymentCandidate[]> {
    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, organizationId },
    });
    if (!customer) throw new NotFoundException('Customer not found');
    if (!customer.virtualAccountNumber) {
      throw new BadRequestException('This student has no virtual account yet');
    }

    const dateTo = opts.dateTo ?? formatNombaDate(new Date());
    const dateFrom =
      opts.dateFrom ?? formatNombaDate(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));

    const rows = await this.collectNombaRowsForVa(
      customer.virtualAccountNumber,
      dateFrom,
      dateTo,
    );

    const candidates: NombaPaymentCandidate[] = [];
    const seen = new Set<string>();

    for (const { row, va, source } of rows) {
      const normalized = normalizeNombaVirtualTransaction(row, va);
      if (!normalized) continue;
      if (opts.amount != null && Math.abs(normalized.amount - opts.amount) > 0.01) continue;

      const key = normalized.eventId || normalized.reference;
      if (seen.has(key)) continue;
      seen.add(key);

      const existing = await this.prisma.transaction.findFirst({
        where: {
          OR: [
            { nombaEventId: normalized.eventId },
            { nombaReference: normalized.reference },
            { nombaEventId: normalized.reference },
            { nombaReference: normalized.eventId },
          ],
        },
      });

      candidates.push({
        sessionId: normalized.eventId,
        reference: normalized.reference,
        amount: normalized.amount,
        payerName: normalized.payerName,
        paymentDate: normalized.paymentDate.toISOString(),
        virtualAccount: va,
        alreadyImported: Boolean(existing),
        source,
      });
    }

    return candidates.sort(
      (a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime(),
    );
  }

  async importPaymentForCustomer(
    organizationId: string,
    customerId: string,
    sessionId: string,
  ) {
    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, organizationId },
    });
    if (!customer) throw new NotFoundException('Customer not found');

    const row = await this.nomba.requerySessionRaw(sessionId);
    if (!row) {
      throw new BadRequestException(`No settled payment found on Nomba for session ${sessionId}`);
    }

    const status = String(row.status ?? '').toUpperCase();
    if (status !== 'SUCCESS' && status !== 'SUCCESSFUL') {
      throw new BadRequestException(`Nomba reports status "${row.status}" — not settled yet`);
    }

    const va = extractVaFromNombaRow(row);
    if (va && customer.virtualAccountNumber && va !== customer.virtualAccountNumber) {
      throw new BadRequestException(
        `Payment is for VA ${va}, not ${customer.virtualAccountNumber}`,
      );
    }

    const normalized = normalizeNombaVirtualTransaction(
      { ...row, _syncSource: 'transactions/requery' },
      customer.virtualAccountNumber ?? va,
    );
    if (!normalized) throw new BadRequestException('Could not normalize Nomba payment');

    const result = await this.ingestion.ingestPayment(normalized, { source: 'nomba_sync' });

    await this.audit.log({
      organizationId,
      action: 'PAYMENT_RECOVERED_MERCHANT_SEARCH',
      entity: 'Transaction',
      entityId: normalized.reference,
      newValue: { sessionId, amount: normalized.amount, customer: customer.name, result },
    });

    return { sessionId, amount: normalized.amount, customer: customer.name, result };
  }

  async recoverBySessionId(sessionId: string, organizationId: string) {
    const row = await this.nomba.requerySessionRaw(sessionId);
    if (!row) throw new Error(`No transaction found on Nomba for session ${sessionId}`);

    const status = String(row.status ?? '').toUpperCase();
    if (status !== 'SUCCESS' && status !== 'SUCCESSFUL') {
      throw new Error(`Nomba reports status "${row.status}" — not settled yet`);
    }

    const va = extractVaFromNombaRow(row);
    const customer = await this.prisma.customer.findFirst({
      where: { virtualAccountNumber: va, organizationId },
    });
    if (!customer) {
      throw new Error(`Payment is for VA ${va}, which is not registered under your organization`);
    }

    const normalized = normalizeNombaVirtualTransaction(
      { ...row, _syncSource: 'transactions/requery' },
      va,
    );
    if (!normalized) throw new Error('Could not normalize Nomba requery response');

    const result = await this.ingestion.ingestPayment(normalized, { source: 'nomba_sync' });

    await this.audit.log({
      organizationId,
      action: 'PAYMENT_RECOVERED_SESSION_REQUERY',
      entity: 'Transaction',
      entityId: normalized.reference,
      newValue: { sessionId, amount: normalized.amount, result, customerName: customer.name },
    });

    return { sessionId, amount: normalized.amount, customer: customer.name, result };
  }

  private async collectNombaRowsForVa(
    va: string,
    dateFrom: string,
    dateTo: string,
  ): Promise<Array<{ row: Record<string, unknown>; va: string; source: string }>> {
    const out: Array<{ row: Record<string, unknown>; va: string; source: string }> = [];
    const seen = new Set<string>();

    const addPage = (rows: Record<string, unknown>[], source: string) => {
      for (const row of rows) {
        const rowVa = extractVaFromNombaRow(row);
        if (rowVa && rowVa !== va) continue;
        const id = String(row.sessionId ?? row.transactionId ?? row.id ?? row.reference ?? '');
        if (!id || seen.has(id)) continue;
        seen.add(id);
        out.push({ row, va, source });
      }
    };

    let cursor: string | undefined;
    let pages = 0;
    do {
      const page = await this.nomba.fetchVirtualAccountTransactions({
        virtualAccountNumber: va,
        dateFrom,
        dateTo,
        limit: 50,
        cursor,
      });
      addPage(page.transactions, 'transactions/virtual');
      cursor = page.hasMore ? page.nextCursor : undefined;
      pages++;
    } while (cursor && pages < 10);

    cursor = undefined;
    pages = 0;
    do {
      const page = await this.nomba.fetchSubAccountTransactions({ dateFrom, dateTo, limit: 100, cursor });
      addPage(page.transactions, 'transactions/accounts/sub');
      cursor = page.hasMore ? page.nextCursor : undefined;
      pages++;
    } while (cursor && pages < 10);

    return out;
  }

  private async runSync(opts: {
    lookbackHours: number;
    label: string;
    organizationId?: string;
  }): Promise<TransactionSyncReport> {
    if (this.syncInProgress) {
      this.logger.warn(`Transaction sync (${opts.label}) skipped — already running`);
      return {
        organizations: 0,
        virtualAccounts: 0,
        nombaRowsChecked: 0,
        paymentsRecovered: 0,
        duplicatesSkipped: 0,
        errors: ['Sync already in progress'],
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
      };
    }

    this.syncInProgress = true;
    const startedAt = new Date();
    const dateTo = new Date();
    const dateFrom = new Date(dateTo.getTime() - opts.lookbackHours * 60 * 60 * 1000);
    const dateFromStr = formatNombaDate(dateFrom);
    const dateToStr = formatNombaDate(dateTo);

    const report: TransactionSyncReport = {
      organizations: 0,
      virtualAccounts: 0,
      nombaRowsChecked: 0,
      paymentsRecovered: 0,
      duplicatesSkipped: 0,
      errors: [],
      startedAt: startedAt.toISOString(),
      completedAt: '',
    };

    this.logger.log(`Transaction sync (${opts.label}) started — ${dateFromStr} → ${dateToStr}`);

    try {
      const customers = await this.prisma.customer.findMany({
        where: {
          virtualAccountNumber: { not: null },
          ...(opts.organizationId ? { organizationId: opts.organizationId } : {}),
        },
        select: {
          id: true,
          name: true,
          organizationId: true,
          virtualAccountNumber: true,
        },
      });

      const orgIds = new Set(customers.map((c) => c.organizationId));
      report.organizations = orgIds.size;
      report.virtualAccounts = customers.length;

      const vaToCustomer = new Map<string, CustomerRow>();
      for (const c of customers) {
        if (c.virtualAccountNumber) vaToCustomer.set(c.virtualAccountNumber, c);
      }

      const processedKeys = new Set<string>();

      try {
        let cursor: string | undefined;
        let pageCount = 0;
        do {
          const page = await this.nomba.fetchSubAccountTransactions({
            dateFrom: dateFromStr,
            dateTo: dateToStr,
            limit: 100,
            cursor,
          });
          for (const row of page.transactions) {
            const va = extractVaFromNombaRow(row);
            const customer = va ? vaToCustomer.get(va) : undefined;
            if (!customer) continue;
            await this.processSyncRow(row, va, customer, report, processedKeys, opts.label);
          }
          cursor = page.hasMore ? page.nextCursor : undefined;
          pageCount++;
        } while (cursor && pageCount < 30);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        report.errors.push(`Sub-account sync: ${msg}`);
        this.logger.error('Sub-account sync failed:', err);
      }

      for (const customer of customers) {
        const va = customer.virtualAccountNumber!;
        try {
          let cursor: string | undefined;
          let pageCount = 0;
          do {
            const page = await this.nomba.fetchVirtualAccountTransactions({
              virtualAccountNumber: va,
              dateFrom: dateFromStr,
              dateTo: dateToStr,
              limit: 50,
              cursor,
            });
            for (const row of page.transactions) {
              await this.processSyncRow(row, va, customer, report, processedKeys, opts.label);
            }
            cursor = page.hasMore ? page.nextCursor : undefined;
            pageCount++;
          } while (cursor && pageCount < 20);
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          report.errors.push(`${customer.name} (${va}): ${msg}`);
          this.logger.error(`Sync failed for VA ${va}:`, err);
        }
      }

      for (const orgId of orgIds) {
        await this.audit.log({
          organizationId: orgId,
          action: 'TRANSACTION_SYNC_COMPLETE',
          entity: 'Organization',
          entityId: orgId,
          newValue: {
            label: opts.label,
            recovered: report.paymentsRecovered,
            checked: report.nombaRowsChecked,
            virtualAccounts: report.virtualAccounts,
            errors: report.errors.length,
          },
        });
      }
    } finally {
      this.syncInProgress = false;
      report.completedAt = new Date().toISOString();
      this.logger.log(
        `Transaction sync (${opts.label}) done — recovered ${report.paymentsRecovered}, checked ${report.nombaRowsChecked}, errors ${report.errors.length}`,
      );
    }

    return report;
  }

  private async processSyncRow(
    row: Record<string, unknown>,
    va: string,
    customer: CustomerRow,
    report: TransactionSyncReport,
    processedKeys: Set<string>,
    syncLabel: string,
  ): Promise<void> {
    const normalized = normalizeNombaVirtualTransaction(row, va);
    if (!normalized) return;

    const key = `${normalized.eventId}|${normalized.reference}`;
    if (processedKeys.has(key)) return;
    processedKeys.add(key);

    report.nombaRowsChecked++;

    const result = await this.ingestion.ingestPayment(normalized, { source: 'nomba_sync' });

    if (result === 'imported') {
      report.paymentsRecovered++;
      const auditAction =
        syncLabel === 'nightly'
          ? 'PAYMENT_RECOVERED_NIGHTLY_SYNC'
          : 'PAYMENT_RECOVERED_HOURLY_SYNC';
      await this.audit.log({
        organizationId: customer.organizationId,
        action: auditAction,
        entity: 'Transaction',
        entityId: normalized.reference,
        newValue: {
          amount: normalized.amount,
          customerName: customer.name,
          virtualAccount: va,
          reference: normalized.reference,
          syncLabel,
        },
      });
    } else if (result === 'duplicate') {
      report.duplicatesSkipped++;
    }
  }
}
