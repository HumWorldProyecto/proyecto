import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { NewsModule } from './news/news.module';
import { SourcesModule } from './sources/sources.module';

/**
 * CaptureModule (HU-01) todavía no se importa aquí: sus dependencias
 * PERIODICITY_PROVIDER_PORT (HU-18) todavía no tiene implementación, por lo
 * que bootstrapear CaptureModule haría fallar el arranque. HU-15 queda
 * disponible mediante SourcesModule; la conexión completa con CaptureModule
 * se realizará cuando también exista HU-18.
 */
@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), NewsModule, SourcesModule],
})
export class AppModule {}
