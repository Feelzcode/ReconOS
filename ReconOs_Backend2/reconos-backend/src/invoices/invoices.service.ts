// src/invoices/invoices.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { WalletService } from '../reconciliation/wallet.service';
import { PayService } from '../pay/pay.service';
import { enrichInvoiceAmounts } from '../customers/customer-financial-events';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InvoiceStatus } from '@prisma/client';

@Injectable()
export class InvoicesService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private wallet: WalletService,
    private pay: PayService,
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
        customer: { select: { id: true, name: true, virtualAccountNumber: true, walletBalance: true } },
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

  // Runs daily at midnight — marks overdue invoices automatically
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async markOverdueInvoices() {
    const result = await this.prisma.invoice.updateMany({
      where: {
        status: { in: [InvoiceStatus.PENDING, InvoiceStatus.PARTIAL] },
        dueDate: { lt: new Date() },
      },
      data: { status: InvoiceStatus.OVERDUE },
    });

    if (result.count > 0) {
      console.log(`⏰ Marked ${result.count} invoice(s) as OVERDUE`);
    }
  }

  // Auto-generate INV-0001, INV-0002, etc.
  private async generateInvoiceNumber(organizationId: string): Promise<string> {
    const count = await this.prisma.invoice.count({ where: { organizationId } });
    const num = (count + 1).toString().padStart(4, '0');
    return `INV-${num}`;
  }
}
