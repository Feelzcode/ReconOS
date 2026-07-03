// src/ai/ai.service.ts
// Gemini is optional polish on top of deterministic explanations.
// Template text is always written first so the UI never waits on quota.

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';

export interface MatchExplanationInput {
  transactionAmount: number;
  invoiceNumber: string;
  invoiceAmount: number;
  confidenceScore: number;
  matchReason: string;
  payerName?: string;
  paymentDate: Date;
  invoiceCreatedAt: Date;
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly genAI: GoogleGenerativeAI | null;
  private readonly modelName: string;
  private readonly enhanceEnabled: boolean;
  private quotaBlockedUntil = 0;
  private dailyCallCount = 0;
  private dailyResetKey = '';

  constructor(private config: ConfigService) {
    const apiKey = config.get('GEMINI_API_KEY', '');
    this.genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;
    this.modelName = config.get('GEMINI_MODEL', 'gemini-2.0-flash');
    this.enhanceEnabled = config.get('GEMINI_ENHANCE_EXPLANATIONS', 'true') === 'true';
  }

  /** Instant, zero-quota explanation — always available in the UI. */
  buildMatchExplanationTemplate(data: MatchExplanationInput): string {
    const payer = data.payerName?.trim() || 'the payer';
    const daysDiff = Math.round(
      (data.paymentDate.getTime() - data.invoiceCreatedAt.getTime()) / (1000 * 60 * 60 * 24),
    );
    const timing =
      daysDiff >= 0
        ? `${daysDiff} day(s) after the invoice was issued`
        : `${Math.abs(daysDiff)} day(s) before the invoice was issued`;

    const shortReason = data.matchReason.split(';').slice(0, 2).join('; ');

    return (
      `Matched to ${data.invoiceNumber} (${data.confidenceScore}% confidence): ` +
      `₦${data.transactionAmount.toLocaleString()} from ${payer} against invoice ` +
      `₦${data.invoiceAmount.toLocaleString()}, received ${timing}. ` +
      `${shortReason}.`
    );
  }

  private resetDailyCounterIfNeeded(): void {
    const today = new Date().toISOString().slice(0, 10);
    if (this.dailyResetKey !== today) {
      this.dailyResetKey = today;
      this.dailyCallCount = 0;
    }
  }

  private isQuotaError(err: unknown): boolean {
    const msg = String(err);
    return msg.includes('429') || msg.toLowerCase().includes('quota');
  }

  private async generateText(prompt: string, maxOutputTokens: number): Promise<string> {
    if (!this.genAI) return '';
    const model = this.genAI.getGenerativeModel({
      model: this.modelName,
      generationConfig: { maxOutputTokens, temperature: 0.2 },
    });
    const result = await model.generateContent(prompt);
    return result.response.text().trim();
  }

  /** Template first; optional one-sentence Gemini polish when quota allows. */
  async generateMatchExplanation(data: MatchExplanationInput): Promise<string> {
    const template = this.buildMatchExplanationTemplate(data);

    if (!this.enhanceEnabled || !this.genAI || Date.now() < this.quotaBlockedUntil) {
      return template;
    }

    this.resetDailyCounterIfNeeded();
    const dailyLimit = Number(this.config.get('GEMINI_DAILY_LIMIT', '50'));
    if (this.dailyCallCount >= dailyLimit) {
      this.logger.warn(`Gemini daily limit (${dailyLimit}) reached — using template only`);
      return template;
    }

    try {
      const prompt =
        `Rewrite in ONE short sentence for a Nigerian school bursar. ` +
        `Payment ₦${data.transactionAmount} → ${data.invoiceNumber} ` +
        `(${data.confidenceScore}% confidence). Key: ${data.matchReason.slice(0, 100)}.`;

      const enhanced = await this.generateText(prompt, 48);
      this.dailyCallCount++;
      return enhanced.length > 10 ? enhanced : template;
    } catch (err) {
      if (this.isQuotaError(err)) {
        const cooldownMin = Number(this.config.get('GEMINI_QUOTA_COOLDOWN_MINUTES', '60'));
        this.quotaBlockedUntil = Date.now() + cooldownMin * 60 * 1000;
        this.logger.warn(`Gemini quota hit — template-only for ${cooldownMin} minutes`);
      } else {
        this.logger.error('Match explanation failed:', err);
      }
      return template;
    }
  }

  async generateAnomalySummary(data: {
    transactionAmount: number;
    payerName?: string;
    payerAccount?: string;
    accountNumber: string;
    paymentDate: Date;
  }): Promise<string> {
    const template =
      `Unusual payment of ₦${data.transactionAmount.toLocaleString()} from ` +
      `${data.payerName || 'an unknown sender'} on VA ${data.accountNumber}. ` +
      `Verify the sender before releasing goods or services.`;

    if (!this.enhanceEnabled || !this.genAI || Date.now() < this.quotaBlockedUntil) {
      return template;
    }

    try {
      const prompt =
        `One sentence. Flag ₦${data.transactionAmount} from ` +
        `${data.payerName || 'unknown'} on account ${data.accountNumber} as unusual. ` +
        `Say what the owner should do.`;
      const enhanced = await this.generateText(prompt, 40);
      return enhanced.length > 10 ? enhanced : template;
    } catch (err) {
      if (this.isQuotaError(err)) {
        this.quotaBlockedUntil = Date.now() + 60 * 60 * 1000;
      }
      return template;
    }
  }

  async generateCollectionInsight(data: {
    overdueInvoices: Array<{
      customerName: string;
      amount: number;
      daysOverdue: number;
      invoiceNumber: string;
    }>;
    totalOverdue: number;
    organizationName: string;
  }): Promise<string> {
    if (data.overdueInvoices.length === 0) {
      return 'All invoices are up to date. No collection action needed right now.';
    }

    const top = data.overdueInvoices
      .slice(0, 2)
      .map((i) => `${i.customerName} (₦${i.amount.toLocaleString()})`)
      .join(', ');

    const template =
      `${data.organizationName} has ₦${data.totalOverdue.toLocaleString()} overdue across ` +
      `${data.overdueInvoices.length} invoice(s). Follow up with: ${top}.`;

    if (!this.enhanceEnabled || !this.genAI || Date.now() < this.quotaBlockedUntil) {
      return template;
    }

    try {
      const prompt =
        `Two sentences max. Cash-flow advice for ${data.organizationName}: ` +
        `₦${data.totalOverdue.toLocaleString()} overdue. Top: ${top}.`;
      const enhanced = await this.generateText(prompt, 60);
      return enhanced.length > 15 ? enhanced : template;
    } catch (err) {
      if (this.isQuotaError(err)) {
        this.quotaBlockedUntil = Date.now() + 60 * 60 * 1000;
      }
      return template;
    }
  }
}
