import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateSourceDto {
  @ApiProperty({
    description: 'URL HTTP/HTTPS accesible de la fuente RSS',
    example: 'https://example.org/feed.xml',
  })
  @IsString()
  @IsNotEmpty()
  url!: string;
}
