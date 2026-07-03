// src/reconciliation/reconciliation.controller.ts
import { Controller, Post, Get, Body, Param, UseGuards } from '@nestjs/common';
import { ReconciliationService } from './reconciliation.service';
import { TransactionSyncService } from './transaction-sync.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { IsString, IsOptional, IsNumber, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';

export class ManualMatchDto {
  @IsString() transactionId: string;
  @IsString() invoiceId: string;
  @IsString() reason: string;
}

export class ResolveOverpaymentDto {
  @IsString() actionType: 'REFUND' | 'CREDIT_WALLET' | 'APPLY_TO_FUTURE_INVOICE';
  @IsOptional() @IsString() appliedToInvoiceId?: string;
  @IsOptional() @IsString() refundReference?: string;
  @IsOptional() @IsString() refundAccountNumber?: string;
  @IsOptional() @IsString() refundBankCode?: string;
  @IsOptional() @IsString() refundAccountName?: string;
  @IsOptional() @IsString() notes?: string;
}

export class RecoverBySessionDto {
  @IsString() sessionId: string;
}

export class SearchPaymentsDto {
  @IsString() customerId: string;
  @IsOptional() @IsDateString() dateFrom?: string;
  @IsOptional() @IsDateString() dateTo?: string;
  @IsOptional() @IsNumber() @Type(() => Number) amount?: number;
}

export class ImportPaymentDto {
  @IsString() customerId: string;
  @IsString() sessionId: string;
}

@Controller('reconciliation')
@UseGuards(JwtAuthGuard)
export class ReconciliationController {
  constructor(
    private reconciliationService: ReconciliationService,
    private transactionSync: TransactionSyncService,
  ) {}

  @Get('matches')
  getMatches(@CurrentUser() user: any) {
    return this.reconciliationService.getMatches(user.organizationId);
  }

  @Get('review-queue')
  getReviewQueue(@CurrentUser() user: any) {
    return this.reconciliationService.getReviewQueue(user.organizationId);
  }

  @Post('manual-match')
  manualMatch(@Body() dto: ManualMatchDto, @CurrentUser() user: any) {
    return this.reconciliationService.manualMatch(dto, user.id, user.organizationId);
  }

  @Post('confirm/:matchId')
  confirmMatch(@Param('matchId') matchId: string, @CurrentUser() user: any) {
    return this.reconciliationService.confirmMatch(matchId, user.id, user.organizationId);
  }

  @Post('run')
  runEngine(@CurrentUser() user: any) {
    return this.reconciliationService.runEngine(user.organizationId, user.id);
  }

  @Get('overpayments')
  getOverpayments(@CurrentUser() user: any) {
    return this.reconciliationService.getOverpayments(user.organizationId);
  }

  @Post('overpayments/:id/resolve')
  resolveOverpayment(
    @Param('id') id: string,
    @Body() dto: ResolveOverpaymentDto,
    @CurrentUser() user: any,
  ) {
    return this.reconciliationService.resolveOverpayment(id, dto, user.id, user.organizationId);
  }

  /** Manual trigger — sync Virtual Account history from Nomba for this org. */
  @Post('sync')
  syncTransactions(@CurrentUser() user: any) {
    return this.transactionSync.syncOrganization(user.organizationId);
  }

  /** Search Nomba for payments on a student's VA (merchant recovery — no parent session ID). */
  @Post('recover-payment/search')
  searchPayments(@Body() dto: SearchPaymentsDto, @CurrentUser() user: any) {
    return this.transactionSync.searchPaymentsForCustomer(user.organizationId, dto.customerId, {
      dateFrom: dto.dateFrom,
      dateTo: dto.dateTo,
      amount: dto.amount,
    });
  }

  /** Import a payment found via recover-payment/search. */
  @Post('recover-payment/import')
  importPayment(@Body() dto: ImportPaymentDto, @CurrentUser() user: any) {
    return this.transactionSync.importPaymentForCustomer(
      user.organizationId,
      dto.customerId,
      dto.sessionId,
    );
  }

  /** Last resort — recover by OPay session ID from a receipt. */
  @Post('recover-session')
  recoverBySession(@Body() dto: RecoverBySessionDto, @CurrentUser() user: any) {
    return this.transactionSync.recoverBySessionId(dto.sessionId, user.organizationId);
  }
}
