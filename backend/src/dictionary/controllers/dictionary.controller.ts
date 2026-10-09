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
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiInternalServerErrorResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { CreateDictionaryEntryDto } from '../dto/create-dictionary-entry.dto';
import { DictionaryEntryResponseDto } from '../dto/dictionary-entry-response.dto';
import { UpdateDictionaryEntryDto } from '../dto/update-dictionary-entry.dto';
import {
  DictionaryEntryConflictError,
  DictionaryEntryNotFoundError,
  DictionaryInputError,
} from '../errors/dictionary-domain.error';
import { DictionaryService } from '../services/dictionary.service';

const ADMIN_SECURITY_NOTICE =
  'Operación administrativa sin autenticación en HU-17; debe limitarse mediante el perímetro de despliegue hasta incorporar autorización.';

@ApiTags('dictionary')
@Controller('dictionary')
export class DictionaryController {
  constructor(private readonly dictionaryService: DictionaryService) {}

  @Post()
  @ApiOperation({ summary: 'Crear una entrada del diccionario', description: ADMIN_SECURITY_NOTICE })
  @ApiCreatedResponse({ description: 'Entrada creada', type: DictionaryEntryResponseDto })
  @ApiBadRequestResponse({ description: 'Término, idioma o peso inválido' })
  @ApiConflictResponse({ description: 'El término canónico ya existe para el idioma' })
  @ApiInternalServerErrorResponse({ description: 'Fallo interno controlado' })
  async create(@Body() input: CreateDictionaryEntryDto): Promise<DictionaryEntryResponseDto> {
    return this.execute(async () =>
      DictionaryEntryResponseDto.fromDomain(await this.dictionaryService.create(input)),
    );
  }

  @Get()
  @ApiOperation({ summary: 'Listar el diccionario', description: ADMIN_SECURITY_NOTICE })
  @ApiOkResponse({
    description: 'Listado completo y ordenado',
    type: DictionaryEntryResponseDto,
    isArray: true,
  })
  @ApiInternalServerErrorResponse({ description: 'Fallo interno controlado' })
  async list(): Promise<DictionaryEntryResponseDto[]> {
    return this.execute(async () =>
      (await this.dictionaryService.list()).map(DictionaryEntryResponseDto.fromDomain),
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Consultar una entrada del diccionario', description: ADMIN_SECURITY_NOTICE })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ description: 'Entrada encontrada', type: DictionaryEntryResponseDto })
  @ApiBadRequestResponse({ description: 'UUID mal formado' })
  @ApiNotFoundResponse({ description: 'Entrada inexistente' })
  @ApiInternalServerErrorResponse({ description: 'Fallo interno controlado' })
  async findById(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): Promise<DictionaryEntryResponseDto> {
    return this.execute(async () =>
      DictionaryEntryResponseDto.fromDomain(await this.dictionaryService.findById(id)),
    );
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar una entrada del diccionario', description: ADMIN_SECURITY_NOTICE })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ description: 'Entrada actualizada', type: DictionaryEntryResponseDto })
  @ApiBadRequestResponse({ description: 'UUID, cuerpo, término, idioma o peso inválido' })
  @ApiNotFoundResponse({ description: 'Entrada inexistente' })
  @ApiConflictResponse({ description: 'El término canónico ya existe para el idioma' })
  @ApiInternalServerErrorResponse({ description: 'Fallo interno controlado' })
  async update(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() input: UpdateDictionaryEntryDto,
  ): Promise<DictionaryEntryResponseDto> {
    return this.execute(async () =>
      DictionaryEntryResponseDto.fromDomain(await this.dictionaryService.update(id, input)),
    );
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar una entrada del diccionario', description: ADMIN_SECURITY_NOTICE })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiNoContentResponse({ description: 'Entrada eliminada físicamente' })
  @ApiBadRequestResponse({ description: 'UUID mal formado' })
  @ApiNotFoundResponse({ description: 'Entrada inexistente' })
  @ApiInternalServerErrorResponse({ description: 'Fallo interno controlado' })
  async delete(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): Promise<void> {
    return this.execute(() => this.dictionaryService.delete(id));
  }

  private async execute<T>(operation: () => Promise<T>): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (error instanceof DictionaryInputError) {
        throw new BadRequestException('La entrada del diccionario no es válida');
      }
      if (error instanceof DictionaryEntryNotFoundError) {
        throw new NotFoundException('Entrada del diccionario no encontrada');
      }
      if (error instanceof DictionaryEntryConflictError) {
        throw new ConflictException('El término ya existe para ese idioma');
      }
      throw new InternalServerErrorException();
    }
  }
}
