import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { CaptureConfigController } from './controllers/capture-config.controller';
import { InProcessPeriodicityChangeMediator } from './integrations/in-process-periodicity-change-mediator';
import {
  PERIODICITY_PROVIDER,
  RepositoryPeriodicityProvider,
} from './integrations/repository-periodicity-provider';
import {
  PERIODICITY_CHANGE_NOTIFIER_PORT,
  PERIODICITY_CHANGE_PUBLISHER_PORT,
} from './ports/periodicity-change.port';
import { PERIODICITY_REPOSITORY_PORT } from './ports/periodicity-repository.port';
import { PrismaPeriodicityRepository } from './repositories/prisma-periodicity.repository';
import { CaptureConfigService } from './services/capture-config.service';

@Module({
  imports: [PrismaModule],
  controllers: [CaptureConfigController],
  providers: [
    PrismaPeriodicityRepository,
    { provide: PERIODICITY_REPOSITORY_PORT, useExisting: PrismaPeriodicityRepository },
    RepositoryPeriodicityProvider,
    PERIODICITY_PROVIDER,
    InProcessPeriodicityChangeMediator,
    {
      provide: PERIODICITY_CHANGE_NOTIFIER_PORT,
      useExisting: InProcessPeriodicityChangeMediator,
    },
    {
      provide: PERIODICITY_CHANGE_PUBLISHER_PORT,
      useExisting: InProcessPeriodicityChangeMediator,
    },
    CaptureConfigService,
  ],
  exports: [PERIODICITY_PROVIDER.provide, PERIODICITY_CHANGE_NOTIFIER_PORT],
})
export class CaptureConfigModule {}
