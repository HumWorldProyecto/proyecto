import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { NewsModule } from './news/news.module';

/**
 * CaptureModule (HU-01) todavía no se importa aquí: sus dependencias
 * SOURCE_REGISTRY_PORT (HU-15) y PERIODICITY_PROVIDER_PORT (HU-18) no
 * tienen implementación todavía, por lo que bootstrapearlo haría fallar el
 * arranque de la aplicación. El wiring de CAPTURE_OUTPUT_PORT (HU-04) ya
 * existe en capture.module.ts y sus pruebas unitarias siguen pasando de
 * forma aislada; falta importar CaptureModule aquí cuando HU-15 y HU-18
 * existan.
 */
@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), NewsModule],
})
export class AppModule {}
