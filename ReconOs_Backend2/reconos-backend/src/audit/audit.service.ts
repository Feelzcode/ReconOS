// src/audit/audit.service.ts

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

interface AuditLogDto {
  organizationId: string;
  userId?: string;
  action: string;
  entity: string;
  entityId: string;
  oldValue?: any;
  newValue?: any;
  ipAddress?: string;
}

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  async log(dto: AuditLogDto): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        organizationId: dto.organizationId,
        userId: dto.userId ?? null,
        action: dto.action,
        entity: dto.entity,
        entityId: dto.entityId,
        oldValue: dto.oldValue ?? undefined,
        newValue: dto.newValue ?? undefined,
        ipAddress: dto.ipAddress ?? null,
      },
    });
  }
}
