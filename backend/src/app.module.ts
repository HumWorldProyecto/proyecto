import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { NewsModule } from './news/news.module';
import { SourcesModule } from './sources/sources.module';
import { CaptureConfigModule } from './capture-config/capture-config.module';

/**
 * CaptureModule (HU-01) todavía no se importa aquí: sus dependencias
 * HU-15 y HU-18 ya publican sus módulos funcionales. CaptureModule continúa
 * fuera de la composición hasta implementar el coordinador de scheduling que
 * consuma ambos límites sin introducir ciclos.
 */
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    NewsModule,
    SourcesModule,
    CaptureConfigModule,
  ],
})
export class AppModule {}
