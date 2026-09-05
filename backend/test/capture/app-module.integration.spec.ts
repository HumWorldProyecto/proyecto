import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../../src/app.module';
import { InProcessPeriodicityChangeMediator } from '../../src/capture-config/integrations/in-process-periodicity-change-mediator';
import { RepositoryPeriodicityProvider } from '../../src/capture-config/integrations/repository-periodicity-provider';
import { PERIODICITY_CHANGE_NOTIFIER_PORT } from '../../src/capture-config/ports/periodicity-change.port';
import { PERIODICITY_PROVIDER_PORT } from '../../src/capture-config/ports/periodicity-provider.port';
import { HttpRssFetcher } from '../../src/capture/integrations/http-rss-fetcher';
import { RssOnlyParser } from '../../src/capture/integrations/rss-only-parser';
import { CaptureScheduler } from '../../src/capture/jobs/capture-scheduler';
import { CAPTURE_OUTPUT_PORT } from '../../src/capture/ports/capture-output.port';
import { RSS_FETCHER_PORT } from '../../src/capture/ports/rss-fetcher.port';
import { RSS_PARSER_PORT } from '../../src/capture/ports/rss-parser.port';
import { NewsCaptureOutputAdapter } from '../../src/news/integrations/news-capture-output.adapter';
import { PrismaService } from '../../src/prisma/prisma.service';
import { PrismaSourceRegistry } from '../../src/sources/integrations/prisma-source-registry';
import { SOURCE_REGISTRY_PORT } from '../../src/sources/ports/source-registry.port';

describe('AppModule productivo (integración PostgreSQL real)', () => {
  let app: INestApplication;
  let moduleRef: TestingModule;

  beforeAll(async () => {
    const preparation = new PrismaService();
    await preparation.$connect();
    await preparation.captureConfig.deleteMany();
    await preparation.$disconnect();

    moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => app.close());

  it('bootstrappea sin doubles ni ciclos y resuelve los providers reales', () => {
    expect(moduleRef.get(SOURCE_REGISTRY_PORT)).toBeInstanceOf(PrismaSourceRegistry);
    expect(moduleRef.get(PERIODICITY_PROVIDER_PORT)).toBeInstanceOf(
      RepositoryPeriodicityProvider,
    );
    expect(moduleRef.get(PERIODICITY_CHANGE_NOTIFIER_PORT)).toBeInstanceOf(
      InProcessPeriodicityChangeMediator,
    );
    expect(moduleRef.get(CAPTURE_OUTPUT_PORT)).toBeInstanceOf(NewsCaptureOutputAdapter);
    expect(moduleRef.get(RSS_FETCHER_PORT)).toBeInstanceOf(HttpRssFetcher);
    expect(moduleRef.get(RSS_PARSER_PORT)).toBeInstanceOf(RssOnlyParser);
    expect(moduleRef.get(CaptureScheduler)).toBeInstanceOf(CaptureScheduler);
  });
});
