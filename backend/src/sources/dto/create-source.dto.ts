import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

import { SourceMetadataDto } from './source-metadata.dto';

export class CreateSourceDto extends SourceMetadataDto {
  @ApiProperty({
    description: 'URL HTTP/HTTPS accesible de la fuente RSS',
    example: 'https://example.org/feed.xml',
  })
  @IsString()
  @IsNotEmpty()
  url!: string;
}
