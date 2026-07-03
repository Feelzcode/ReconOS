// src/auth/auth.controller.ts
import { Controller, Post, Body, Get, Patch, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { IsString, IsEmail, MinLength, IsOptional, IsIn } from 'class-validator';
import { JwtAuthGuard } from './jwt-auth.guard';
import { CurrentUser } from './current-user.decorator';

export class RegisterDto {
  @IsString() orgName: string;
  @IsOptional() @IsString() industry?: string;
  @IsOptional() @IsIn(['education', 'property', 'healthcare', 'logistics', 'custom'])
  industryTemplate?: string;
  @IsOptional() @IsString() customerLabel?: string;
  @IsOptional() @IsString() invoiceLabel?: string;
  @IsString() name: string;
  @IsEmail() email: string;
  @IsString() @MinLength(8) password: string;
}

export class LoginDto {
  @IsEmail() email: string;
  @IsString() password: string;
}

export class SetupOrganizationDto {
  @IsIn(['education', 'property', 'healthcare', 'logistics', 'custom'])
  industryTemplate: string;
  @IsOptional() @IsString() customerLabel?: string;
  @IsOptional() @IsString() invoiceLabel?: string;
}

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Get('templates')
  listTemplates() {
    return this.authService.listIndustryTemplates();
  }

  @Patch('organization/setup')
  @UseGuards(JwtAuthGuard)
  setupOrganization(@CurrentUser() user: any, @Body() dto: SetupOrganizationDto) {
    return this.authService.setupOrganization(user.organizationId, dto);
  }
}
