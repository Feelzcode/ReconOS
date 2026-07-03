// src/insights/insights.module.ts
import { Module } from '@nestjs/common';
import { InsightsController } from './insights.controller';
import { InsightsService } from './insights.service';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [AiModule],
  controllers: [InsightsController],
  providers: [InsightsService],
})
export class InsightsModule {}
