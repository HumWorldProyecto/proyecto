import { Module } from '@nestjs/common';
import { CaptureModule } from '../capture/capture.module';
import { PrismaModule } from '../prisma/prisma.module';
import { SentimentModule } from '../sentiment/sentiment.module';
import { ValidationCollection } from './validation-collection';

@Module({
  imports: [CaptureModule, PrismaModule, SentimentModule],
  providers: [ValidationCollection],
})
export class ValidationModule {}
