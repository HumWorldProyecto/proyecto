import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsString, ValidateIf } from 'class-validator';

import { SourceMetadataDto } from './source-metadata.dto';

export class UpdateSourceDto extends SourceMetadataDto {
  @ApiPropertyOptional({
    description: 'Nueva URL HTTP/HTTPS accesible de la fuente RSS',
    example: 'https://example.org/updated-feed.xml',
  })
  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @IsNotEmpty()
  url?: string;

  @ApiPropertyOptional({
    description: 'Estado de activación de la fuente',
    example: true,
  })
  @ValidateIf((_object, value) => value !== undefined)
  @IsBoolean()
  active?: boolean;
}
