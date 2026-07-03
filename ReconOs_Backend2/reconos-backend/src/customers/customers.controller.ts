// src/customers/customers.controller.ts
import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { CustomersService } from './customers.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { IsString, IsEmail, IsOptional } from 'class-validator';

export class CreateCustomerDto {
  @IsString() name: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() phone?: string;
}

export class UpdateCustomerDto {
  @IsString() name: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() phone?: string;
}

@Controller('customers')
@UseGuards(JwtAuthGuard)
export class CustomersController {
  constructor(private customersService: CustomersService) {}

  @Post()
  create(@Body() dto: CreateCustomerDto, @CurrentUser() user: any) {
    return this.customersService.create(dto, user.organizationId);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateCustomerDto, @CurrentUser() user: any) {
    return this.customersService.update(id, dto, user.organizationId);
  }

  @Get()
  findAll(@CurrentUser() user: any) {
    return this.customersService.findAll(user.organizationId);
  }

  @Get(':id/statement')
  getStatement(@Param('id') id: string, @CurrentUser() user: any) {
    return this.customersService.getStatement(id, user.organizationId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.customersService.findOne(id, user.organizationId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.customersService.remove(id, user.organizationId);
  }
}
