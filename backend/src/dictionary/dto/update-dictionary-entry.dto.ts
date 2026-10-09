import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsInt, IsNotEmpty, IsString, Max, Min, ValidateIf } from 'class-validator';
import {
  DICTIONARY_LANGUAGES,
  DictionaryLanguage,
} from '../types/dictionary-entry';

export class UpdateDictionaryEntryDto {
  @ApiPropertyOptional({
    description: 'Nuevo término o frase; se almacena en su forma canónica',
    example: 'muy positivo',
  })
  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @IsNotEmpty()
  term?: string;

  @ApiPropertyOptional({ enum: DICTIONARY_LANGUAGES, example: 'en' })
  @ValidateIf((_object, value) => value !== undefined)
  @IsIn(DICTIONARY_LANGUAGES)
  language?: DictionaryLanguage;

  @ApiPropertyOptional({ minimum: -5, maximum: 5, example: 0 })
  @ValidateIf((_object, value) => value !== undefined)
  @IsInt()
  @Min(-5)
  @Max(5)
  weight?: number;
}
