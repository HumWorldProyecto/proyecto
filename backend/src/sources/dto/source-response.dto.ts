import { ApiProperty } from '@nestjs/swagger';
import { RssSource } from '../types/rss-source';

export class SourceResponseDto {
  @ApiProperty({
    description: 'Identificador UUID estable de la fuente',
    example: '0f826bb6-df8e-42c5-bd57-27a213ff2f24',
  })
  id!: string;

  @ApiProperty({
    description: 'URL normalizada de la fuente',
    example: 'https://example.org/feed.xml',
  })
  url!: string;

  @ApiProperty({ description: 'Indica si la fuente es elegible para capturas', example: true })
  active!: boolean;

  @ApiProperty({
    description: 'Fecha de creación',
    format: 'date-time',
    example: '2026-09-04T12:00:00.000Z',
  })
  createdAt!: string;

  @ApiProperty({
    description: 'Fecha de última actualización',
    format: 'date-time',
    example: '2026-09-04T12:00:00.000Z',
  })
  updatedAt!: string;

  static fromDomain(source: RssSource): SourceResponseDto {
    const dto = new SourceResponseDto();
    dto.id = source.id;
    dto.url = source.url;
    dto.active = source.active;
    dto.createdAt = source.createdAt.toISOString();
    dto.updatedAt = source.updatedAt.toISOString();
    return dto;
  }
}
