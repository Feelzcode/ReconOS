// src/transactions/transactions.service.ts
import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NOMBA_PROVIDER, NombaProvider } from '../nomba/nomba.interface';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class TransactionsService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    @Inject(NOMBA_PROVIDER) private nomba: NombaProvider,
  ) {}

  async findAll(organizationId: string, status?: string) {
    return this.prisma.transaction.findMany({
      where: {
        customer: { organizationId },
        ...(status ? { status: status as any } : {}),
      },
      include: {
        customer: { select: { id: true, name: true, virtualAccountNumber: true } },
        match: {
          include: {
            invoice: { select: { id: true, invoiceNumber: true, amount: true } },
          },
        },
        exception: { select: { id: true, type: true, status: true, aiSummary: true } },
      },
      orderBy: { paymentDate: 'desc' },
      take: 100,
    });
  }

  async findOne(id: string, organizationId: string) {
    const txn = await this.prisma.transaction.findFirst({
      where: { id, customer: { organizationId } },
      include: {
        customer: true,
        match: {
          include: { invoice: { include: { customer: true } } },
        },
        exception: true,
      },
    });
    if (!txn) throw new NotFoundException('Transaction not found');
    return txn;
  }

  // Build the Operations Timeline for a transaction
  // Shows every step from invoice creation to reconciliation
  async getTimeline(id: string, organizationId: string) {
    const txn = await this.findOne(id, organizationId);

    const steps: Array<{
      title: string;
      timestamp: Date | null;
      status: 'done' | 'active' | 'pending';
      detail?: string;
    }> = [];

    // Step 1: Invoice creation (if matched)
    if (txn.match?.invoice) {
      steps.push({
        title: `Invoice ${txn.match.invoice.invoiceNumber} Created`,
        timestamp: txn.match.invoice.createdAt,
        status: 'done',
        detail: `Amount: ₦${Number(txn.match.invoice.amount).toLocaleString()} · Customer: ${txn.customer?.name}`,
      });
    }

    // Step 2: Virtual account assigned
    if (txn.customer?.virtualAccountNumber) {
      steps.push({
        title: 'Virtual Account Assigned',
        timestamp: txn.customer.createdAt,
        status: 'done',
        detail: `Account: ${txn.customer.virtualAccountNumber} · ${txn.customer.bankName}`,
      });
    }

    // Step 3: Payment received
    steps.push({
      title: 'Payment Received',
      timestamp: txn.paymentDate,
      status: 'done',
      detail: `₦${Number(txn.amount).toLocaleString()} transferred to virtual account`,
    });

    // Step 4: Webhook verified
    steps.push({
      title: 'Webhook Received & Verified',
      timestamp: txn.createdAt,
      status: 'done',
      detail: `HMAC signature verified · Event ID: ${txn.nombaEventId} · Idempotency key unique`,
    });

    // Step 5: Transaction stored
    steps.push({
      title: 'Transaction Stored',
      timestamp: txn.createdAt,
      status: 'done',
      detail: `Reference: ${txn.nombaReference} · No duplicates detected`,
    });

    // Step 6: Reconciliation result
    if (txn.match) {
      const action = txn.match.autoMatched ? 'Invoice Auto-Matched' : 'Sent to Review Queue';
      steps.push({
        title: action,
        timestamp: txn.match.createdAt,
        status: 'done',
        detail: `Confidence: ${txn.match.confidenceScore}% · ${txn.match.matchReason}`,
      });

      // Step 7: AI explanation
      steps.push({
        title: 'AI Explanation Generated',
        timestamp: txn.match.updatedAt,
        status: txn.match.aiExplanation ? 'done' : 'active',
        detail: txn.match.aiExplanation || 'Generating in background…',
      });
    } else if (txn.exception) {
      steps.push({
        title: 'Exception Raised',
        timestamp: txn.exception.createdAt,
        status: 'active',
        detail: `Type: ${txn.exception.type} · ${txn.exception.description}`,
      });
    }

    return { transaction: txn, timeline: steps };
  }

  /** Requery Nomba for the authoritative status of a stored payment. */
  async verifyWithNomba(id: string, organizationId: string, userId: string) {
    const txn = await this.findOne(id, organizationId);

    const sessionId = txn.nombaEventId;
    const verification = sessionId
      ? await this.nomba.requeryTransaction(sessionId)
      : await this.nomba.verifyTransaction({ reference: txn.nombaReference });

    const amountMatches = Math.abs(Number(verification.amount) - Number(txn.amount)) < 1;
    const statusOk = verification.status === 'successful' || verification.status === 'success';

    await this.audit.log({
      organizationId,
      userId,
      action: 'TRANSACTION_VERIFIED',
      entity: 'Transaction',
      entityId: txn.id,
      oldValue: { amount: txn.amount, status: txn.status },
      newValue: {
        nombaStatus: verification.status,
        nombaAmount: verification.amount,
        amountMatches,
        statusOk,
      },
    });

    return {
      transaction: txn,
      nomba: verification,
      integrity: {
        amountMatches,
        statusOk,
        aligned: amountMatches && statusOk,
      },
    };
  }
}
