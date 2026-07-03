import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { AuditPresenterService } from './audit-presenter.service';
import { OpsAuditGuard } from './ops-audit.guard';

@Controller('audit-logs')
@UseGuards(JwtAuthGuard)
export class AuditController {
  constructor(
    private prisma: PrismaService,
    private presenter: AuditPresenterService,
  ) {}

  /** Merchant Activity feed — business events only, human-readable. */
  @Get('activity')
  async getActivity(@CurrentUser() user: { organizationId: string }, @Query('q') q?: string) {
    const rows = await this.fetchRows(user.organizationId, 150);
    let presented = await this.presenter.present(rows, 'merchant');

    if (q?.trim()) {
      const needle = q.trim().toLowerCase();
      presented = presented.filter(
        (e) =>
          e.title.toLowerCase().includes(needle) ||
          e.summary.toLowerCase().includes(needle) ||
          e.customerName?.toLowerCase().includes(needle) ||
          e.invoiceNumber?.toLowerCase().includes(needle) ||
          e.lines.some((l) => l.toLowerCase().includes(needle)) ||
          e.action.toLowerCase().includes(needle),
      );
    }

    return presented;
  }

  /** ReconOS support / engineering — full ops + infrastructure events. */
  @Get('operations')
  @UseGuards(OpsAuditGuard)
  async getOperations(@CurrentUser() user: { organizationId: string }, @Query('q') q?: string) {
    const rows = await this.fetchRows(user.organizationId, 200);
    let presented = await this.presenter.present(rows, 'ops');

    if (q?.trim()) {
      const needle = q.trim().toLowerCase();
      presented = presented.filter(
        (e) =>
          e.title.toLowerCase().includes(needle) ||
          e.action.toLowerCase().includes(needle) ||
          JSON.stringify(e.technical).toLowerCase().includes(needle),
      );
    }

    return presented;
  }

  /** @deprecated Use /activity — kept for compatibility. */
  @Get()
  async findAll(@CurrentUser() user: { organizationId: string }) {
    return this.getActivity(user);
  }

  @Get('live-events')
  async getLiveEvents(@CurrentUser() user: { organizationId: string }) {
    const events = await this.prisma.auditLog.findMany({
      where: {
        organizationId: user.organizationId,
        action: {
          in: [
            'PAYMENT_RECEIVED',
            'PAYMENT_RECEIVED_WEBHOOK',
            'PAYMENT_RECOVERED',
            'PAYMENT_RECOVERED_MERCHANT_SEARCH',
            'PAYMENT_RECOVERED_SESSION_REQUERY',
            'PAYMENT_RECOVERED_HOURLY_SYNC',
            'PAYMENT_RECOVERED_NIGHTLY_SYNC',
            'TRANSACTION_SYNC_RECOVERED',
            'MATCH_AUTO',
            'MATCH_REVIEW_QUEUED',
            'INVOICE_PARTIALLY_PAID',
            'OVERPAYMENT_DETECTED',
            'OVERPAYMENT_RESOLVED',
          ],
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    return events.map((e) => ({
      id: e.id,
      action: e.action === 'PAYMENT_RECEIVED_WEBHOOK' ? 'PAYMENT_RECEIVED' : e.action,
      detail: e.newValue,
      timestamp: e.createdAt,
    }));
  }

  private fetchRows(organizationId: string, take: number) {
    return this.prisma.auditLog.findMany({
      where: { organizationId },
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
      take,
    });
  }
}
