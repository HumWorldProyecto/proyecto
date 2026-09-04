import { Test } from '@nestjs/testing';
import { SourceUrlNormalizer } from '../../src/sources/domain/source-url-normalizer';
import { SourceAccessibilityChecker } from '../../src/sources/integrations/source-accessibility-checker';
import { SourcesModule } from '../../src/sources/sources.module';

describe('SourcesModule', () => {
  it('compone la fundación HTTP sin controller ni repositorio', async () => {
    const moduleRef = await Test.createTestingModule({ imports: [SourcesModule] }).compile();

    expect(moduleRef.get(SourceUrlNormalizer)).toBeInstanceOf(SourceUrlNormalizer);
    expect(moduleRef.get(SourceAccessibilityChecker)).toBeInstanceOf(SourceAccessibilityChecker);

    await moduleRef.close();
  });
});
