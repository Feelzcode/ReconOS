import { Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { enrichInvoiceAmounts } from '../customers/customer-financial-events';
import { bankCodeFromName, buildNqrTransferPayload } from '../common/nqr-payload';
import { paymentPageUrl } from '../common/payment-url';

export type PaymentTrackerStatus = 'AWAITING' | 'CONFIRMING' | 'PARTIAL' | 'CONFIRMED';

@Injectable()
export class PayService {
  constructor(private prisma: PrismaService) {}

  private async ensurePaymentToken(invoiceId: string): Promise<string> {
    const row = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
      select: { paymentToken: true },
    });
    if (row?.paymentToken) return row.paymentToken;

    const token = randomBytes(16).toString('base64url');
    await this.prisma.invoice.update({
      where: { id: invoiceId },
      data: { paymentToken: token },
    });
    return token;
  }

  private async walletCreditForInvoice(invoiceId: string): Promise<number> {
    const logs = await this.prisma.auditLog.findMany({
      where: { action: 'WALLET_APPLIED', entity: 'Invoice', entityId: invoiceId },
    });
    return logs.reduce((sum, log) => {
      const v = log.newValue as { appliedAmount?: number } | null;
      return sum + Number(v?.appliedAmount ?? 0);
    }, 0);
  }

  private resolveTrackerStatus(input: {
    invoiceStatus: string;
    amountDue: number;
    amountPaid: number;
    bankPaymentsApplied: number;
    matches: Array<{ transaction: { status: string; paymentDate: Date } }>;
    recentPendingTxns: number;
  }): PaymentTrackerStatus {
    const settled =
      ['PAID', 'OVERPAID'].includes(input.invoiceStatus) || input.amountDue <= 0;
    if (settled) return 'CONFIRMED';

    const matchAwaitingConfirm = input.matches.some((m) =>
      ['IN_REVIEW', 'UNMATCHED'].includes(m.transaction.status),
    );

    if (matchAwaitingConfirm || input.recentPendingTxns > 0) {
      return 'CONFIRMING';
    }

    // Auto-matched underpayments become MATCHED + PARTIAL — acknowledge receipt
    // instead of leaving the page on "Awaiting payment".
    if (input.amountPaid > 0 || input.bankPaymentsApplied > 0) {
      return 'PARTIAL';
    }

    return 'AWAITING';
  }

  async getByToken(token: string) {
    let invoice = await this.prisma.invoice.findFirst({
      where: { paymentToken: token },
      include: {
        customer: true,
        organization: true,
        matches: {
          orderBy: { createdAt: 'desc' },
          include: { transaction: true },
        },
      },
    });

    if (!invoice) throw new NotFoundException('Payment request not found');

    if (!invoice.paymentToken) {
      const newToken = await this.ensurePaymentToken(invoice.id);
      invoice = await this.prisma.invoice.findFirst({
        where: { paymentToken: newToken },
        include: {
          customer: true,
          organization: true,
          matches: {
            orderBy: { createdAt: 'desc' },
            include: { transaction: true },
          },
        },
      });
    }

    const enriched = enrichInvoiceAmounts(invoice!);
    const customer = invoice!.customer;
    const org = invoice!.organization;
    const accountNumber = customer.virtualAccountNumber ?? '';
    const bankName = customer.bankName ?? 'Wema Bank';
    const bankCode = bankCodeFromName(bankName);
    const amountDue = enriched.amountDue;

    const walletCreditApplied = await this.walletCreditForInvoice(invoice!.id);
    const bankPaymentsApplied = invoice!.matches.reduce(
      (s, m) => s + Number(m.transaction.amount),
      0,
    );

    const since = new Date(Date.now() - 48 * 60 * 60 * 1000);
    const recentPendingTxns = await this.prisma.transaction.count({
      where: {
        customerId: invoice!.customerId,
        status: { in: ['IN_REVIEW', 'UNMATCHED'] },
        paymentDate: { gte: since },
      },
    });

    const trackerStatus = this.resolveTrackerStatus({
      invoiceStatus: invoice!.status,
      amountDue,
      amountPaid: enriched.amountPaid,
      bankPaymentsApplied,
      matches: invoice!.matches,
      recentPendingTxns,
    });

    const isSettled = trackerStatus === 'CONFIRMED';

    const qrPayload =
      accountNumber.length >= 10 && amountDue > 0
        ? buildNqrTransferPayload({
            bankCode,
            accountNumber,
            accountName: customer.virtualAccountName ?? customer.name,
            amount: amountDue,
            reference: invoice!.invoiceNumber,
          })
        : null;

    const lastMatch = invoice!.matches[0];
    const customerLabel = org.customerLabel.replace(/s$/i, '') || 'Customer';

    return {
      invoiceNumber: invoice!.invoiceNumber,
      description: invoice!.description,
      status: invoice!.status,
      paymentStatus: isSettled ? 'PAID' : 'AWAITING_PAYMENT',
      trackerStatus,
      amount: enriched.amount,
      amountPaid: enriched.amountPaid,
      amountDue: enriched.amountDue,
      walletCreditApplied,
      bankPaymentsApplied,
      collectViaPaymentAccount: enriched.collectViaPaymentAccount,
      dueDate: invoice!.dueDate,
      createdAt: invoice!.createdAt,
      merchant: {
        name: org.name,
        customerLabel,
        invoiceLabel: org.invoiceLabel.replace(/s$/i, '') || 'Invoice',
        email: org.email,
        industry: org.industry,
      },
      customer: {
        name: customer.name,
        phone: customer.phone,
      },
      paymentAccount: accountNumber
        ? {
            bankName,
            bankCode,
            accountNumber,
            accountName: customer.virtualAccountName ?? `${org.name} - ${customer.name}`,
          }
        : null,
      qrPayload,
      paymentUrl: paymentPageUrl(invoice!.paymentToken!),
      receipt: isSettled
        ? {
            number: `RC-${invoice!.invoiceNumber.replace('INV-', '')}`,
            paidAt: lastMatch?.createdAt ?? invoice!.updatedAt,
            amount: enriched.amountPaid > 0 ? enriched.amountPaid : enriched.amount,
          }
        : null,
    };
  }

  async attachPaymentMeta<T extends { id: string; paymentToken?: string | null }>(
    invoice: T,
  ): Promise<T & { paymentToken: string; paymentUrl: string }> {
    const token = invoice.paymentToken ?? (await this.ensurePaymentToken(invoice.id));
    return {
      ...invoice,
      paymentToken: token,
      paymentUrl: paymentPageUrl(token),
    };
  }
}
