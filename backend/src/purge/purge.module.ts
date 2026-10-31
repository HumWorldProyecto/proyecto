import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { AutomaticPurgeJob } from './automatic-purge.job';
import { LifecycleController } from './lifecycle.controller';
import { LIFECYCLE_CLOCK, LIFECYCLE_REPOSITORY } from './lifecycle.port';
import { LifecycleService } from './lifecycle.service';
import { PrismaLifecycleRepository } from './prisma-lifecycle.repository';

@Module({ imports: [AuthModule, PrismaModule], controllers: [LifecycleController], providers: [
  LifecycleService, AutomaticPurgeJob, { provide: LIFECYCLE_REPOSITORY, useClass: PrismaLifecycleRepository },
  { provide: LIFECYCLE_CLOCK, useValue: { now: () => new Date() } },
], exports: [LifecycleService, AutomaticPurgeJob] })
export class PurgeModule {}
