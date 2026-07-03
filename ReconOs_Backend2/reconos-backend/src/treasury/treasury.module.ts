import { Module } from '@nestjs/common';
import { TreasuryController } from './treasury.controller';
import { TreasuryService } from './treasury.service';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  controllers: [TreasuryController],
  providers: [TreasuryService],
  exports: [TreasuryService],
})
export class TreasuryModule {}
