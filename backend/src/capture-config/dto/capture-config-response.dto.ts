import { ApiProperty } from '@nestjs/swagger';
import {
  ALLOWED_PERIODICITY_MINUTES,
  AllowedPeriodicityMinutes,
  PeriodicityState,
} from '../domain/periodicity';

export class CaptureConfigResponseDto {
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
