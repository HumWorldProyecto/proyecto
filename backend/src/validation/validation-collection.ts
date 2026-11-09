import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Interval } from '@nestjs/schedule';
import { DictionaryLanguage } from '@prisma/client';
import { AutomaticCaptureJob } from '../capture/jobs/automatic-capture.job';
import { PrismaService } from '../prisma/prisma.service';
import { NewsSentimentEvidenceService } from '../sentiment/services/news-sentiment-evidence.service';
import feeds from './feeds.json';

const feedLanguages = new Map(feeds.map(({ url, language }) => [url, language as DictionaryLanguage]));
const catalogUrls = [...feedLanguages.keys()];

@Injectable()
export class ValidationCollection implements OnApplicationBootstrap {
  private readonly logger = new Logger(ValidationCollection.name);
  private processing = false;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly capture: AutomaticCaptureJob,
    private readonly sentiment: NewsSentimentEvidenceService,
  ) {}

  onApplicationBootstrap(): void {
    if (this.enabled()) {
      void this.captureInitialNews().catch(() => this.logger.warn('La captura inicial se reintentará en el ciclo programado.'));
    }
  }

  private enabled(): boolean {
    return this.config.get<string>('HUMWORLD_VALIDATION_MODE') === '1';
  }

  private async captureInitialNews(): Promise<void> {
    const existing = await this.prisma.news.findFirst({ select: { id: true } });
    if (!existing) {
      await this.capture.run();
      this.logger.log('Terminó el primer ciclo de captura de validación.');
    }
  }

  @Interval('validation-sentiment', 15_000)
  async analyzePending(): Promise<void> {
    if (!this.enabled() || this.processing) return;
    this.processing = true;
    try {
      const pending = await this.prisma.news.findMany({
        where: { sentimentAnalyzedAt: null, source: { OR: [{ language: { not: null } }, { url: { in: catalogUrls } }] } },
        orderBy: [{ capturedAt: 'asc' }, { id: 'asc' }],
        select: { id: true, source: { select: { url: true, language: true } } },
        take: 400,
      });
      let saved = 0;
      let failed = 0;
      for (const news of pending) {
        const language = news.source.language ?? feedLanguages.get(news.source.url);
        if (!language) continue;
        try {
          const analysis = await this.sentiment.analyzeNews({ newsId: news.id, language });
          const updated = await this.prisma.news.updateMany({
            where: { id: news.id, sentimentAnalyzedAt: null },
            data: {
              sentimentScore: analysis.score,
              sentimentMatchedTerms: analysis.matchedTerms,
              sentimentLanguage: language,
              sentimentAnalyzedAt: new Date(),
              sentimentTerms: analysis.terms.map(term => ({ ...term })),
            },
          });
          saved += updated.count;
        } catch {
          failed += 1;
        }
      }
      if (saved) this.logger.log(`Análisis guardados en validación: ${saved}.`);
      if (failed) this.logger.warn(`Análisis pendientes para reintentar: ${failed}.`);
    } catch {
      this.logger.warn('No se pudo consultar la cola de análisis de validación.');
    } finally {
      this.processing = false;
    }
  }
}
