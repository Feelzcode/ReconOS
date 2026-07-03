// src/insights/insights.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../ai/ai.service';
import { InvoiceStatus, TransactionStatus } from '@prisma/client';

@Injectable()
export class InsightsService {
  constructor(
    private prisma: PrismaService,
    private ai: AiService,
  ) {}

  // Main dashboard stats
  async getDashboardInsights(organizationId: string) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalCollectedMonth,
      totalTransactions,
      matchedTransactions,
      pendingInvoices,
      overdueInvoices,
      openInvoices,
      collectedToday,
      reviewQueue,
      exceptions,
      recentTransactions,
      weeklyCollections,
      recoveredPayments,
    ] = await Promise.all([
      // Total collected this month
      this.prisma.transaction.aggregate({
        where: {
          customer: { organizationId },
          status: { in: [TransactionStatus.MATCHED, TransactionStatus.MANUALLY_MATCHED] },
          paymentDate: { gte: startOfMonth },
        },
        _sum: { amount: true },
      }),
      // Total transactions this month
      this.prisma.transaction.count({
        where: { customer: { organizationId }, paymentDate: { gte: startOfMonth } },
      }),
      // Matched transactions this month
      this.prisma.transaction.count({
        where: {
          customer: { organizationId },
          status: { in: [TransactionStatus.MATCHED, TransactionStatus.MANUALLY_MATCHED] },
          paymentDate: { gte: startOfMonth },
        },
      }),
      // Pending invoices
      this.prisma.invoice.count({ where: { organizationId, status: InvoiceStatus.PENDING } }),
      // Overdue invoices
      this.prisma.invoice.findMany({
        where: { organizationId, status: InvoiceStatus.OVERDUE },
        include: { customer: true },
      }),
      // Open invoices (outstanding balance)
      this.prisma.invoice.findMany({
        where: {
          organizationId,
          status: { in: [InvoiceStatus.PENDING, InvoiceStatus.PARTIAL, InvoiceStatus.OVERDUE] },
        },
        select: { amount: true, amountPaid: true, status: true },
      }),
      // Today's matched collections
      this.prisma.transaction.aggregate({
        where: {
          customer: { organizationId },
          status: { in: [TransactionStatus.MATCHED, TransactionStatus.MANUALLY_MATCHED] },
          paymentDate: { gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()) },
        },
        _sum: { amount: true },
        _count: true,
      }),
      // Review queue count
      this.prisma.transaction.count({
        where: { customer: { organizationId }, status: TransactionStatus.IN_REVIEW },
      }),
      // Exception count
      this.prisma.transaction.count({
        where: { customer: { organizationId }, status: TransactionStatus.EXCEPTION },
      }),
      // Recent transactions
      this.prisma.transaction.findMany({
        where: { customer: { organizationId } },
        include: {
          customer: { select: { name: true } },
          match: {
            select: {
              confidenceScore: true,
              autoMatched: true,
              scoreAmount: true,
              scoreCustomer: true,
              scoreTime: true,
              scoreReference: true,
              matchReason: true,
              aiExplanation: true,
              invoice: { select: { invoiceNumber: true, description: true } },
            },
          },
          exception: { select: { type: true, aiSummary: true } },
        },
        orderBy: { paymentDate: 'desc' },
        take: 10,
      }),
      this.getWeeklyCollections(organizationId),
      this.prisma.auditLog.count({
        where: {
          organizationId,
          action: {
            in: [
              'PAYMENT_RECOVERED',
              'PAYMENT_RECOVERED_MERCHANT_SEARCH',
              'PAYMENT_RECOVERED_SESSION_REQUERY',
              'PAYMENT_RECOVERED_HOURLY_SYNC',
              'PAYMENT_RECOVERED_NIGHTLY_SYNC',
            ],
          },
        },
      }),
    ]);

    const autoReconcileRate =
      totalTransactions > 0 ? Math.round((matchedTransactions / totalTransactions) * 100) : 0;

    const totalOverdueAmount = overdueInvoices.reduce(
      (sum, inv) => sum + Number(inv.amount),
      0,
    );

    const totalOutstandingAmount = openInvoices.reduce(
      (sum, inv) => sum + Math.max(Number(inv.amount) - Number(inv.amountPaid), 0),
      0,
    );

    const weeklyTotal = weeklyCollections.reduce((sum, d) => sum + d.amount, 0);

    return {
      collectedThisMonth: Number(totalCollectedMonth._sum.amount ?? 0),
      matchedPaymentsThisMonth: matchedTransactions,
      collectedToday: Number(collectedToday._sum.amount ?? 0),
      paymentsToday: collectedToday._count,
      autoReconcileRate,
      pendingInvoices,
      overdueInvoicesCount: overdueInvoices.length,
      totalOverdueAmount,
      totalOutstandingAmount,
      outstandingInvoiceCount: openInvoices.length,
      reviewQueueCount: reviewQueue,
      exceptionsCount: exceptions,
      recoveredPaymentsCount: recoveredPayments,
      recentTransactions,
      weeklyCollections,
      weeklyCollectionsTotal: weeklyTotal,
    };
  }

  private async getWeeklyCollections(organizationId: string) {
    const now = new Date();
    const start = new Date(now);
    start.setDate(start.getDate() - 6);
    start.setHours(0, 0, 0, 0);

    const txns = await this.prisma.transaction.findMany({
      where: {
        customer: { organizationId },
        status: { in: [TransactionStatus.MATCHED, TransactionStatus.MANUALLY_MATCHED] },
        paymentDate: { gte: start },
      },
      select: { amount: true, paymentDate: true },
    });

    const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const buckets: { day: string; date: string; amount: number }[] = [];

    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      buckets.push({ day: dayLabels[d.getDay()], date: d.toISOString().slice(0, 10), amount: 0 });
    }

    for (const t of txns) {
      const key = new Date(t.paymentDate).toISOString().slice(0, 10);
      const bucket = buckets.find((b) => b.date === key);
      if (bucket) bucket.amount += Number(t.amount);
    }

    return buckets;
  }

  // Exceptions with AI summaries
  async getAnomalies(organizationId: string) {
    return this.prisma.exception.findMany({
      where: { transaction: { customer: { organizationId } }, status: 'OPEN' },
      include: {
        transaction: {
          include: { customer: { select: { name: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // AI-powered collection insight
  async getCollectionInsight(organizationId: string) {
    const org = await this.prisma.organization.findUnique({ where: { id: organizationId } });

    const overdueInvoices = await this.prisma.invoice.findMany({
      where: { organizationId, status: InvoiceStatus.OVERDUE },
      include: { customer: true },
    });

    const totalOverdue = overdueInvoices.reduce((sum, inv) => sum + Number(inv.amount), 0);

    const structured = overdueInvoices.map((inv) => ({
      customerName: inv.customer.name,
      amount: Number(inv.amount),
      daysOverdue: Math.round(
        (Date.now() - inv.dueDate.getTime()) / (1000 * 60 * 60 * 24),
      ),
      invoiceNumber: inv.invoiceNumber,
    }));

    const aiInsight = await this.ai.generateCollectionInsight({
      overdueInvoices: structured,
      totalOverdue,
      organizationName: org?.name ?? 'Your business',
    });

    return {
      overdueInvoices: structured,
      totalOverdue,
      aiInsight,
    };
  }
}
