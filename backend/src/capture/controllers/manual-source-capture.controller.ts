import {
  BadGatewayException,
  ConflictException,
  Controller,
  GatewayTimeoutException,
  HttpCode,
  HttpStatus,
  InternalServerErrorException,
  NotFoundException,
  Param,
  Post,
} from '@nestjs/common';
import {
  ApiBadGatewayResponse,
  ApiConflictResponse,
  ApiGatewayTimeoutResponse,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { ManualSourceCaptureResponseDto } from '../dto/manual-source-capture-response.dto';
import { SourceCaptureError } from '../errors/source-capture.error';
import { ManualSourceCaptureService } from '../services/manual-source-capture.service';

@ApiTags('sources')
@Controller('sources')
export class ManualSourceCaptureController {
  constructor(private readonly manualCapture: ManualSourceCaptureService) {}

  @Post(':id/capture')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Actualizar manualmente una fuente RSS' })
  @ApiParam({ name: 'id', description: 'Identificador estable de la fuente RSS' })
  @ApiOkResponse({
    description: 'Captura finalizada; itemsParsed no representa filas persistidas',
    type: ManualSourceCaptureResponseDto,
  })
  @ApiNotFoundResponse({ description: 'La fuente RSS no existe' })
  @ApiConflictResponse({ description: 'La fuente está inactiva u ocupada' })
  @ApiBadGatewayResponse({ description: 'No fue posible obtener o interpretar la fuente RSS' })
  @ApiGatewayTimeoutResponse({ description: 'La captura excedió el tiempo permitido' })
  @ApiInternalServerErrorResponse({ description: 'No fue posible completar la captura' })
  async capture(@Param('id') sourceId: string): Promise<ManualSourceCaptureResponseDto> {
    try {
      return ManualSourceCaptureResponseDto.fromResult(
        await this.manualCapture.capture(sourceId),
      );
    } catch (error) {
      this.throwHttpError(error);
    }
  }

  private throwHttpError(error: unknown): never {
    if (!(error instanceof SourceCaptureError)) {
      throw new InternalServerErrorException('No fue posible completar la captura');
    }

    switch (error.code) {
      case 'source-not-found':
        throw new NotFoundException('La fuente RSS no existe');
      case 'source-inactive':
        throw new ConflictException('La fuente RSS no está disponible para captura');
      case 'source-busy':
        throw new ConflictException('La fuente RSS ya está siendo capturada');
      case 'parse/invalid-rss':
      case 'fetch/upstream':
        throw new BadGatewayException('No fue posible obtener o interpretar la fuente RSS');
      case 'timeout':
        throw new GatewayTimeoutException(
          'La captura de la fuente RSS excedió el tiempo permitido',
        );
      case 'unexpected':
      default:
        throw new InternalServerErrorException('No fue posible completar la captura');
    }
  }
}
