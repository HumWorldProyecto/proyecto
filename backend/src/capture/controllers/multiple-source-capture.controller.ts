import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  InternalServerErrorException,
  Post,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiExtraModels,
  ApiInternalServerErrorResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { MultipleSourceCaptureRequestDto } from '../dto/multiple-source-capture-request.dto';
import {
  CompletedMultipleSourceCaptureResultDto,
  FailedMultipleSourceCaptureResultDto,
  MultipleSourceCaptureResponseDto,
} from '../dto/multiple-source-capture-response.dto';
import { MultipleSourceCaptureInputError } from '../errors/multiple-source-capture-input.error';
import { MultipleSourceCaptureService } from '../services/multiple-source-capture.service';

@ApiTags('sources')
@ApiExtraModels(
  CompletedMultipleSourceCaptureResultDto,
  FailedMultipleSourceCaptureResultDto,
)
@Controller('sources')
export class MultipleSourceCaptureController {
  constructor(private readonly multipleCapture: MultipleSourceCaptureService) {}

  @Post('capture')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Actualizar manualmente múltiples fuentes RSS' })
  @ApiBody({ required: true, type: MultipleSourceCaptureRequestDto })
  @ApiOkResponse({
    description:
      'Resultado aislado por cada fuente efectiva; los fallos individuales no cambian el 200',
    type: MultipleSourceCaptureResponseDto,
  })
  @ApiBadRequestResponse({
    description:
      'Body inválido o menos de dos sourceIds efectivos; por ejemplo [A] o [A, A]',
  })
  @ApiInternalServerErrorResponse({
    description: 'Fallo global inesperado fuera del aislamiento por fuente',
  })
  async capture(
    @Body() request: MultipleSourceCaptureRequestDto,
  ): Promise<MultipleSourceCaptureResponseDto> {
    try {
      return MultipleSourceCaptureResponseDto.fromResult(
        await this.multipleCapture.capture(request.sourceIds),
      );
    } catch (error) {
      if (error instanceof MultipleSourceCaptureInputError) {
        throw new BadRequestException(
          'Se requieren al menos dos identificadores de fuente efectivos',
        );
      }

      throw new InternalServerErrorException(
        'No fue posible completar la captura múltiple',
      );
    }
  }
}
