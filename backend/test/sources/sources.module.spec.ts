import { Test } from '@nestjs/testing';
import { SourceUrlNormalizer } from '../../src/sources/domain/source-url-normalizer';
import { SourceAccessibilityChecker } from '../../src/sources/integrations/source-accessibility-checker';
import { SourcesController } from '../../src/sources/controllers/sources.controller';
import { SOURCE_REGISTRY_PORT } from '../../src/sources/ports/source-registry.port';
import { SourcesModule } from '../../src/sources/sources.module';
import { SourcesService } from '../../src/sources/services/sources.service';

describe('SourcesModule', () => {
  it('compone HU-15 y exporta el registro de fuentes elegibles', async () => {
    const moduleRef = await Test.createTestingModule({ imports: [SourcesModule] }).compile();

    expect(moduleRef.get(SourceUrlNormalizer)).toBeInstanceOf(SourceUrlNormalizer);
    expect(moduleRef.get(SourceAccessibilityChecker)).toBeInstanceOf(SourceAccessibilityChecker);
    expect(moduleRef.get(SourcesService)).toBeInstanceOf(SourcesService);
    expect(moduleRef.get(SourcesController)).toBeInstanceOf(SourcesController);
    expect(moduleRef.get(SOURCE_REGISTRY_PORT)).toBeDefined();

    await moduleRef.close();
  });
});
