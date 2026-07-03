// Applies stored wallet credit to a customer's open invoices (oldest due first).
import { Injectable } from '@nestjs/common';
import { InvoiceStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

const AMOUNT_TOLERANCE_PCT = 0.02;

export interface WalletApplyResult {
  applied: number;
  invoicesUpdated: string[];
}

@Injectable()
export class WalletService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  async applyToOpenInvoices(customerId: string, organizationId: string): Promise<WalletApplyResult> {
    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, organizationId },
    });

    if (!customer || Number(customer.walletBalance) <= 0) {
      return { applied: 0, invoicesUpdated: [] };
    }

    let walletRemaining = Number(customer.walletBalance);
    const invoicesUpdated: string[] = [];

    const openInvoices = await this.prisma.invoice.findMany({
      where: {
        customerId,
        organizationId,
        status: {
          in: [InvoiceStatus.PENDING, InvoiceStatus.PARTIAL, InvoiceStatus.OVERDUE],
        },
      },
      orderBy: [{ dueDate: 'asc' }, { createdAt: 'asc' }],
    });

    for (const invoice of openInvoices) {
      if (walletRemaining <= 0) break;

      const invAmount = Number(invoice.amount);
      const alreadyPaid = Number(invoice.amountPaid ?? 0);
      const remaining = invAmount - alreadyPaid;
      if (remaining <= 0) continue;

      const applyAmount = Math.min(walletRemaining, remaining);
      const newAmountPaid = alreadyPaid + applyAmount;
      const tolerance = invAmount * AMOUNT_TOLERANCE_PCT;

      let newStatus: InvoiceStatus;
      if (Math.abs(newAmountPaid - invAmount) <= tolerance || newAmountPaid >= invAmount) {
        newStatus = InvoiceStatus.PAID;
      } else {
        newStatus = InvoiceStatus.PARTIAL;
      }

      await this.prisma.invoice.update({
        where: { id: invoice.id },
        data: { amountPaid: newAmountPaid, status: newStatus },
      });

      walletRemaining -= applyAmount;
      invoicesUpdated.push(invoice.id);

      await this.audit.log({
        organizationId,
        action: 'WALLET_APPLIED',
        entity: 'Invoice',
        entityId: invoice.id,
        newValue: {
          appliedAmount: applyAmount,
          newAmountPaid,
          newStatus,
          invoiceNumber: invoice.invoiceNumber,
        },
      });
    }

    const totalApplied = Number(customer.walletBalance) - walletRemaining;
    if (totalApplied > 0) {
      await this.prisma.customer.update({
        where: { id: customerId },
        data: { walletBalance: walletRemaining },
      });

      await this.audit.log({
        organizationId,
        action: 'WALLET_DEBITED',
        entity: 'Customer',
        entityId: customerId,
        newValue: { totalApplied, walletRemaining },
      });
    }

    return { applied: totalApplied, invoicesUpdated };
  }
}
