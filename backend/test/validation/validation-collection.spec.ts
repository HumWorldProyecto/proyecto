import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../src/prisma/prisma.service';
import { AutomaticCaptureJob } from '../../src/capture/jobs/automatic-capture.job';
import { NewsSentimentEvidenceService } from '../../src/sentiment/services/news-sentiment-evidence.service';
import { ValidationCollection } from '../../src/validation/validation-collection';

describe('Colección de validación optativa', () => {
  function setup(enabled = true) {
    const config = { get: jest.fn(() => enabled ? '1' : undefined) };
    const prisma = { news: { findFirst: jest.fn().mockResolvedValue({ id: 'existing' }), findMany: jest.fn().mockResolvedValue([]), updateMany: jest.fn().mockResolvedValue({ count: 1 }) } };
    const capture = { run: jest.fn().mockResolvedValue(undefined) };
    const sentiment = { analyzeNews: jest.fn().mockResolvedValue({ score: .5, matchedTerms: 1, terms: [{ term: 'avance', language: 'es', weight: 5, occurrences: 1 }] }) };
    return { prisma, capture, sentiment, job: new ValidationCollection(config as unknown as ConfigService, prisma as unknown as PrismaService, capture as unknown as AutomaticCaptureJob, sentiment as unknown as NewsSentimentEvidenceService) };
  }
  it('no hace capturas ni análisis en configuración normal', async () => {
    const { job, prisma, capture } = setup(false); job.onApplicationBootstrap(); await job.analyzePending();
    expect(prisma.news.findMany).not.toHaveBeenCalled(); expect(capture.run).not.toHaveBeenCalled();
  });
  it('solo captura al arrancar si no existen noticias', async () => {
    const { job, prisma, capture } = setup(); job.onApplicationBootstrap(); await new Promise(resolve => setImmediate(resolve));
    expect(capture.run).not.toHaveBeenCalled(); prisma.news.findFirst.mockResolvedValueOnce(null);
    job.onApplicationBootstrap(); await new Promise(resolve => setImmediate(resolve)); expect(capture.run).toHaveBeenCalledTimes(1);
    prisma.news.findFirst.mockRejectedValueOnce(new Error('db')); job.onApplicationBootstrap(); await new Promise(resolve => setImmediate(resolve));
  });
  it('usa idioma explícito de nuevas fuentes y no sobrescribe análisis manuales concurrentes', async () => {
    const { job, prisma, sentiment } = setup();
    prisma.news.findMany.mockResolvedValueOnce([{ id: 'new', source: { url: 'https://nueva.example/rss', language: 'en' } }, { id: 'unknown', source: { url: 'unknown', language: null } }]);
    prisma.news.updateMany.mockResolvedValueOnce({ count: 0 });
    await job.analyzePending(); expect(sentiment.analyzeNews).toHaveBeenCalledWith({ newsId: 'new', language: 'en' });
    expect(prisma.news.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'new', sentimentAnalyzedAt: null } }));
  });
  it('guarda evidencia y reintenta fallos sin romper el siguiente ciclo', async () => {
    const { job, prisma, sentiment } = setup();
    prisma.news.findMany.mockResolvedValueOnce([{ id: 'a', source: { url: 'a', language: 'es' } }, { id: 'b', source: { url: 'b', language: 'en' } }]);
    sentiment.analyzeNews.mockRejectedValueOnce(new Error('dictionary')); await job.analyzePending();
    expect(prisma.news.updateMany).toHaveBeenCalledTimes(1);
    prisma.news.findMany.mockRejectedValueOnce(new Error('db')); await expect(job.analyzePending()).resolves.toBeUndefined();
    await expect(job.analyzePending()).resolves.toBeUndefined();
  });
});
