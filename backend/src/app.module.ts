import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CaptureModule } from './capture/capture.module';
import { DictionaryModule } from './dictionary/dictionary.module';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), CaptureModule, DictionaryModule],
})
export class AppModule {}
