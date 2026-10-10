import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  InternalServerErrorException,
  PayloadTooLargeException,
  Post,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiInternalServerErrorResponse,
  ApiOkResponse,
  ApiOperation,
  ApiPayloadTooLargeResponse,
  ApiServiceUnavailableResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AnalyzeTextRequestDto } from '../dto/analyze-text-request.dto';
import { SentimentAnalysisResponseDto } from '../dto/sentiment-analysis-response.dto';
import {
  DirectSentimentTextTooLongError,
  SentimentDictionaryReadError,
} from '../errors/sentiment-analysis.error';
import { DirectSentimentAnalysisService } from '../services/direct-sentiment-analysis.service';

@ApiTags('sentiment')
@Controller('sentiment')
export class SentimentController {
  constructor(private readonly directAnalysis: DirectSentimentAnalysisService) {}

  @Post('analyze')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Analizar directamente el sentimiento de un texto',
    description:
      'Analiza un texto efímero con idioma explícito mediante el diccionario vigente; no guarda el texto ni crea noticias.',
  })
  @ApiOkResponse({
    description: 'Análisis completado, también cuando no hay coincidencias',
    type: SentimentAnalysisResponseDto,
  })
  @ApiBadRequestResponse({ description: 'JSON, texto o idioma inválido' })
  @ApiPayloadTooLargeResponse({ description: 'El texto supera 10.000 puntos de código Unicode' })
  @ApiServiceUnavailableResponse({ description: 'El diccionario no está disponible' })
  @ApiInternalServerErrorResponse({ description: 'Fallo interno controlado' })
  async analyze(@Body() input: AnalyzeTextRequestDto): Promise<SentimentAnalysisResponseDto> {
    try {
      return SentimentAnalysisResponseDto.fromDomain(
        await this.directAnalysis.analyzeText(input),
      );
    } catch (error) {
      if (error instanceof DirectSentimentTextTooLongError) {
        throw new PayloadTooLargeException('El texto supera el límite permitido');
      }
      if (error instanceof SentimentDictionaryReadError) {
        throw new ServiceUnavailableException('El diccionario de sentimiento no está disponible');
      }
      throw new InternalServerErrorException();
    }
  }
}
