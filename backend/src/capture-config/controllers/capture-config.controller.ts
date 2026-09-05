import {
  BadRequestException,
  Body,
  Controller,
  Get,
  InternalServerErrorException,
  Put,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CaptureConfigResponseDto } from '../dto/capture-config-response.dto';
import { UpdateCaptureConfigDto } from '../dto/update-capture-config.dto';
import { PeriodicityInputError } from '../errors/periodicity.error';
import { CaptureConfigService } from '../services/capture-config.service';

@ApiTags('config')
@Controller('config')
export class CaptureConfigController {
  constructor(private readonly service: CaptureConfigService) {}

  @Get()
  @ApiOperation({ summary: 'Consultar la periodicidad global de captura' })
  @ApiOkResponse({
    description: 'Estado configurado o sin configurar',
    type: CaptureConfigResponseDto,
  })
  async getCurrent(): Promise<CaptureConfigResponseDto> {
    return this.execute(async () =>
      CaptureConfigResponseDto.fromState(await this.service.getCurrentState()),
    );
  }

  @Put()
  @ApiOperation({ summary: 'Configurar la periodicidad global de captura' })
  @ApiOkResponse({
    description: 'Periodicidad vigente después de la operación',
    type: CaptureConfigResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Valor ausente, inválido o fuera del catálogo' })
  async configure(
    @Body() input: UpdateCaptureConfigDto,
  ): Promise<CaptureConfigResponseDto> {
    return this.execute(async () =>
      CaptureConfigResponseDto.fromState(
        await this.service.configure(input.capturePeriodicityMinutes),
      ),
    );
  }

  private async execute<T>(operation: () => Promise<T>): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (error instanceof PeriodicityInputError) {
        throw new BadRequestException('La periodicidad indicada no es válida');
      }
      throw new InternalServerErrorException();
    }
  }
}
