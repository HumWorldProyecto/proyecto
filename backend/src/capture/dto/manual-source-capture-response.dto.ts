import { ApiProperty } from '@nestjs/swagger';
import { SourceCaptureResult } from '../types/source-capture-result';

export class ManualSourceCaptureResponseDto {
  @ApiProperty({
    description: 'Identificador estable de la fuente capturada',
    example: '0f826bb6-df8e-42c5-bd57-27a213ff2f24',
  })
  sourceId!: string;

  @ApiProperty({
    description: 'Estado de finalización de la captura',
    enum: ['completed'],
    example: 'completed',
  })
  status!: 'completed';

  @ApiProperty({
    description: 'Cantidad de ítems interpretados del RSS; no representa filas persistidas',
    example: 3,
    minimum: 0,
  })
  itemsParsed!: number;

  static fromResult(result: SourceCaptureResult): ManualSourceCaptureResponseDto {
    const dto = new ManualSourceCaptureResponseDto();
    dto.sourceId = result.sourceId;
    dto.status = result.status;
    dto.itemsParsed = result.itemsParsed;
    return dto;
  }
}
