import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  InternalServerErrorException,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiServiceUnavailableResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AnalyzeNewsSentimentRequestDto } from '../dto/analyze-news-sentiment-request.dto';
import { NewsSentimentResponseDto } from '../dto/news-sentiment-response.dto';
import {
  NewsForSentimentNotFoundError,
  SentimentDictionaryReadError,
} from '../errors/sentiment-analysis.error';
import { AnalyzeAndPersistNewsSentimentService } from '../services/analyze-and-persist-news-sentiment.service';

@ApiTags('news')
@Controller('news')
export class NewsSentimentController {
  constructor(private readonly analyzeAndPersist: AnalyzeAndPersistNewsSentimentService) {}

  @Post(':id/sentiment')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Analizar y persistir el sentimiento de una noticia',
    description:
      'Recalcula con el diccionario vigente y reemplaza atómicamente el último resultado persistido.',
  })
  @ApiParam({ name: 'id', description: 'Identificador UUID de la noticia', format: 'uuid' })
  @ApiOkResponse({
    description: 'Resultado calculado y confirmado por PostgreSQL',
    type: NewsSentimentResponseDto,
  })
  @ApiBadRequestResponse({ description: 'UUID, JSON o idioma inválido' })
  @ApiNotFoundResponse({ description: 'La noticia no existe' })
  @ApiServiceUnavailableResponse({ description: 'El diccionario no está disponible' })
  @ApiInternalServerErrorResponse({ description: 'Fallo interno o de persistencia controlado' })
  async analyze(
    @Param('id', new ParseUUIDPipe({ version: '4' })) newsId: string,
    @Body() input: AnalyzeNewsSentimentRequestDto,
  ): Promise<NewsSentimentResponseDto> {
    try {
      return NewsSentimentResponseDto.fromDomain(
        await this.analyzeAndPersist.execute({ newsId, language: input.language }),
      );
    } catch (error) {
      if (error instanceof NewsForSentimentNotFoundError) {
        throw new NotFoundException('La noticia no existe');
      }
      if (error instanceof SentimentDictionaryReadError) {
        throw new ServiceUnavailableException('El diccionario de sentimiento no está disponible');
      }
      throw new InternalServerErrorException('No se pudo completar el análisis de la noticia');
    }
  }
}
