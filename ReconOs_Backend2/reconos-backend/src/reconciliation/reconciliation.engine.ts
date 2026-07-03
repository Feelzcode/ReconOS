// src/reconciliation/reconciliation.engine.ts
// The competitive advantage. 4-signal scoring with confidence thresholds.
// Auto-match at 95+, review queue at 70-94, manual below 70.

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AiService } from '../ai/ai.service';
import { Transaction, Invoice, TransactionStatus, InvoiceStatus } from '@prisma/client';

// ── SCORING CONSTANTS ──────────────────────────────────────────────────
const SCORE_EXACT_AMOUNT   = 60;  // amount matches invoice exactly
const SCORE_CUSTOMER_VA    = 25;  // payment came in on customer's dedicated VA
const SCORE_TIME_WINDOW    = 10;  // payment within expected time window
const SCORE_REFERENCE      = 5;   // payment reference contains invoice number
const SCORE_TOTAL_MAX      = 100;

const THRESHOLD_AUTO_MATCH = 95;  // ≥ 95 → auto-match, no human needed
const THRESHOLD_REVIEW     = 70;  // 70-94 → review queue
                                  // < 70  → exception / manual review

// Tolerance band: a payment within ±2% of the invoice (or its remaining
// balance) is still treated as a "plausible same-invoice" payment for
// scoring purposes — actual settlement (PARTIAL/PAID/OVERPAID) is computed
// separately in settleInvoice() using the real amounts, not this band.
const AMOUNT_TOLERANCE_PCT = 0.02;

export type SettlementOutcome = 'EXACT' | 'UNDERPAID' | 'OVERPAID';

export interface SettlementResult {
  outcome: SettlementOutcome;
  newAmountPaid: number;
  remainingBalance: number;   // > 0 if UNDERPAID
  excessAmount: number;       // > 0 if OVERPAID
  newInvoiceStatus: InvoiceStatus;
}

export interface MatchResult {
  invoiceId: string | null;
  confidenceScore: number;
  scoreAmount: number;
  scoreCustomer: number;
  scoreTime: number;
  scoreReference: number;
  matchReason: string;
  action: 'AUTO_MATCH' | 'REVIEW_QUEUE' | 'EXCEPTION';
}

@Injectable()
export class ReconciliationEngine {
  private readonly logger = new Logger(ReconciliationEngine.name);

  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private ai: AiService,
  ) {}

  // ── MAIN ENTRY POINT ─────────────────────────────────────────────────
  // Called by the webhook handler after a transaction is stored.
  // Returns immediately — UI is already updated.
  // AI explanation is queued async.
  async reconcile(transaction: Transaction & { customer?: any }): Promise<MatchResult> {
    this.logger.log(`Reconciling transaction ${transaction.id} — ₦${transaction.amount}`);

    const duplicateSibling = await this.findDuplicateSibling(transaction);
    if (duplicateSibling) {
      return this.absorbDuplicate(transaction, duplicateSibling);
    }

    // 1. Find all open invoices for the customer on this virtual account
    const candidates = await this.findCandidateInvoices(transaction);

    if (candidates.length === 0) {
      return this.handleNoMatch(transaction);
    }

    // 2. Score each candidate
    const scored = candidates.map((invoice) => ({
      invoice,
      ...this.scoreMatch(transaction, invoice),
    }));

    // 3. Pick the highest scoring candidate
    scored.sort((a, b) => b.confidenceScore - a.confidenceScore);
    const best = scored[0];

    this.logger.log(
      `Best match: ${best.invoice.invoiceNumber} — score ${best.confidenceScore}/100`,
    );

    // 4. Route based on confidence threshold
    if (best.confidenceScore >= THRESHOLD_AUTO_MATCH) {
      return this.autoMatch(transaction, best.invoice, best);
    } else if (best.confidenceScore >= THRESHOLD_REVIEW) {
      return this.queueForReview(transaction, best.invoice, best);
    } else {
      return this.handleNoMatch(transaction, best);
    }
  }

  // ── SCORING ENGINE ────────────────────────────────────────────────────
  private scoreMatch(
    transaction: Transaction & { customer?: any },
    invoice: Invoice & { amountPaid: any },
  ): Omit<MatchResult, 'invoiceId' | 'action'> {
    const reasons: string[] = [];
    let scoreAmount = 0;
    let scoreCustomer = 0;
    let scoreTime = 0;
    let scoreReference = 0;

    // SIGNAL 1 — Amount plausibility match (60 points)
    // Compares the payment against the invoice's REMAINING balance, not
    // just the total — so a second partial payment still scores correctly.
    // Exact match on remaining balance scores full points. Partial or
    // over payments still score highly here because they are still very
    // likely the same invoice — the actual under/over outcome is computed
    // separately in settleInvoice() once this invoice is selected as the
    // best match.
    const txAmount = Number(transaction.amount);
    const invAmount = Number(invoice.amount);
    const alreadyPaid = Number(invoice.amountPaid ?? 0);
    const remainingBalance = Math.max(invAmount - alreadyPaid, 0);

    if (this.withinTolerance(txAmount, remainingBalance)) {
      scoreAmount = SCORE_EXACT_AMOUNT;
      reasons.push(`amount matches the outstanding balance (₦${remainingBalance.toLocaleString()})`);
    } else if (txAmount > remainingBalance) {
      // Overpayment relative to this invoice — still plausible, slightly
      // lower confidence since it could belong to a different invoice
      scoreAmount = Math.round(SCORE_EXACT_AMOUNT * 0.85);
      reasons.push(`payment exceeds outstanding balance by ₦${(txAmount - remainingBalance).toLocaleString()} (overpayment)`);
    } else if (txAmount >= remainingBalance * 0.3) {
      // Underpayment but still a meaningful fraction of the invoice —
      // plausible partial payment (e.g. deposit, installment)
      scoreAmount = Math.round(SCORE_EXACT_AMOUNT * 0.6);
      reasons.push(`partial payment of ₦${txAmount.toLocaleString()} against outstanding ₦${remainingBalance.toLocaleString()}`);
    } else {
      // Too small a fraction to confidently call this the same invoice
      scoreAmount = 0;
    }

    // SIGNAL 2 — Customer VA match (25 points)
    // The transaction arrived on a VA dedicated to a specific customer
    if (transaction.customer && invoice.customerId === transaction.customer.id) {
      scoreCustomer = SCORE_CUSTOMER_VA;
      reasons.push(`payment received on ${transaction.customer.name}'s dedicated virtual account`);
    }

    // SIGNAL 3 — Time window match (10 points)
    // Full points if paid within 7 days of invoice creation
    // Partial if paid within 30 days
    const invoiceAge = this.daysBetween(invoice.createdAt, transaction.paymentDate);
    if (invoiceAge >= 0 && invoiceAge <= 7) {
      scoreTime = SCORE_TIME_WINDOW;
      reasons.push(`payment received ${invoiceAge} day(s) after invoice issuance`);
    } else if (invoiceAge > 7 && invoiceAge <= 30) {
      scoreTime = Math.round(SCORE_TIME_WINDOW * 0.6);
      reasons.push(`payment received ${invoiceAge} days after invoice issuance`);
    } else if (invoiceAge < 0) {
      // Payment arrived before invoice — unusual but possible (advance payment)
      scoreTime = Math.round(SCORE_TIME_WINDOW * 0.3);
      reasons.push(`payment arrived ${Math.abs(invoiceAge)} day(s) before invoice issuance`);
    }

    // SIGNAL 4 — Reference field match (5 points)
    const ref = (transaction.nombaReference || '').toLowerCase();
    const invNum = invoice.invoiceNumber.toLowerCase();
    if (ref.includes(invNum) || ref.includes(invNum.replace('inv-', ''))) {
      scoreReference = SCORE_REFERENCE;
      reasons.push(`payment reference contains invoice number (${invoice.invoiceNumber})`);
    }

    const confidenceScore = scoreAmount + scoreCustomer + scoreTime + scoreReference;
    const matchReason = reasons.join('; ');

    return { confidenceScore, scoreAmount, scoreCustomer, scoreTime, scoreReference, matchReason };
  }

  // ── ACTION HANDLERS ───────────────────────────────────────────────────
  private async autoMatch(
    transaction: Transaction,
    invoice: Invoice,
    scores: any,
  ): Promise<MatchResult> {
    const settlement = this.computeSettlement(transaction, invoice);
    this.logger.log(
      `AUTO-MATCH: ${invoice.invoiceNumber} at ${scores.confidenceScore}% — settlement: ${settlement.outcome}`,
    );

    // Create the match record — template explanation is immediate; Gemini may polish later
    const match = await this.prisma.reconciliationMatch.create({
      data: {
        invoiceId: invoice.id,
        transactionId: transaction.id,
        scoreAmount: scores.scoreAmount,
        scoreCustomer: scores.scoreCustomer,
        scoreTime: scores.scoreTime,
        scoreReference: scores.scoreReference,
        confidenceScore: scores.confidenceScore,
        matchReason: scores.matchReason,
        autoMatched: true,
        aiExplanation: this.ai.buildMatchExplanationTemplate({
          transactionAmount: Number(transaction.amount),
          invoiceNumber: invoice.invoiceNumber,
          invoiceAmount: Number(invoice.amount),
          confidenceScore: scores.confidenceScore,
          matchReason: scores.matchReason,
          payerName: transaction.payerName ?? undefined,
          paymentDate: transaction.paymentDate,
          invoiceCreatedAt: invoice.createdAt,
        }),
      },
    });

    // Apply the real settlement outcome to the invoice
    await this.prisma.invoice.update({
      where: { id: invoice.id },
      data: {
        amountPaid: settlement.newAmountPaid,
        status: settlement.newInvoiceStatus,
      },
    });

    // Mark transaction as MATCHED
    await this.prisma.transaction.update({
      where: { id: transaction.id },
      data: { status: TransactionStatus.MATCHED },
    });

    // Audit log
    await this.audit.log({
      organizationId: invoice.organizationId,
      action: 'MATCH_AUTO',
      entity: 'ReconciliationMatch',
      entityId: match.id,
      newValue: {
        invoiceId: invoice.id,
        transactionId: transaction.id,
        confidence: scores.confidenceScore,
        settlement: settlement.outcome,
        amountPaid: settlement.newAmountPaid,
        remainingBalance: settlement.remainingBalance,
        excessAmount: settlement.excessAmount,
      },
    });

    // UNDERPAID — log it clearly so the customer statement and dashboard
    // surface the remaining balance. No further action needed; invoice
    // stays open at PARTIAL until the next payment arrives.
    if (settlement.outcome === 'UNDERPAID') {
      await this.audit.log({
        organizationId: invoice.organizationId,
        action: 'INVOICE_PARTIALLY_PAID',
        entity: 'Invoice',
        entityId: invoice.id,
        newValue: {
          amountPaid: settlement.newAmountPaid,
          remainingBalance: settlement.remainingBalance,
        },
      });
    }

    // OVERPAID — create an OverpaymentAction record so the merchant can
    // choose how to resolve the excess: refund, credit wallet, or apply
    // to a future invoice. This is the part most teams skip.
    if (settlement.outcome === 'OVERPAID') {
      const overpayment = await this.prisma.overpaymentAction.create({
        data: {
          invoiceId: invoice.id,
          customerId: invoice.customerId,
          transactionId: transaction.id,
          excessAmount: settlement.excessAmount,
          actionType: 'CREDIT_WALLET', // sensible default; merchant can change before resolving
          status: 'PENDING',
        },
      });

      await this.audit.log({
        organizationId: invoice.organizationId,
        action: 'OVERPAYMENT_DETECTED',
        entity: 'OverpaymentAction',
        entityId: overpayment.id,
        newValue: {
          invoiceId: invoice.id,
          excessAmount: settlement.excessAmount,
        },
      });
    }

    // Queue AI explanation ASYNC — don't block the response
    this.generateAiExplanationAsync(match.id, transaction, invoice, scores).catch((err) =>
      this.logger.error(`AI explanation failed for match ${match.id}:`, err),
    );

    return {
      invoiceId: invoice.id,
      ...scores,
      action: 'AUTO_MATCH',
    };
  }

  private async queueForReview(
    transaction: Transaction,
    invoice: Invoice,
    scores: any,
  ): Promise<MatchResult> {
    this.logger.log(`REVIEW QUEUE: ${invoice.invoiceNumber} at ${scores.confidenceScore}%`);

    const match = await this.prisma.reconciliationMatch.create({
      data: {
        invoiceId: invoice.id,
        transactionId: transaction.id,
        scoreAmount: scores.scoreAmount,
        scoreCustomer: scores.scoreCustomer,
        scoreTime: scores.scoreTime,
        scoreReference: scores.scoreReference,
        confidenceScore: scores.confidenceScore,
        matchReason: scores.matchReason,
        autoMatched: false,
        aiExplanation: this.ai.buildMatchExplanationTemplate({
          transactionAmount: Number(transaction.amount),
          invoiceNumber: invoice.invoiceNumber,
          invoiceAmount: Number(invoice.amount),
          confidenceScore: scores.confidenceScore,
          matchReason: scores.matchReason,
          payerName: transaction.payerName ?? undefined,
          paymentDate: transaction.paymentDate,
          invoiceCreatedAt: invoice.createdAt,
        }),
      },
    });

    await this.prisma.transaction.update({
      where: { id: transaction.id },
      data: { status: TransactionStatus.IN_REVIEW },
    });

    await this.audit.log({
      organizationId: invoice.organizationId,
      action: 'MATCH_REVIEW_QUEUED',
      entity: 'ReconciliationMatch',
      entityId: match.id,
      newValue: { confidence: scores.confidenceScore, reason: scores.matchReason },
    });

    // Still generate AI explanation async — ready when merchant opens the review item
    this.generateAiExplanationAsync(match.id, transaction, invoice, scores).catch((err) =>
      this.logger.error(`AI explanation failed for review ${match.id}:`, err),
    );

    return { invoiceId: invoice.id, ...scores, action: 'REVIEW_QUEUE' };
  }

  private async handleNoMatch(
    transaction: Transaction,
    bestCandidate?: any,
  ): Promise<MatchResult> {
    this.logger.warn(`NO MATCH: transaction ${transaction.id} — creating exception`);

    const isAnomaly = await this.detectAnomaly(transaction);

    const exception = await this.prisma.exception.create({
      data: {
        transactionId: transaction.id,
        type: isAnomaly ? 'ANOMALY' : 'NO_MATCH',
        description: isAnomaly
          ? `Transaction amount ₦${transaction.amount} is unusual for this account`
          : `No matching invoice found for ₦${transaction.amount}`,
      },
    });

    await this.prisma.transaction.update({
      where: { id: transaction.id },
      data: { status: TransactionStatus.EXCEPTION },
    });

    // Queue AI anomaly summary async
    this.generateAiAnomalySummaryAsync(exception.id, transaction).catch((err) =>
      this.logger.error(`AI anomaly summary failed:`, err),
    );

    return {
      invoiceId: null,
      confidenceScore: bestCandidate?.confidenceScore ?? 0,
      scoreAmount: bestCandidate?.scoreAmount ?? 0,
      scoreCustomer: bestCandidate?.scoreCustomer ?? 0,
      scoreTime: bestCandidate?.scoreTime ?? 0,
      scoreReference: bestCandidate?.scoreReference ?? 0,
      matchReason: 'No invoice match found',
      action: 'EXCEPTION',
    };
  }

  // ── ANOMALY DETECTION ─────────────────────────────────────────────────
  private async detectAnomaly(transaction: Transaction): Promise<boolean> {
    // Calculate the average transaction amount for this account over last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentTxns = await this.prisma.transaction.findMany({
      where: {
        accountNumber: transaction.accountNumber,
        paymentDate: { gte: thirtyDaysAgo },
        id: { not: transaction.id },
      },
      select: { amount: true },
    });

    if (recentTxns.length < 3) return false; // not enough history

    const amounts = recentTxns.map((t) => Number(t.amount));
    const avg = amounts.reduce((a, b) => a + b, 0) / amounts.length;
    const txAmount = Number(transaction.amount);

    // Flag if more than 3× the average
    return txAmount > avg * 3;
  }

  // ── HELPERS ───────────────────────────────────────────────────────────
  /** Same VA + amount + time window as an already-recorded payment (duplicate Nomba delivery). */
  private async findDuplicateSibling(transaction: Transaction) {
    const windowMs = 2 * 60 * 1000;
    return this.prisma.transaction.findFirst({
      where: {
        id: { not: transaction.id },
        accountNumber: transaction.accountNumber,
        amount: transaction.amount,
        status: {
          in: [
            TransactionStatus.MATCHED,
            TransactionStatus.MANUALLY_MATCHED,
            TransactionStatus.IN_REVIEW,
          ],
        },
        paymentDate: {
          gte: new Date(transaction.paymentDate.getTime() - windowMs),
          lte: new Date(transaction.paymentDate.getTime() + windowMs),
        },
      },
      include: { match: true },
    });
  }

  private async absorbDuplicate(
    transaction: Transaction,
    sibling: Transaction & { match?: { invoiceId: string } | null },
  ): Promise<MatchResult> {
    this.logger.warn(
      `Duplicate payment ${transaction.id} — sibling ${sibling.id} (${sibling.nombaReference}) already recorded`,
    );
    await this.prisma.exception.deleteMany({ where: { transactionId: transaction.id } });
    await this.prisma.reconciliationMatch.deleteMany({ where: { transactionId: transaction.id } });
    await this.prisma.transaction.delete({ where: { id: transaction.id } });

    if (transaction.customerId) {
      const customer = await this.prisma.customer.findUnique({
        where: { id: transaction.customerId },
      });
      if (customer) {
        await this.audit.log({
          organizationId: customer.organizationId,
          action: 'PAYMENT_DUPLICATE_DISCARDED',
          entity: 'Transaction',
          entityId: transaction.id,
          newValue: {
            nombaReference: transaction.nombaReference,
            siblingId: sibling.id,
            siblingReference: sibling.nombaReference,
            amount: Number(transaction.amount),
          },
        });
      }
    }

    return {
      invoiceId: sibling.match?.invoiceId ?? null,
      confidenceScore: 0,
      scoreAmount: 0,
      scoreCustomer: 0,
      scoreTime: 0,
      scoreReference: 0,
      matchReason: 'Duplicate delivery — payment already recorded',
      action: 'EXCEPTION',
    };
  }

  private async findCandidateInvoices(
    transaction: Transaction,
  ): Promise<(Invoice & { amountPaid: any })[]> {
    // Find open invoices for the customer linked to this virtual account.
    // Include OVERPAID so a second payment on an over-billed invoice is handled.
    return this.prisma.invoice.findMany({
      where: {
        customer: { virtualAccountNumber: transaction.accountNumber },
        status: {
          in: [
            InvoiceStatus.PENDING,
            InvoiceStatus.PARTIAL,
            InvoiceStatus.OVERDUE,
          ],
        },
      },
    }) as Promise<(Invoice & { amountPaid: any })[]>;
  }

  private daysBetween(date1: Date, date2: Date): number {
    const msPerDay = 1000 * 60 * 60 * 24;
    return Math.round((date2.getTime() - date1.getTime()) / msPerDay);
  }

  private withinTolerance(amount: number, target: number): boolean {
    if (target === 0) return amount === 0;
    return Math.abs(amount - target) / target <= AMOUNT_TOLERANCE_PCT;
  }

  // ── SETTLEMENT ────────────────────────────────────────────────────────
  // Given a transaction matched to an invoice, compute the real outcome:
  // EXACT (fully paid), UNDERPAID (partial — balance remains), or
  // OVERPAID (paid more than owed — needs resolution: refund, wallet
  // credit, or apply to a future invoice).
  private computeSettlement(transaction: Transaction, invoice: Invoice & { amountPaid: any }): SettlementResult {
    const txAmount = Number(transaction.amount);
    const invAmount = Number(invoice.amount);
    const alreadyPaid = Number(invoice.amountPaid ?? 0);
    const newAmountPaid = alreadyPaid + txAmount;

    if (this.withinTolerance(newAmountPaid, invAmount)) {
      return {
        outcome: 'EXACT',
        newAmountPaid: invAmount, // snap to exact to avoid floating residue
        remainingBalance: 0,
        excessAmount: 0,
        newInvoiceStatus: InvoiceStatus.PAID,
      };
    }

    if (newAmountPaid < invAmount) {
      return {
        outcome: 'UNDERPAID',
        newAmountPaid,
        remainingBalance: invAmount - newAmountPaid,
        excessAmount: 0,
        newInvoiceStatus: InvoiceStatus.PARTIAL,
      };
    }

    // newAmountPaid > invAmount
    return {
      outcome: 'OVERPAID',
      newAmountPaid,
      remainingBalance: 0,
      excessAmount: newAmountPaid - invAmount,
      newInvoiceStatus: InvoiceStatus.OVERPAID,
    };
  }

  // ── ASYNC AI EXPLANATION ──────────────────────────────────────────────
  // Runs in background — never blocks webhook handler or UI
  private async generateAiExplanationAsync(
    matchId: string,
    transaction: Transaction,
    invoice: Invoice,
    scores: any,
  ): Promise<void> {
    const explanation = await this.ai.generateMatchExplanation({
      transactionAmount: Number(transaction.amount),
      invoiceNumber: invoice.invoiceNumber,
      invoiceAmount: Number(invoice.amount),
      confidenceScore: scores.confidenceScore,
      matchReason: scores.matchReason,
      payerName: transaction.payerName,
      paymentDate: transaction.paymentDate,
      invoiceCreatedAt: invoice.createdAt,
    });

    await this.prisma.reconciliationMatch.update({
      where: { id: matchId },
      data: { aiExplanation: explanation },
    });
  }

  private async generateAiAnomalySummaryAsync(
    exceptionId: string,
    transaction: Transaction,
  ): Promise<void> {
    const summary = await this.ai.generateAnomalySummary({
      transactionAmount: Number(transaction.amount),
      payerName: transaction.payerName,
      payerAccount: transaction.payerAccount,
      accountNumber: transaction.accountNumber,
      paymentDate: transaction.paymentDate,
    });

    await this.prisma.exception.update({
      where: { id: exceptionId },
      data: { aiSummary: summary },
    });
  }
}
