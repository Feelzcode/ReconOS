// src/transactions/transactions.controller.ts
import { Controller, Get, Post, Param, Query, UseGuards } from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';

@Controller('transactions')
@UseGuards(JwtAuthGuard)
export class TransactionsController {
  constructor(private transactionsService: TransactionsService) {}

  @Get()
  findAll(@CurrentUser() user: any, @Query('status') status?: string) {
    return this.transactionsService.findAll(user.organizationId, status);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.transactionsService.findOne(id, user.organizationId);
  }

  @Get(':id/timeline')
  getTimeline(@Param('id') id: string, @CurrentUser() user: any) {
    return this.transactionsService.getTimeline(id, user.organizationId);
  }

  @Post(':id/verify')
  verifyWithNomba(@Param('id') id: string, @CurrentUser() user: any) {
    return this.transactionsService.verifyWithNomba(id, user.organizationId, user.id);
  }
}
