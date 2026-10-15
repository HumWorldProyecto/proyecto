import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsInt, IsNotEmpty, IsString, Max, Min } from 'class-validator';
import {
  DICTIONARY_LANGUAGES,
  DictionaryLanguage,
} from '../types/dictionary-entry';

export class CreateDictionaryEntryDto {
  @ApiProperty({
    description: 'Término o frase; se almacena en su forma canónica',
    example: 'muy positivo',
  })
  @IsString()
  @IsNotEmpty()
  term!: string;

  @ApiProperty({ enum: DICTIONARY_LANGUAGES, example: 'es' })
  @IsIn(DICTIONARY_LANGUAGES)
  language!: DictionaryLanguage;

  @ApiProperty({ minimum: -5, maximum: 5, example: 4 })
  @IsInt()
  @Min(-5)
  @Max(5)
  weight!: number;
}
