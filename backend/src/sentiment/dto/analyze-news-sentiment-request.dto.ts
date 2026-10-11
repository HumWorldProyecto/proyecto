import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';
import {
  DICTIONARY_LANGUAGES,
  DictionaryLanguage,
} from '../../dictionary/types/dictionary-entry';

export class AnalyzeNewsSentimentRequestDto {
  @ApiProperty({
    description: 'Idioma explícito del análisis; no se realiza detección automática',
    enum: DICTIONARY_LANGUAGES,
    example: 'es',
  })
  @IsIn(DICTIONARY_LANGUAGES)
  language!: DictionaryLanguage;
}
