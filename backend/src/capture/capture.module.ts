import { Module } from '@nestjs/common';
import { CaptureOrchestratorService } from './services/capture-orchestrator.service';
import { AutomaticCaptureJob } from './jobs/automatic-capture.job';
import { IntervalCaptureTrigger } from './jobs/interval-capture-trigger';
import { HttpRssFetcher } from './integrations/http-rss-fetcher';
import { BasicRssParser } from './integrations/basic-rss-parser';
import { RSS_FETCHER_PORT } from './ports/rss-fetcher.port';
import { RSS_PARSER_PORT } from './ports/rss-parser.port';
import { CAPTURE_TRIGGER_PORT } from './ports/capture-trigger.port';
import { NewsModule } from '../news/news.module';
import { RssHttpConfigModule } from '../rss-http/rss-http-config.module';

/**
 * Módulo de captura automática (HU-01). SOURCE_REGISTRY_PORT y
 * PERIODICITY_PROVIDER_PORT deben proveerse desde los módulos que
 * implementen HU-15 y HU-18 respectivamente; no se definen aquí sus
 * contratos internos definitivos. CAPTURE_OUTPUT_PORT lo provee NewsModule
 * (HU-04) mediante import; CaptureOrchestratorService y el contrato del
 * puerto no cambian.
 */
@Module({
  imports: [NewsModule, RssHttpConfigModule],
  providers: [
    CaptureOrchestratorService,
    AutomaticCaptureJob,
    { provide: CAPTURE_TRIGGER_PORT, useClass: IntervalCaptureTrigger },
    { provide: RSS_FETCHER_PORT, useClass: HttpRssFetcher },
    { provide: RSS_PARSER_PORT, useClass: BasicRssParser },
  ],
  exports: [CaptureOrchestratorService],
})
export class CaptureModule {}
