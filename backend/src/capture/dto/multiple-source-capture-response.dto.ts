import { ApiProperty, getSchemaPath } from '@nestjs/swagger';
import { SourceCaptureErrorCode } from '../errors/source-capture.error';
import {
  FailedSourceCaptureResult,
  MultipleSourceCaptureResult,
  SourceCaptureResult,
} from '../types/source-capture-result';

const ERROR_CODES: SourceCaptureErrorCode[] = [
  'source-not-found',
  'source-inactive',
  'source-busy',
  'fetch/upstream',
  'parse/invalid-rss',
  'timeout',
  'unexpected',
];

export class CompletedMultipleSourceCaptureResultDto {
  @ApiProperty({
    description: 'Identificador estable de la fuente capturada',
    example: '0f826bb6-df8e-42c5-bd57-27a213ff2f24',
  })
  sourceId!: string;

  @ApiProperty({ enum: ['completed'], example: 'completed' })
  status!: 'completed';

  @ApiProperty({
    description: 'Ítems RSS interpretados; no representa filas persistidas',
    example: 3,
    minimum: 0,
  })
  itemsParsed!: number;

  static fromResult(
    result: SourceCaptureResult,
  ): CompletedMultipleSourceCaptureResultDto {
    const dto = new CompletedMultipleSourceCaptureResultDto();
    dto.sourceId = result.sourceId;
    dto.status = result.status;
    dto.itemsParsed = result.itemsParsed;
    return dto;
  }
}

export class FailedMultipleSourceCaptureResultDto {
  @ApiProperty({
    description: 'Identificador estable solicitado para la fuente',
    example: 'b5f51f91-0b48-45e5-a926-2e9f89f109dc',
  })
  sourceId!: string;

  @ApiProperty({ enum: ['failed'], example: 'failed' })
  status!: 'failed';

  @ApiProperty({
    description: 'Categoría estable y sanitizada del fallo individual',
    enum: ERROR_CODES,
    example: 'source-inactive',
  })
  errorCode!: SourceCaptureErrorCode;

  static fromResult(
    result: FailedSourceCaptureResult,
  ): FailedMultipleSourceCaptureResultDto {
    const dto = new FailedMultipleSourceCaptureResultDto();
    dto.sourceId = result.sourceId;
    dto.status = result.status;
    dto.errorCode = result.errorCode;
    return dto;
  }
}

export class MultipleSourceCaptureResponseDto {
  @ApiProperty({
    description:
      'Resultado por sourceId efectivo, en el orden de su primera aparición',
    example: [
      {
        sourceId: '0f826bb6-df8e-42c5-bd57-27a213ff2f24',
        status: 'completed',
        itemsParsed: 3,
      },
      {
        sourceId: 'b5f51f91-0b48-45e5-a926-2e9f89f109dc',
        status: 'failed',
        errorCode: 'source-inactive',
      },
    ],
    type: 'array',
    items: {
      oneOf: [
        { $ref: getSchemaPath(CompletedMultipleSourceCaptureResultDto) },
        { $ref: getSchemaPath(FailedMultipleSourceCaptureResultDto) },
      ],
      discriminator: {
        propertyName: 'status',
        mapping: {
          completed: getSchemaPath(CompletedMultipleSourceCaptureResultDto),
          failed: getSchemaPath(FailedMultipleSourceCaptureResultDto),
        },
      },
    },
  })
  results!: Array<
    CompletedMultipleSourceCaptureResultDto | FailedMultipleSourceCaptureResultDto
  >;

  static fromResult(result: MultipleSourceCaptureResult): MultipleSourceCaptureResponseDto {
    const dto = new MultipleSourceCaptureResponseDto();
    dto.results = result.results.map((item) =>
      item.status === 'completed'
        ? CompletedMultipleSourceCaptureResultDto.fromResult(item)
        : FailedMultipleSourceCaptureResultDto.fromResult(item),
    );
    return dto;
  }
}
