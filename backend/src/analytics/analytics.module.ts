import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AnalyticsController } from './controllers/analytics.controller';
import { ANALYTICS_REPOSITORY_PORT } from './ports/analytics-repository.port';
import { PrismaAnalyticsRepository } from './repositories/prisma-analytics.repository';
import { AnalyticsService } from './services/analytics.service';

@Module({
  imports: [PrismaModule],
  controllers: [AnalyticsController],
  providers: [
    AnalyticsService,
    PrismaAnalyticsRepository,
    { provide: ANALYTICS_REPOSITORY_PORT, useExisting: PrismaAnalyticsRepository },
  ],
})
export class AnalyticsModule {}
