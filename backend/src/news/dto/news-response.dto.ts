import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { News } from '../types/news';

export class NewsResponseDto {
  @ApiProperty({ description: 'Identificador interno de la noticia almacenada' })
  id!: string;

  @ApiProperty({ description: 'Referencia a la fuente RSS de origen (sourceId)' })
  source!: string;

  @ApiPropertyOptional({ description: 'Título de la noticia', nullable: true })
  title!: string | null;

  @ApiPropertyOptional({ description: 'Enlace a la noticia', nullable: true })
  link!: string | null;

  @ApiPropertyOptional({ description: 'GUID del ítem RSS', nullable: true })
  guid!: string | null;

  @ApiPropertyOptional({ description: 'Descripción del ítem RSS', nullable: true })
  description!: string | null;

  @ApiPropertyOptional({ description: 'Fecha de publicación reportada por el feed', nullable: true })
  pubDate!: Date | null;

  @ApiProperty({ description: 'Momento en el que HumWorld almacenó la noticia' })
  capturedAt!: Date;

  static fromDomain(news: News): NewsResponseDto {
    const dto = new NewsResponseDto();
    dto.id = news.id;
    dto.source = news.sourceId;
    dto.title = news.title;
    dto.link = news.link;
    dto.guid = news.guid;
    dto.description = news.description;
    dto.pubDate = news.pubDate;
    dto.capturedAt = news.capturedAt;
    return dto;
  }
}
