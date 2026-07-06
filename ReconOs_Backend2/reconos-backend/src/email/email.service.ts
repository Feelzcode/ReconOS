import {
  BadRequestException,
  Injectable,
  Logger,
  OnModuleInit,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  EmailTemplateId,
  TemplateData,
  renderEmailTemplate,
} from './templates';
import { maskEmail } from './templates/layout';

export type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
};

@Injectable()
export class EmailService implements OnModuleInit {
  private readonly logger = new Logger(EmailService.name);

  constructor(private config: ConfigService) {}

  onModuleInit(): void {
    const hint = this.getConfigHint();
    if (!hint.configured) {
      this.logger.warn('RESEND_API_KEY not set — invoice emails disabled');
      return;
    }
    if (hint.testOnly) {
      this.logger.warn(
        `Email sender is ${hint.from} (test mode — can only reach your Resend account email). Set EMAIL_FROM to a verified domain address.`,
      );
      return;
    }
    this.logger.log(`Email sender: ${hint.from}`);
  }

  isConfigured(): boolean {
    return !!this.config.get<string>('RESEND_API_KEY', '').trim();
  }

  async send(input: SendEmailInput): Promise<{ id: string }> {
    const apiKey = this.config.get<string>('RESEND_API_KEY', '').trim();
    if (!apiKey) {
      throw new ServiceUnavailableException(
        'Email is not configured. Set RESEND_API_KEY on the server.',
      );
    }

    const from =
      this.config.get<string>('EMAIL_FROM', '').trim() ||
      'ReconOS <onboarding@resend.dev>';

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [input.to],
        subject: input.subject,
        html: input.html,
        text: input.text,
        reply_to: input.replyTo,
      }),
    });

    const data = (await response.json().catch(() => ({}))) as {
      message?: string;
      name?: string;
      statusCode?: number;
    };

    if (!response.ok) {
      const detail = data.message ?? response.statusText;
      this.logger.error(
        `Resend error ${response.status}: ${data.name ?? ''} ${detail}`,
      );
      throw new BadRequestException(this.mapResendError(response.status, detail, from));
    }

    const id = (data as { id?: string }).id ?? 'sent';
    this.logger.log(`Email sent to ${input.to} (${id})`);
    return { id };
  }

  renderTemplate(templateId: EmailTemplateId, data: TemplateData = {}) {
    return renderEmailTemplate(templateId, data);
  }

  async sendTemplate(
    to: string,
    templateId: EmailTemplateId,
    data: TemplateData = {},
    opts?: { replyTo?: string },
  ): Promise<{ id: string }> {
    const draft = this.renderTemplate(templateId, data);
    return this.send({
      to,
      subject: draft.subject,
      html: draft.html,
      text: draft.text,
      replyTo: opts?.replyTo,
    });
  }

  buildPaymentRequestEmail(input: {
    merchantName: string;
    customerName: string;
    invoiceNumber: string;
    description: string;
    amountDue: number;
    dueDate: string;
    paymentUrl: string;
    accountNumber?: string | null;
    bankName?: string | null;
    accountName?: string | null;
    replyTo?: string;
  }): Omit<SendEmailInput, 'to'> {
    const draft = this.renderTemplate('payment-request', {
      merchantName: input.merchantName,
      customerName: input.customerName,
      invoiceNumber: input.invoiceNumber,
      description: input.description,
      amountDue: input.amountDue,
      dueDate: input.dueDate,
      paymentUrl: input.paymentUrl,
      accountNumber: input.accountNumber ?? undefined,
      bankName: input.bankName ?? undefined,
      accountName: input.accountName ?? undefined,
    });

    return {
      subject: draft.subject,
      html: draft.html,
      text: draft.text,
      replyTo: input.replyTo,
    };
  }

  /** Mask email for OTP UI — e.g. d••••l@email.com */
  maskEmailForDisplay(email: string): string {
    return maskEmail(email);
  }

  /** Turn Resend API errors into actionable merchant-facing messages. */
  private mapResendError(status: number, detail: string, from: string): string {
    const lower = detail.toLowerCase();
    const usesResendDev = /@resend\.dev/i.test(from);

    if (
      lower.includes('only send testing emails') ||
      lower.includes('your own email address')
    ) {
      if (usesResendDev) {
        return (
          'Resend test sender (onboarding@resend.dev) can only email the address on your Resend account. ' +
          'Set EMAIL_FROM to an address on your verified domain (e.g. ReconOS <noreply@yourdomain.com>) in .env, restart the backend, and on Render.'
        );
      }
      return (
        `Sender "${from}" is not verified on this Resend account. ` +
        'Add and verify the domain at resend.com/domains, set EMAIL_FROM to an address on that domain, then restart the backend.'
      );
    }

    if (status === 403 && usesResendDev) {
      return (
        'Resend test sender (onboarding@resend.dev) can only email the address on your Resend account. ' +
        'To email customers, set EMAIL_FROM to an address on your verified domain ' +
        '(e.g. ReconOS <noreply@yourdomain.com>) in .env and on Render.'
      );
    }

    if (
      lower.includes('not verified') ||
      lower.includes('domain') ||
      lower.includes('from address') ||
      (status === 403 && lower.includes('verify'))
    ) {
      return (
        `Sender "${from}" is not allowed for this Resend API key. ` +
        'Confirm your domain shows Verified at resend.com/domains, then restart the backend after changing EMAIL_FROM.'
      );
    }

    if (detail && detail.length < 240) return detail;

    return 'Could not send email. Check EMAIL_FROM matches your verified domain in Resend.';
  }

  /** For ops: whether Resend is wired and which sender is configured. */
  getConfigHint(): { configured: boolean; from: string; testOnly: boolean } {
    const from =
      this.config.get<string>('EMAIL_FROM', '').trim() ||
      'ReconOS <onboarding@resend.dev>';
    return {
      configured: this.isConfigured(),
      from,
      testOnly: /@resend\.dev/i.test(from),
    };
  }
}
