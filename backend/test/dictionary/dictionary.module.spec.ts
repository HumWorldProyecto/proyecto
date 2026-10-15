import { Test } from '@nestjs/testing';
import { DictionaryModule } from '../../src/dictionary/dictionary.module';
import { DICTIONARY_READER_PORT } from '../../src/dictionary/ports/dictionary-reader.port';
import { DICTIONARY_REPOSITORY_PORT } from '../../src/dictionary/ports/dictionary-repository.port';
import { PrismaDictionaryRepository } from '../../src/dictionary/repositories/prisma-dictionary.repository';
import { DictionaryService } from '../../src/dictionary/services/dictionary.service';

describe('DictionaryModule', () => {
  it('compone CRUD y lectura con el mismo adaptador sin exponer Prisma', async () => {
    const moduleRef = await Test.createTestingModule({ imports: [DictionaryModule] }).compile();

    const repository = moduleRef.get(DICTIONARY_REPOSITORY_PORT);
    const reader = moduleRef.get(DICTIONARY_READER_PORT);

    expect(repository).toBeInstanceOf(PrismaDictionaryRepository);
    expect(reader).toBe(repository);
    expect(moduleRef.get(DictionaryService)).toBeInstanceOf(DictionaryService);

    await moduleRef.close();
  });
});
