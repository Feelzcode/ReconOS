import { Module } from '@nestjs/common';
import { CustomersController } from './customers.controller';
import { CustomersService } from './customers.service';
import { AuditModule } from '../audit/audit.module';
import { TreasuryModule } from '../treasury/treasury.module';

@Module({
  imports: [AuditModule, TreasuryModule],
  controllers: [CustomersController],
  providers: [CustomersService],
  exports: [CustomersService],
})
export class CustomersModule {}
