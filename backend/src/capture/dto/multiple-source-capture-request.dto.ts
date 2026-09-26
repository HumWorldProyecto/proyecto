import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsString } from 'class-validator';

export class MultipleSourceCaptureRequestDto {
  @ApiProperty({
    description:
      'Identificadores de fuentes RSS; se deduplican preservando orden y deben quedar al menos dos efectivos',
    example: [
      '0f826bb6-df8e-42c5-bd57-27a213ff2f24',
      'b5f51f91-0b48-45e5-a926-2e9f89f109dc',
      '0f826bb6-df8e-42c5-bd57-27a213ff2f24',
    ],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  sourceIds!: string[];
}
