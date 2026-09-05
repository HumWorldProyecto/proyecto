import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  InternalServerErrorException,
  NotFoundException,
  Param,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { CreateSourceDto } from '../dto/create-source.dto';
import { ListSourcesQueryDto } from '../dto/list-sources-query.dto';
import { ReplaceSourceDto } from '../dto/replace-source.dto';
import { SourceResponseDto } from '../dto/source-response.dto';
import { UpdateSourceDto } from '../dto/update-source.dto';
import { SourceInputError, SourceNotFoundError, SourceUrlConflictError } from '../errors/source-domain.error';
import { SourceAccessibilityError } from '../errors/source-accessibility.error';
import { SourcesService } from '../services/sources.service';

@ApiTags('sources')
@Controller('sources')
export class SourcesController {
  constructor(private readonly sourcesService: SourcesService) {}

  @Post()
  @ApiOperation({ summary: 'Registrar una fuente RSS' })
  @ApiCreatedResponse({ description: 'Fuente creada y activa', type: SourceResponseDto })
  @ApiBadRequestResponse({ description: 'URL inválida, no permitida o inaccesible' })
  @ApiConflictResponse({ description: 'La URL normalizada ya está registrada' })
  async create(@Body() input: CreateSourceDto): Promise<SourceResponseDto> {
    return this.execute(async () => SourceResponseDto.fromDomain(await this.sourcesService.create(input.url)));
  }

  @Get()
  @ApiOperation({ summary: 'Listar fuentes RSS' })
  @ApiQuery({ name: 'active', required: false, enum: ['true', 'false'] })
  @ApiOkResponse({ description: 'Listado de fuentes', type: SourceResponseDto, isArray: true })
  @ApiBadRequestResponse({ description: 'El filtro active no es true ni false' })
  async list(@Query() query: ListSourcesQueryDto): Promise<SourceResponseDto[]> {
    return this.execute(async () => {
      const sources = await this.sourcesService.list(query.toActiveFilter());
      return sources.map(SourceResponseDto.fromDomain);
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Consultar una fuente RSS' })
  @ApiParam({ name: 'id', description: 'Identificador estable de la fuente' })
  @ApiOkResponse({ description: 'Fuente encontrada', type: SourceResponseDto })
  @ApiNotFoundResponse({ description: 'La fuente no existe' })
  async findById(@Param('id') id: string): Promise<SourceResponseDto> {
    return this.execute(async () => SourceResponseDto.fromDomain(await this.sourcesService.findById(id)));
  }

  @Put(':id')
  @ApiOperation({ summary: 'Reemplazar la URL editable de una fuente RSS' })
  @ApiParam({ name: 'id', description: 'Identificador estable de la fuente' })
  @ApiOkResponse({ description: 'Fuente reemplazada', type: SourceResponseDto })
  @ApiBadRequestResponse({ description: 'URL inválida, no permitida o inaccesible' })
  @ApiNotFoundResponse({ description: 'La fuente no existe' })
  @ApiConflictResponse({ description: 'La URL normalizada ya está registrada' })
  async replace(
    @Param('id') id: string,
    @Body() input: ReplaceSourceDto,
  ): Promise<SourceResponseDto> {
    return this.execute(async () => SourceResponseDto.fromDomain(await this.sourcesService.replace(id, input.url)));
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar parcialmente una fuente RSS' })
  @ApiParam({ name: 'id', description: 'Identificador estable de la fuente' })
  @ApiOkResponse({ description: 'Fuente actualizada o reactivada', type: SourceResponseDto })
  @ApiBadRequestResponse({ description: 'Cuerpo vacío o URL inválida/inaccesible' })
  @ApiNotFoundResponse({ description: 'La fuente no existe' })
  @ApiConflictResponse({ description: 'La URL normalizada ya está registrada' })
  async update(
    @Param('id') id: string,
    @Body() input: UpdateSourceDto,
  ): Promise<SourceResponseDto> {
    return this.execute(async () => SourceResponseDto.fromDomain(await this.sourcesService.update(id, input)));
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Desactivar una fuente RSS sin borrarla' })
  @ApiParam({ name: 'id', description: 'Identificador estable de la fuente' })
  @ApiNoContentResponse({ description: 'Fuente desactivada o ya inactiva' })
  @ApiNotFoundResponse({ description: 'La fuente no existe' })
  async deactivate(@Param('id') id: string): Promise<void> {
    return this.execute(() => this.sourcesService.deactivate(id));
  }

  private async execute<T>(operation: () => Promise<T>): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (error instanceof SourceAccessibilityError || error instanceof SourceInputError) {
        throw new BadRequestException('La URL o solicitud de la fuente no es válida');
      }
      if (error instanceof SourceNotFoundError) {
        throw new NotFoundException('Fuente RSS no encontrada');
      }
      if (error instanceof SourceUrlConflictError) {
        throw new ConflictException('Ya existe una fuente RSS con esa URL');
      }
      throw new InternalServerErrorException();
    }
  }
}
