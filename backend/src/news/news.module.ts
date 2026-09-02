import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { CAPTURE_OUTPUT_PORT } from '../capture/ports/capture-output.port';
import { NEWS_REPOSITORY_PORT } from './ports/news-repository.port';
import { PrismaNewsRepository } from './repositories/prisma-news.repository';
import { NewsService } from './services/news.service';
import { NewsCaptureOutputAdapter } from './integrations/news-capture-output.adapter';
import { NewsController } from './controllers/news.controller';

/**
 * Módulo de noticias y sus metadatos (HU-04). Implementa el lado de salida
 * de CAPTURE_OUTPUT_PORT definido por HU-01 y lo exporta para que
 * CaptureModule pueda resolverlo, sin alterar su contrato.
 */
@Module({
  imports: [PrismaModule],
  controllers: [NewsController],
  providers: [
    { provide: NEWS_REPOSITORY_PORT, useClass: PrismaNewsRepository },
    NewsService,
    NewsCaptureOutputAdapter,
    { provide: CAPTURE_OUTPUT_PORT, useClass: NewsCaptureOutputAdapter },
  ],
  exports: [CAPTURE_OUTPUT_PORT],
})
export class NewsModule {}
