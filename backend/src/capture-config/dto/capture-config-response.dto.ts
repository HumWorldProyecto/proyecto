import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ALLOWED_PERIODICITY_MINUTES,
  AllowedPeriodicityMinutes,
  PeriodicityState,
} from '../domain/periodicity';

export class CaptureConfigResponseDto {
  @ApiPropertyOptional({ type: Number, nullable: true, description: 'Días desde captura; null desactiva caducidad' }) retentionDays?: number | null;
  @ApiPropertyOptional({ type: Boolean, description: 'Administración abierta solo en la evaluación local explícita' }) evaluationMode?: boolean;

  @ApiProperty({
    description: 'Periodicidad vigente; null indica que aún no está configurada',
    enum: ALLOWED_PERIODICITY_MINUTES,
    nullable: true,
    example: 30,
  })
  capturePeriodicityMinutes!: AllowedPeriodicityMinutes | null;

  static fromState(state: PeriodicityState): CaptureConfigResponseDto {
    const dto = new CaptureConfigResponseDto();
    dto.capturePeriodicityMinutes = state.kind === 'configured' ? state.minutes : null;
    return dto;
  }
}
