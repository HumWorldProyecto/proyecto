import { Body, Controller, Delete, Get, HttpCode, Optional, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { ApiBadRequestResponse, ApiNoContentResponse, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { HumorQueryDto } from '../../analytics/dto/analytics.dto';
import { RequireApiKey } from '../../auth/require-api-key.decorator';
import { DeleteNewsDto } from '../dto/delete-news.dto';
import { NewsRecordsService } from '../services/news-records.service';
import { NewsService } from '../services/news.service';
import { NewsResponseDto } from '../dto/news-response.dto';

@ApiTags('news')
@Controller('news')
export class NewsController {
  constructor(private readonly newsService: NewsService, @Optional() private readonly records?: NewsRecordsService) {}

  @Get(':id([0-9a-fA-F-]{36})')
  @ApiOperation({ summary: 'Consultar noticia, procedencia, categorías y análisis guardado' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ description: 'Noticia encontrada con metadatos de origen y sentimiento' })
  @ApiNotFoundResponse({ description: 'Noticia inexistente', schema: { example: { statusCode: 404, message: 'Noticia no encontrada', error: 'Not Found' } } })
  @ApiBadRequestResponse({ description: 'Identificador inválido' })
  detail(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) { return this.records!.detail(id); }

  @Delete()
  @RequireApiKey('write')
  @HttpCode(204)
  @ApiOperation({ summary: 'Eliminar una noticia identificada en el cuerpo JSON; conserva su fuente' })
  @ApiNoContentResponse({ description: 'Noticia eliminada' })
  @ApiNotFoundResponse({ description: 'Noticia inexistente' })
  @ApiBadRequestResponse({ description: 'Body o UUID inválidos', schema: { example: { statusCode: 400, message: ['id must be a UUID'], error: 'Bad Request' } } })
  delete(@Body() input: DeleteNewsDto) { return this.records!.delete(input.id); }

  @Delete(':id')
  @RequireApiKey('write')
  @HttpCode(204)
  @ApiOperation({ summary: 'Eliminar una noticia por UUID; conserva su fuente' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiNoContentResponse({ description: 'Noticia eliminada' })
  @ApiNotFoundResponse({ description: 'Noticia inexistente' })
  @ApiBadRequestResponse({ description: 'UUID inválido' })
  deleteById(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) { return this.records!.delete(id); }

  @Get()
  @ApiOkResponse({
    description: 'Listado de noticias almacenadas (lista vacía si no hay ninguna)',
    type: NewsResponseDto,
    isArray: true,
  })
  async list(@Query() input: HumorQueryDto = {}) {
    if (Object.values(input).some(value => value !== undefined)) return this.records!.filtered(input);
    const news = await this.newsService.listNews();
    return news.map(NewsResponseDto.fromDomain);
  }
}
