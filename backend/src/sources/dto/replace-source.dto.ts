import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class ReplaceSourceDto {
  @ApiProperty({
    description: 'Nueva URL HTTP/HTTPS accesible de la fuente RSS',
    example: 'https://example.org/new-feed.xml',
  })
  @IsString()
  @IsNotEmpty()
  url!: string;
}
