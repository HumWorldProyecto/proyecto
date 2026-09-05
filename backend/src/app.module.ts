import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CaptureModule } from './capture/capture.module';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), CaptureModule],
})
export class AppModule {}
