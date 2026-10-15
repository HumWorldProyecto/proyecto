import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { DictionaryController } from './controllers/dictionary.controller';
import { DictionaryTermNormalizer } from './domain/dictionary-term-normalizer';
import { DICTIONARY_READER_PORT } from './ports/dictionary-reader.port';
import { DICTIONARY_REPOSITORY_PORT } from './ports/dictionary-repository.port';
import { PrismaDictionaryRepository } from './repositories/prisma-dictionary.repository';
import { DictionaryService } from './services/dictionary.service';

@Module({
  imports: [PrismaModule],
  controllers: [DictionaryController],
  providers: [
    DictionaryTermNormalizer,
    PrismaDictionaryRepository,
    { provide: DICTIONARY_REPOSITORY_PORT, useExisting: PrismaDictionaryRepository },
    { provide: DICTIONARY_READER_PORT, useExisting: PrismaDictionaryRepository },
    DictionaryService,
  ],
  exports: [DICTIONARY_READER_PORT, DictionaryTermNormalizer],
})
export class DictionaryModule {}
