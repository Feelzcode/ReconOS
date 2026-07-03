import { Global, Module } from '@nestjs/common';
import { AuditService } from './audit.service';
import { AuditController } from './audit.controller';
import { AuditPresenterService } from './audit-presenter.service';
import { OpsAuditGuard } from './ops-audit.guard';

@Global()
@Module({
  controllers: [AuditController],
  providers: [AuditService, AuditPresenterService, OpsAuditGuard],
  exports: [AuditService],
})
export class AuditModule {}
