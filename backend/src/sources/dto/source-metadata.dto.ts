import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsString, IsUUID, Matches, ValidateIf } from 'class-validator';
import { MEDIA_TOPIC_QCODES } from '../../classification/types/media-topic';

export class SourceMetadataDto {
  @ApiPropertyOptional({ type: String, nullable: true, example: 'CL' })
  @ValidateIf((_o, v) => v !== undefined && v !== null)
  @IsString() @Matches(/^[A-Z]{2}$/)
  countryCode?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true, format: 'uuid' })
  @ValidateIf((_o, v) => v !== undefined && v !== null)
  @IsUUID('4')
  channelId?: string | null;

  @ApiPropertyOptional({ enum: ['es', 'en'], nullable: true })
  @ValidateIf((_o, v) => v !== undefined && v !== null)
  @IsIn(['es', 'en'])
  language?: 'es' | 'en' | null;

  @ApiPropertyOptional({ enum: MEDIA_TOPIC_QCODES, nullable: true })
  @ValidateIf((_o, v) => v !== undefined && v !== null)
  @IsIn(MEDIA_TOPIC_QCODES)
  mediaTopicQcode?: string | null;
}
