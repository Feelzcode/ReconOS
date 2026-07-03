import { Controller, Get, Post, Param, Query, UseGuards } from '@nestjs/common';
import { ExceptionsService } from './exceptions.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';

@Controller('exceptions')
@UseGuards(JwtAuthGuard)
export class ExceptionsController {
  constructor(private exceptionsService: ExceptionsService) {}

  @Get()
  findAll(
    @Query('status') status: string,
    @Query('type') type: string,
    @CurrentUser() user: any,
  ) {
    return this.exceptionsService.findAll(user.organizationId, status, type);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.exceptionsService.findOne(id, user.organizationId);
  }

  @Post(':id/investigate')
  markInvestigating(@Param('id') id: string, @CurrentUser() user: any) {
    return this.exceptionsService.markInvestigating(id, user.id, user.organizationId);
  }
}
