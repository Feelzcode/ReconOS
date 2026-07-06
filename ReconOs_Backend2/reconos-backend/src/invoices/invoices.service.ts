// src/invoices/invoices.service.ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { WalletService } from '../reconciliation/wallet.service';
import { PayService } from '../pay/pay.service';
import { EmailService } from '../email/email.service';
import { EmailNotificationsService } from '../email/email-notifications.service';
import { enrichInvoiceAmounts } from '../customers/customer-financial-events';
import { formatNgn } from '../email/templates/layout';
import { paymentPageUrl } from '../common/payment-url';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InvoiceStatus } from '@prisma/client';

@Injectable()
export class InvoicesService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private wallet: WalletService,
    private pay: PayService,
    private email: EmailService,
    private emailNotify: EmailNotificationsService,
  ) {}

  async create(
    dto: { customerId: string; description: string; amount: number; dueDate: string; notes?: string },
    organizationId: string,
  ) {
    const invoiceNumber = await this.generateInvoiceNumber(organizationId);

    const invoice = await this.prisma.invoice.create({
      data: {
        organizationId,
        customerId: dto.customerId,
        invoiceNumber,
        description: dto.description.trim(),
        amount: dto.amount,
        dueDate: new Date(dto.dueDate),
        notes: dto.notes,
        status: InvoiceStatus.PENDING,
        paymentToken: randomBytes(16).toString('base64url'),
      },
      include: { customer: true },
    });

    await this.audit.log({
      organizationId,
      action: 'INVOICE_CREATED',
      entity: 'Invoice',
      entityId: invoice.id,
      newValue: { invoiceNumber, description: dto.description, amount: dto.amount, customerId: dto.customerId },
    });

    await this.wallet.applyToOpenInvoices(dto.customerId, organizationId);

    this.emailNotify.notifyMerchant(organizationId, 'invoice-created', {
      invoiceNumber,
      customerName: invoice.customer.name,
      description: dto.description,
      amount: dto.amount,
      dueDate: dto.dueDate,
    }, `/invoices`);

    const refreshed = await this.prisma.invoice.findFirst({
      where: { id: invoice.id, organizationId },
      include: { customer: true },
    });

    const enriched = enrichInvoiceAmounts(refreshed!);
    const walletApplied = Number(refreshed!.amountPaid ?? 0);

    return this.pay.attachPaymentMeta({
      ...enriched,
      walletAppliedOnCreate: walletApplied,
    });
  }

  async findAll(organizationId: string, status?: string) {
    const rows = await this.prisma.invoice.findMany({
      where: {
        organizationId,
        ...(status ? { status: status as InvoiceStatus } : {}),
      },
      include: {
        customer: { select: { id: true, name: true, email: true, virtualAccountNumber: true, walletBalance: true } },
        matches: { select: { id: true, confidenceScore: true, autoMatched: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return Promise.all(rows.map((row) => this.pay.attachPaymentMeta(enrichInvoiceAmounts(row))));
  }

  async findOne(id: string, organizationId: string) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id, organizationId },
      include: {
        customer: true,
        matches: {
          include: { transaction: true },
        },
      },
    });
    if (!invoice) throw new NotFoundException('Invoice not found');
    return this.pay.attachPaymentMeta(enrichInvoiceAmounts(invoice));
  }

  async update(id: string, dto: any, organizationId: string, userId: string) {
    const old = await this.findOne(id, organizationId);

    const updated = await this.prisma.invoice.update({
      where: { id },
      data: dto,
    });

    await this.audit.log({
      organizationId,
      userId,
      action: 'INVOICE_UPDATED',
      entity: 'Invoice',
      entityId: id,
      oldValue: { status: old.status },
      newValue: dto,
    });

    return enrichInvoiceAmounts(updated);
  }

  async getOverdue(organizationId: string) {
    const rows = await this.prisma.invoice.findMany({
      where: {
        organizationId,
        status: { in: [InvoiceStatus.PENDING, InvoiceStatus.PARTIAL, InvoiceStatus.OVERDUE] },
        dueDate: { lt: new Date() },
      },
      include: { customer: true },
      orderBy: { dueDate: 'asc' },
    });

    return rows.map((row) => enrichInvoiceAmounts(row));
  }

  async sendPaymentRequestEmail(
    id: string,
    organizationId: string,
    userId: string,
    opts?: { to?: string },
  ) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id, organizationId },
      include: { customer: true, organization: true },
    });
    if (!invoice) throw new NotFoundException('Invoice not found');

    const enriched = enrichInvoiceAmounts(invoice);
    if (enriched.amountDue <= 0) {
      throw new BadRequestException('This invoice has no balance due to collect.');
    }

    const recipient = opts?.to?.trim() || invoice.customer.email?.trim();
    if (!recipient) {
      throw new BadRequestException(
        'No email address for this customer. Add an email on the customer profile first.',
      );
    }

    const withMeta = await this.pay.attachPaymentMeta(enriched);
    const org = invoice.organization;
    const customer = invoice.customer;

    const draft = this.email.buildPaymentRequestEmail({
      merchantName: org.name,
      customerName: customer.name,
      invoiceNumber: invoice.invoiceNumber,
      description: invoice.description,
      amountDue: enriched.amountDue,
      dueDate: invoice.dueDate.toISOString(),
      paymentUrl: withMeta.paymentUrl ?? paymentPageUrl(invoice.paymentToken!),
      accountNumber: customer.virtualAccountNumber,
      bankName: customer.bankName,
      accountName: customer.virtualAccountName ?? customer.name,
      replyTo: org.email,
    });

    const result = await this.email.send({ ...draft, to: recipient });

    await this.audit.log({
      organizationId,
      userId,
      action: 'INVOICE_EMAIL_SENT',
      entity: 'Invoice',
      entityId: invoice.id,
      newValue: {
        to: recipient,
        invoiceNumber: invoice.invoiceNumber,
        resendId: result.id,
      },
    });

    this.emailNotify.notifyMerchant(organizationId, 'invoice-sent', {
      invoiceNumber: invoice.invoiceNumber,
      customerName: customer.name,
      sentTo: recipient,
      amountDue: enriched.amountDue,
      dueDate: invoice.dueDate.toISOString(),
    }, `/invoices`);

    return { sent: true, to: recipient, id: result.id };
  }

  // Runs daily at midnight — marks overdue invoices + sends overdue emails
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async markOverdueInvoices() {
    const now = new Date();
    const becomingOverdue = await this.prisma.invoice.findMany({
      where: {
        status: { in: [InvoiceStatus.PENDING, InvoiceStatus.PARTIAL] },
        dueDate: { lt: now },
      },
      include: { customer: true },
    });

    if (becomingOverdue.length === 0) return;

    await this.prisma.invoice.updateMany({
      where: {
        id: { in: becomingOverdue.map((i) => i.id) },
      },
      data: { status: InvoiceStatus.OVERDUE },
    });

    const byOrg = new Map<string, typeof becomingOverdue>();
    for (const inv of becomingOverdue) {
      const list = byOrg.get(inv.organizationId) ?? [];
      list.push(inv);
      byOrg.set(inv.organizationId, list);
    }

    for (const [organizationId, invoices] of byOrg) {
      for (const inv of invoices) {
        const enriched = enrichInvoiceAmounts({ ...inv, status: InvoiceStatus.OVERDUE });
        const daysOverdue = Math.max(
          1,
          Math.ceil((now.getTime() - inv.dueDate.getTime()) / (24 * 60 * 60 * 1000)),
        );
        this.emailNotify.notifyMerchant(organizationId, 'invoice-overdue', {
          invoiceNumber: inv.invoiceNumber,
          customerName: inv.customer.name,
          amountDue: enriched.amountDue,
          dueDate: inv.dueDate.toISOString(),
          daysOverdue,
        }, `/invoices`);
      }

      if (invoices.length >= 2) {
        this.emailNotify.notifyMerchant(organizationId, 'invoice-overdue-digest', {
          overdueCount: invoices.length,
          overdueRows: invoices.map((inv) => {
            const enriched = enrichInvoiceAmounts({ ...inv, status: InvoiceStatus.OVERDUE });
            return [
              `${inv.invoiceNumber} · ${inv.customer.name}`,
              formatNgn(enriched.amountDue),
            ] as [string, string];
          }),
        }, `/invoices`);
      }
    }

    console.log(`⏰ Marked ${becomingOverdue.length} invoice(s) as OVERDUE`);
  }

  /** 9:00 daily — invoices due in 7 days */
  @Cron('0 9 * * *')
  async sendSevenDayReminders() {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() + 7);
    const end = new Date(start);
    end.setHours(23, 59, 59, 999);

    const invoices = await this.prisma.invoice.findMany({
      where: {
        status: { in: [InvoiceStatus.PENDING, InvoiceStatus.PARTIAL, InvoiceStatus.OVERDUE] },
        dueDate: { gte: start, lte: end },
      },
      include: { customer: true },
    });

    for (const inv of invoices) {
      const enriched = enrichInvoiceAmounts(inv);
      if (enriched.amountDue <= 0) continue;
      this.emailNotify.notifyMerchant(inv.organizationId, 'reminder-7day', {
        invoiceNumber: inv.invoiceNumber,
        customerName: inv.customer.name,
        amountDue: enriched.amountDue,
        dueDate: inv.dueDate.toISOString(),
      }, `/invoices`);
    }
  }

  /** 9:00 daily — invoices due today */
  @Cron('0 9 * * *')
  async sendDueTodayReminders() {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setHours(23, 59, 59, 999);

    const invoices = await this.prisma.invoice.findMany({
      where: {
        status: { in: [InvoiceStatus.PENDING, InvoiceStatus.PARTIAL] },
        dueDate: { gte: start, lte: end },
      },
      include: { customer: true },
    });

    for (const inv of invoices) {
      const enriched = enrichInvoiceAmounts(inv);
      if (enriched.amountDue <= 0) continue;
      this.emailNotify.notifyMerchant(inv.organizationId, 'reminder-due-today', {
        invoiceNumber: inv.invoiceNumber,
        customerName: inv.customer.name,
        amountDue: enriched.amountDue,
        dueDate: inv.dueDate.toISOString(),
      }, `/invoices`);
    }
  }

  // Auto-generate INV-0001, INV-0002, etc.
  private async generateInvoiceNumber(organizationId: string): Promise<string> {
    const count = await this.prisma.invoice.count({ where: { organizationId } });
    const num = (count + 1).toString().padStart(4, '0');
    return `INV-${num}`;
  }
}
