// src/treasury/treasury.controller.ts
import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { TreasuryService } from './treasury.service';

class WithdrawDto {
  @IsNumber() @Min(1) amount: number;
  @IsString() bankCode: string;
  @IsString() accountNumber: string;
  @IsString() accountName: string;
  @IsOptional() @IsString() narration?: string;
}

@Controller('treasury')
@UseGuards(JwtAuthGuard)
export class TreasuryController {
  constructor(private treasury: TreasuryService) {}

  @Get()
  overview(@CurrentUser() user: { organizationId: string }) {
    return this.treasury.getOverview(user.organizationId);
  }

  @Post('provision')
  provision(@CurrentUser() user: { organizationId: string }) {
    return this.treasury.ensureSubAccount(user.organizationId).then(() => ({
      status: 'connected',
      message: 'Payment infrastructure is ready for your workspace',
    }));
  }

  @Get('lookup')
  lookup(
    @CurrentUser() user: { organizationId: string },
    @Query('bankCode') bankCode: string,
    @Query('accountNumber') accountNumber: string,
  ) {
    return this.treasury.lookupAccount(user.organizationId, bankCode, accountNumber);
  }

  @Post('withdraw')
  withdraw(
    @CurrentUser() user: { sub: string; organizationId: string },
    @Body() dto: WithdrawDto,
  ) {
    return this.treasury.withdraw(user.organizationId, user.sub, dto);
  }
}
