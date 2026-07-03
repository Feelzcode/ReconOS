import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { ExceptionStatus } from '@prisma/client';

@Injectable()
export class ExceptionsService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  async findAll(organizationId: string, status?: string, type?: string) {
    return this.prisma.exception.findMany({
      where: {
        transaction: { customer: { organizationId } },
        ...(status ? { status: status as ExceptionStatus } : {}),
        ...(type ? { type: type as any } : {}),
      },
      include: {
        transaction: { include: { customer: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, organizationId: string) {
    const exception = await this.prisma.exception.findFirst({
      where: { id, transaction: { customer: { organizationId } } },
      include: {
        transaction: { include: { customer: true } },
      },
    });
    if (!exception) throw new NotFoundException('Exception not found');
    return exception;
  }

  async markInvestigating(id: string, userId: string, organizationId: string) {
    const exception = await this.findOne(id, organizationId);

    const updated = await this.prisma.exception.update({
      where: { id },
      data: { status: 'INVESTIGATING' },
    });

    await this.audit.log({
      organizationId,
      userId,
      action: 'EXCEPTION_INVESTIGATING',
      entity: 'Exception',
      entityId: id,
      newValue: { type: exception.type },
    });

    return updated;
  }
}
