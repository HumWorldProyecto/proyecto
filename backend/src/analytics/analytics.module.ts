import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { SentimentQueryController } from './controllers/sentiment-query.controller';
import { AnalyticsController } from './controllers/analytics.controller';
import { ANALYTICS_REPOSITORY_PORT } from './ports/analytics-repository.port';
import { PrismaAnalyticsRepository } from './repositories/prisma-analytics.repository';
import { AnalyticsService } from './services/analytics.service';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [AnalyticsController, SentimentQueryController],
  providers: [
    AnalyticsService,
    PrismaAnalyticsRepository,
    { provide: ANALYTICS_REPOSITORY_PORT, useExisting: PrismaAnalyticsRepository },
  ],
})
export class AnalyticsModule {}
