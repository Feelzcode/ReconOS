// src/treasury/treasury.service.ts
// Merchant treasury: Nomba sub-account per org — provision, balance, withdraw.
// Merchants never touch the Nomba dashboard; ReconOS owns the parent API keys.

import {
  BadRequestException,
  Injectable,
  Inject,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { NOMBA_PROVIDER, NombaProvider } from '../nomba/nomba.interface';

/** Nomba/NIP fees — reserve headroom so "full balance" transfers don't fail. */
const TRANSFER_FEE_BUFFER_NGN = 50;

@Injectable()
export class TreasuryService {
  private readonly logger = new Logger(TreasuryService.name);

  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private config: ConfigService,
    @Inject(NOMBA_PROVIDER) private nomba: NombaProvider,
  ) {}

  /** Stable ref we send to Nomba — lookup key from our DB, not Nomba's UUID. */
  private accountRefForOrg(orgId: string): string {
    return `reconos_${orgId}`.slice(0, 64);
  }

  /**
   * Link this org to its Nomba sub-account.
   * Sub-accounts are created in the Nomba dashboard (not via API).
   * Hackathon: one dashboard sub-account in NOMBA_SUBACCOUNT_ID → linked to the merchant org.
   */
  async ensureSubAccount(organizationId: string): Promise<string> {
    const org = await this.prisma.organization.findUnique({ where: { id: organizationId } });
    if (!org) throw new NotFoundException('Organization not found');
    if (org.nombaSubAccountId) return org.nombaSubAccountId;

    const accountRef = this.accountRefForOrg(org.id);
    const dashboardSubAccountId = this.config.get<string>('NOMBA_SUBACCOUNT_ID', '');

    if (!dashboardSubAccountId) {
      throw new ServiceUnavailableException(
        'No Nomba sub-account configured. Create one in the Nomba dashboard and set NOMBA_SUBACCOUNT_ID in .env.',
      );
    }

    await this.prisma.organization.update({
      where: { id: org.id },
      data: { nombaSubAccountId: dashboardSubAccountId, nombaAccountRef: accountRef },
    });

    await this.audit.log({
      organizationId,
      action: 'NOMBA_SUBACCOUNT_LINKED',
      entity: 'Organization',
      entityId: org.id,
      newValue: { nombaSubAccountId: dashboardSubAccountId, nombaAccountRef: accountRef },
    });

    this.logger.log(`Linked ${org.name} → sub-account ${dashboardSubAccountId.slice(0, 8)}…`);
    return dashboardSubAccountId;
  }

  async getOverview(organizationId: string) {
    const org = await this.prisma.organization.findUnique({ where: { id: organizationId } });
    if (!org) throw new NotFoundException('Organization not found');

    const subAccountId = org.nombaSubAccountId ?? (await this.ensureSubAccount(organizationId));

    let withdrawableBalance = 0;
    try {
      const nombaBal = await this.nomba.getSubAccountBalance(subAccountId);
      withdrawableBalance = nombaBal.availableBalance;
    } catch (err) {
      this.logger.warn(`Balance fetch failed: ${err instanceof Error ? err.message : err}`);
    }

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const realPaymentFilter = {
      customer: { organizationId },
      nombaReference: { not: { contains: 'MOCK' } },
    };

    const [totalAgg, todayAgg, pendingAgg, matchedAgg] = await Promise.all([
      this.prisma.transaction.aggregate({
        where: realPaymentFilter,
        _sum: { amount: true },
      }),
      this.prisma.transaction.aggregate({
        where: { ...realPaymentFilter, paymentDate: { gte: startOfDay } },
        _sum: { amount: true },
      }),
      this.prisma.transaction.aggregate({
        where: {
          ...realPaymentFilter,
          status: { in: ['UNMATCHED', 'IN_REVIEW', 'EXCEPTION'] },
        },
        _sum: { amount: true },
      }),
      this.prisma.transaction.aggregate({
        where: {
          ...realPaymentFilter,
          status: { in: ['MATCHED', 'MANUALLY_MATCHED'] },
        },
        _sum: { amount: true },
      }),
    ]);

    const yourCollections = Number(totalAgg._sum.amount ?? 0);
    const todayCollections = Number(todayAgg._sum.amount ?? 0);
    const pendingCollections = Number(pendingAgg._sum.amount ?? 0);
    const matchedCollections = Number(matchedAgg._sum.amount ?? 0);
    const netNombaBalance = Math.max(0, withdrawableBalance - TRANSFER_FEE_BUFFER_NGN);
    const availableToTransfer =
      withdrawableBalance > 0
        ? Math.min(matchedCollections, netNombaBalance)
        : matchedCollections;

    return {
      organizationName: org.name,
      paymentInfrastructure: {
        status: org.nombaSubAccountId ? 'connected' : 'provisioning',
      },
      balance: {
        available: availableToTransfer,
        totalCollected: yourCollections,
        today: todayCollections,
        pending: pendingCollections,
        cleared: matchedCollections,
        currency: 'NGN',
      },
    };
  }

  private mapTransferError(err: unknown): never {
    const msg = err instanceof Error ? err.message : String(err);
    this.logger.error(`Treasury transfer error: ${msg}`);

    if (/INSUFFICIENT_BALANCE/i.test(msg)) {
      throw new BadRequestException(
        'Insufficient cleared balance for this transfer. Try a smaller amount — transfer fees may apply.',
      );
    }
    if (/Account not found|lookup failed|404/i.test(msg)) {
      throw new BadRequestException(
        'Could not verify the destination account. Check the bank and account number.',
      );
    }
    if (/KYC|verification incomplete/i.test(msg)) {
      throw new BadRequestException(
        'This account cannot receive transfers yet. Ask the recipient to complete bank verification.',
      );
    }
    throw new ServiceUnavailableException(
      'Transfer could not be completed right now. Please try again in a few moments.',
    );
  }

  async lookupAccount(
    organizationId: string,
    bankCode: string,
    accountNumber: string,
  ) {
    if (!/^\d{10}$/.test(accountNumber)) {
      throw new BadRequestException('Account number must be 10 digits');
    }
    try {
      const subAccountId = await this.ensureSubAccount(organizationId);
      return await this.nomba.lookupBankAccount({ bankCode, accountNumber, subAccountId });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Account lookup failed: ${msg}`);
      if (/Account not found|404/i.test(msg)) {
        throw new BadRequestException(
          'Account not found for this bank. Check the account number and bank selection.',
        );
      }
      throw new ServiceUnavailableException(
        'Could not verify this account right now. Please try again.',
      );
    }
  }

  async withdraw(
    organizationId: string,
    userId: string,
    dto: {
      amount: number;
      bankCode: string;
      accountNumber: string;
      accountName: string;
      narration?: string;
    },
  ) {
    if (dto.amount <= 0) throw new BadRequestException('Amount must be greater than zero');
    if (!/^\d{10}$/.test(dto.accountNumber)) {
      throw new BadRequestException('Account number must be 10 digits');
    }

    const org = await this.prisma.organization.findUnique({ where: { id: organizationId } });
    if (!org) throw new NotFoundException('Organization not found');

    const subAccountId = await this.ensureSubAccount(organizationId);

    try {
      const nombaBal = await this.nomba.getSubAccountBalance(subAccountId);
      const maxTransfer = Math.max(0, nombaBal.availableBalance - TRANSFER_FEE_BUFFER_NGN);
      if (dto.amount > maxTransfer) {
        throw new BadRequestException(
          maxTransfer <= 0
            ? 'Insufficient cleared balance for a transfer. Transfer fees apply on outbound payments.'
            : `Maximum transfer available is ₦${maxTransfer.toLocaleString('en-NG')} (transfer fees reserved).`,
        );
      }
    } catch (err) {
      if (err instanceof BadRequestException) throw err;
      this.logger.warn(`Pre-transfer balance check skipped: ${err}`);
    }

    const reference = `WD-${organizationId.slice(0, 8)}-${Date.now()}`;

    try {
      const transfer = await this.nomba.initiateTransferFromSubAccount({
        subAccountId,
        amount: dto.amount,
        destinationAccountNumber: dto.accountNumber,
        destinationBankCode: dto.bankCode,
        destinationAccountName: dto.accountName,
        senderName: org.name.slice(0, 32),
        narration: dto.narration || `Withdrawal from ${org.name}`,
        reference,
      });

      await this.audit.log({
        organizationId,
        userId,
        action: 'MERCHANT_WITHDRAWAL',
        entity: 'Organization',
        entityId: organizationId,
        newValue: {
          amount: dto.amount,
          reference: transfer.reference,
          status: transfer.status,
          destinationAccountNumber: dto.accountNumber,
          bankCode: dto.bankCode,
        },
      });

      return transfer;
    } catch (err) {
      this.mapTransferError(err);
    }
  }
}
