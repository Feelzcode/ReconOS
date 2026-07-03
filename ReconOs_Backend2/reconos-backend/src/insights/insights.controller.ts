// src/insights/insights.controller.ts
import { Controller, Get, UseGuards } from '@nestjs/common';
import { InsightsService } from './insights.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';

@Controller('insights')
@UseGuards(JwtAuthGuard)
export class InsightsController {
  constructor(private insightsService: InsightsService) {}

  @Get()
  getDashboardInsights(@CurrentUser() user: any) {
    return this.insightsService.getDashboardInsights(user.organizationId);
  }

  @Get('anomalies')
  getAnomalies(@CurrentUser() user: any) {
    return this.insightsService.getAnomalies(user.organizationId);
  }

  @Get('collections')
  getCollectionInsight(@CurrentUser() user: any) {
    return this.insightsService.getCollectionInsight(user.organizationId);
  }
}
