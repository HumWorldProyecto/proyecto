import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CaptureModule } from './capture/capture.module';
import { DictionaryModule } from './dictionary/dictionary.module';
import { SentimentModule } from './sentiment/sentiment.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { PurgeModule } from './purge/purge.module';
import { ChannelsModule } from './channels/channels.module';
import { ValidationModule } from './validation/validation.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    CaptureModule,
    DictionaryModule,
    SentimentModule,
    AnalyticsModule,
    PurgeModule,
    ChannelsModule,
    ValidationModule,
  ],
})
export class AppModule {}
