import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { CHANNEL_REPOSITORY } from './channel.port';
import { ChannelsController } from './channels.controller';
import { ChannelsService } from './channels.service';
import { PrismaChannelRepository } from './prisma-channel.repository';
@Module({ imports: [AuthModule, PrismaModule], controllers: [ChannelsController], providers: [
  ChannelsService, { provide: CHANNEL_REPOSITORY, useClass: PrismaChannelRepository },
] })
export class ChannelsModule {}
