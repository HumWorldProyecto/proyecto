import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsInt } from 'class-validator';
import {
  ALLOWED_PERIODICITY_MINUTES,
  AllowedPeriodicityMinutes,
} from '../domain/periodicity';

export class UpdateCaptureConfigDto {
  @ApiProperty({
    description: 'Periodicidad global de captura expresada en minutos',
    enum: ALLOWED_PERIODICITY_MINUTES,
    example: 30,
  })
  @IsInt()
  @IsIn(ALLOWED_PERIODICITY_MINUTES)
  capturePeriodicityMinutes!: AllowedPeriodicityMinutes;
}
