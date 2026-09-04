import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RSS_FETCH_TIMEOUT_MS, RSS_FETCH_TIMEOUT_PROVIDER } from './rss-http-timeout';

@Module({
  imports: [ConfigModule],
  providers: [RSS_FETCH_TIMEOUT_PROVIDER],
  exports: [RSS_FETCH_TIMEOUT_MS],
})
export class RssHttpConfigModule {}
