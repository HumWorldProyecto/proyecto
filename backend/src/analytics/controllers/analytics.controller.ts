import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Put,
  Query,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiServiceUnavailableResponse,
  ApiTags,
} from '@nestjs/swagger';
import {
  AssignCountryDto,
  GeographyDto,
  HumorDashboardDto,
  HumorQueryDto,
  SourceGeographyDto,
} from '../dto/analytics.dto';
import { AnalyticsService } from '../services/analytics.service';
import { AnalyticsInputError, GeographySourceNotFoundError } from '../types/analytics';

@ApiTags('dashboards')
@ApiServiceUnavailableResponse({ description: 'Datos temporalmente no disponibles' })
@Controller('dashboards')
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  @Get('humor')
  @ApiOperation({
    summary: 'Consultar último humor por geografía y fecha de noticia',
    description:
      'Media de noticias con coincidencias. Fechas inclusivas UTC. Nube del análisis guardado, ranking por abs(score/N). Sin filtros abarca todos los datos.',
  })
  @ApiOkResponse({ type: HumorDashboardDto })
  @ApiBadRequestResponse({ description: 'Filtro inválido o incompatible' })
  query(@Query() input: HumorQueryDto) {
    return this.boundary(() => this.analytics.query(input));
  }

  @Get('geography')
  @ApiOperation({ summary: 'Obtener países del catálogo y procedencia asignada a fuentes RSS' })
  @ApiOkResponse({ type: GeographyDto })
  geography() {
    return this.boundary(() => this.analytics.geography());
  }

  @Put('sources/:id/geography')
  @ApiOperation({ summary: 'Asignar explícitamente país de procedencia de una fuente RSS' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: SourceGeographyDto })
  @ApiBadRequestResponse({ description: 'País, UUID o body inválido' })
  @ApiNotFoundResponse({ description: 'Fuente inexistente' })
  assign(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() input: AssignCountryDto,
  ) {
    return this.boundary(() => this.analytics.assignCountry(id, input.countryCode));
  }

  private async boundary<T>(operation: () => Promise<T>): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (error instanceof AnalyticsInputError) throw new BadRequestException(error.message);
      if (error instanceof GeographySourceNotFoundError)
        throw new NotFoundException('La fuente no existe');
      throw new ServiceUnavailableException(
        'No se pudo consultar o actualizar la información de humor',
      );
    }
  }
}
