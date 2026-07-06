import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from './email.service';
import { EmailTemplateId, TemplateData } from './templates';

/** Fire-and-forget merchant notification emails (never throws to callers). */
@Injectable()
export class EmailNotificationsService {
  private readonly logger = new Logger(EmailNotificationsService.name);

  constructor(
    private email: EmailService,
    private prisma: PrismaService,
    private config: ConfigService,
  ) {}

  dashboardUrl(path = '/dashboard'): string {
    const base = this.config
      .get<string>('FRONTEND_URL', 'http://localhost:3000')
      .replace(/\/$/, '');
    return `${base}${path.startsWith('/') ? path : `/${path}`}`;
  }

  private async merchantEmail(organizationId: string): Promise<string | null> {
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { email: true },
    });
    return org?.email?.trim() || null;
  }

  notifyMerchant(
    organizationId: string,
    templateId: EmailTemplateId,
    data: TemplateData = {},
    path?: string,
  ): void {
    void this.sendMerchant(organizationId, templateId, data, path);
  }

  async sendMerchant(
    organizationId: string,
    templateId: EmailTemplateId,
    data: TemplateData = {},
    path?: string,
  ): Promise<void> {
    if (!this.email.isConfigured()) return;

    const to = await this.merchantEmail(organizationId);
    if (!to) return;

    await this.sendTo(to, templateId, data, path);
  }

  /** Send to an explicit address (auth emails, etc.). */
  notifyAddress(
    to: string,
    templateId: EmailTemplateId,
    data: TemplateData = {},
    path?: string,
  ): void {
    void this.sendTo(to, templateId, data, path);
  }

  private async sendTo(
    to: string,
    templateId: EmailTemplateId,
    data: TemplateData,
    path?: string,
  ): Promise<void> {
    if (!this.email.isConfigured()) return;

    try {
      await this.email.sendTemplate(to, templateId, {
        ...data,
        dashboardUrl: data.dashboardUrl ?? this.dashboardUrl(path),
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Email ${templateId} to ${to} skipped: ${msg}`);
    }
  }
}
