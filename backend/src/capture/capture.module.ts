import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { CaptureOrchestratorService } from './services/capture-orchestrator.service';
import { AutomaticCaptureJob } from './jobs/automatic-capture.job';
import { CaptureScheduler } from './jobs/capture-scheduler';
import { HttpRssFetcher } from './integrations/http-rss-fetcher';
import { RssOnlyParser } from './integrations/rss-only-parser';
import { RSS_FETCHER_PORT } from './ports/rss-fetcher.port';
import { RSS_PARSER_PORT } from './ports/rss-parser.port';
import { NewsModule } from '../news/news.module';
import { RssHttpConfigModule } from '../rss-http/rss-http-config.module';
import { SourcesModule } from '../sources/sources.module';
import { CaptureConfigModule } from '../capture-config/capture-config.module';

/**
 * Composición unidireccional del flujo automático HU-15 -> HU-01 -> HU-04,
 * con periodicidad y notificaciones administradas por HU-18.
 */
@Module({
  imports: [
    HttpModule,
    ScheduleModule.forRoot(),
    SourcesModule,
    CaptureConfigModule,
    NewsModule,
    RssHttpConfigModule,
  ],
  providers: [
    CaptureOrchestratorService,
    AutomaticCaptureJob,
    CaptureScheduler,
    { provide: RSS_FETCHER_PORT, useClass: HttpRssFetcher },
    { provide: RSS_PARSER_PORT, useClass: RssOnlyParser },
  ],
  exports: [CaptureOrchestratorService, AutomaticCaptureJob],
})
export class CaptureModule {}
