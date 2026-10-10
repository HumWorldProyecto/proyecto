import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsString, Matches } from 'class-validator';
import {
  DICTIONARY_LANGUAGES,
  DictionaryLanguage,
} from '../../dictionary/types/dictionary-entry';
import { DIRECT_SENTIMENT_MAX_CODE_POINTS } from '../types/direct-sentiment-analysis';

export class AnalyzeTextRequestDto {
  @ApiProperty({
    description: 'Texto efímero que se analizará sin persistirlo',
    example: 'La recuperación fue excelente',
    maxLength: DIRECT_SENTIMENT_MAX_CODE_POINTS,
  })
  @IsString()
  @Matches(/\S/u, { message: 'text debe contener al menos un carácter distinto de espacio' })
  text!: string;

  @ApiProperty({
    description: 'Idioma explícito del texto; no se realiza detección automática',
    enum: DICTIONARY_LANGUAGES,
    example: 'es',
  })
  @IsIn(DICTIONARY_LANGUAGES)
  language!: DictionaryLanguage;
}
