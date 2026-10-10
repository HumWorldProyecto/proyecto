import { ApiProperty } from '@nestjs/swagger';
import { SentimentAnalysisResult } from '../types/sentiment-analysis';

export class SentimentAnalysisResponseDto {
  @ApiProperty({
    description: 'Score normalizado y redondeado a cuatro decimales',
    minimum: -1,
    maximum: 1,
    example: 1,
  })
  score!: number;

  @ApiProperty({
    description: 'Número de ocurrencias no solapadas encontradas',
    minimum: 0,
    example: 1,
  })
  matchedTerms!: number;

  static fromDomain(result: SentimentAnalysisResult): SentimentAnalysisResponseDto {
    const dto = new SentimentAnalysisResponseDto();
    dto.score = result.score;
    dto.matchedTerms = result.matchedTerms;
    return dto;
  }
}
