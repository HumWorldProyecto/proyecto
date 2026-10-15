import { ApiProperty } from '@nestjs/swagger';
import {
  DICTIONARY_LANGUAGES,
  DictionaryEntry,
  DictionaryLanguage,
} from '../types/dictionary-entry';

export class DictionaryEntryResponseDto {
  @ApiProperty({
    description: 'Identificador UUID estable de la entrada',
    format: 'uuid',
    example: '0f826bb6-df8e-42c5-bd57-27a213ff2f24',
  })
  id!: string;

  @ApiProperty({ description: 'Término o frase en forma canónica', example: 'muy positivo' })
  term!: string;

  @ApiProperty({ enum: DICTIONARY_LANGUAGES, example: 'es' })
  language!: DictionaryLanguage;

  @ApiProperty({ minimum: -5, maximum: 5, example: 4 })
  weight!: number;

  static fromDomain(entry: DictionaryEntry): DictionaryEntryResponseDto {
    const dto = new DictionaryEntryResponseDto();
    dto.id = entry.id;
    dto.term = entry.term;
    dto.language = entry.language;
    dto.weight = entry.weight;
    return dto;
  }
}
