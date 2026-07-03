// src/invoices/invoices.controller.ts
import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { InvoicesService } from './invoices.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { IsString, IsNumber, IsDateString, IsOptional, IsPositive, MinLength } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateInvoiceDto {
  @IsString() customerId: string;
  @IsString() @MinLength(1) description: string;
  @IsNumber() @IsPositive() @Type(() => Number) amount: number;
  @IsDateString() dueDate: string;
  @IsOptional() @IsString() notes?: string;
}

export class UpdateInvoiceDto {
  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsString() @MinLength(1) description?: string;
  @IsOptional() @IsString() notes?: string;
}

@Controller('invoices')
@UseGuards(JwtAuthGuard)
export class InvoicesController {
  constructor(private invoicesService: InvoicesService) {}

  @Post()
  create(@Body() dto: CreateInvoiceDto, @CurrentUser() user: any) {
    return this.invoicesService.create(dto, user.organizationId);
  }

  @Get()
  findAll(@CurrentUser() user: any, @Query('status') status?: string) {
    return this.invoicesService.findAll(user.organizationId, status);
  }

  @Get('overdue')
  getOverdue(@CurrentUser() user: any) {
    return this.invoicesService.getOverdue(user.organizationId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.invoicesService.findOne(id, user.organizationId);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateInvoiceDto, @CurrentUser() user: any) {
    return this.invoicesService.update(id, dto, user.organizationId, user.id);
  }
}
