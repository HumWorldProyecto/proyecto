import { Inject, Injectable } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { CaptureConfigModule } from '../../src/capture-config/capture-config.module';
import {
  PERIODICITY_CHANGE_NOTIFIER_PORT,
  PERIODICITY_CHANGE_PUBLISHER_PORT,
  PeriodicityChangeNotifierPort,
} from '../../src/capture-config/ports/periodicity-change.port';
import {
  PERIODICITY_PROVIDER_PORT,
  PeriodicityProviderPort,
} from '../../src/capture-config/ports/periodicity-provider.port';

@Injectable()
class ExportConsumer {
  constructor(
    @Inject(PERIODICITY_PROVIDER_PORT)
    readonly provider: PeriodicityProviderPort,
    @Inject(PERIODICITY_CHANGE_NOTIFIER_PORT)
    readonly notifier: PeriodicityChangeNotifierPort,
  ) {}
}

describe('CaptureConfigModule', () => {
  it('compone HU-18 y exporta provider/notifier sin requerir CaptureModule', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [CaptureConfigModule],
      providers: [ExportConsumer],
    }).compile();

    const consumer = moduleRef.get(ExportConsumer);
    expect(consumer.provider).toBeDefined();
    expect(consumer.notifier).toBeDefined();
    expect(moduleRef.get(PERIODICITY_CHANGE_PUBLISHER_PORT)).toBe(consumer.notifier);
    expect(Reflect.getMetadata('exports', CaptureConfigModule)).not.toContain(
      PERIODICITY_CHANGE_PUBLISHER_PORT,
    );

    await moduleRef.close();
  });
});
