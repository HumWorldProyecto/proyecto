import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ApiKeyConfig } from './api-key.config';
import { ApiKeyGuard } from './api-key.guard';

@Module({
  imports: [ConfigModule],
  providers: [ApiKeyConfig, ApiKeyGuard],
  exports: [ApiKeyConfig, ApiKeyGuard],
})
export class AuthModule {}
