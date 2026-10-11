import { ApiProperty } from '@nestjs/swagger';
import { DICTIONARY_LANGUAGES, DictionaryLanguage } from '../../dictionary/types/dictionary-entry';
import {
  PersistedNewsSentiment,
  PersistedNewsSentimentResult,
} from '../types/persisted-news-sentiment';

export class PersistedSentimentResponseDto {
  @ApiProperty({
    description: 'Score normalizado y persistido con hasta cuatro decimales',
    minimum: -1,
    maximum: 1,
    example: 0.8,
  })
  score!: number;

  @ApiProperty({ description: 'Número de coincidencias del análisis persistido', minimum: 0, example: 2 })
  matchedTerms!: number;

  @ApiProperty({
    description: 'Idioma explícito utilizado en el análisis',
    enum: DICTIONARY_LANGUAGES,
    example: 'es',
  })
  language!: DictionaryLanguage;

  @ApiProperty({
    description: 'Momento en el que el análisis quedó persistido',
    format: 'date-time',
    example: '2026-10-11T15:30:00.000Z',
  })
  analyzedAt!: Date;

  static fromDomain(sentiment: PersistedNewsSentiment): PersistedSentimentResponseDto {
    const dto = new PersistedSentimentResponseDto();
    dto.score = sentiment.score;
    dto.matchedTerms = sentiment.matchedTerms;
    dto.language = sentiment.language;
    dto.analyzedAt = sentiment.analyzedAt;
    return dto;
  }
}

export class NewsSentimentResponseDto {
  @ApiProperty({
    description: 'Identificador UUID de la noticia analizada',
    format: 'uuid',
  })
  newsId!: string;

  @ApiProperty({ type: () => PersistedSentimentResponseDto })
  sentiment!: PersistedSentimentResponseDto;

  static fromDomain(result: PersistedNewsSentimentResult): NewsSentimentResponseDto {
    const dto = new NewsSentimentResponseDto();
    dto.newsId = result.newsId;
    dto.sentiment = PersistedSentimentResponseDto.fromDomain(result.sentiment);
    return dto;
  }
}
