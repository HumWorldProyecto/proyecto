import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsString, Matches, ValidateIf } from 'class-validator';
import { AnalyticsContinent, CONTINENTS } from '../types/analytics';

export class HumorQueryDto {
  @ApiPropertyOptional({ enum: CONTINENTS })
  @ValidateIf((_o, v) => v !== undefined)
  @IsIn(CONTINENTS)
  continent?: AnalyticsContinent;

  @ApiPropertyOptional({ example: 'CL', description: 'País ISO alpha-2 del catálogo' })
  @ValidateIf((_o, v) => v !== undefined)
  @IsString()
  @Matches(/^[A-Z]{2}$/)
  country?: string;

  @ApiPropertyOptional({ example: '2026-10-01', description: 'Primer día UTC incluido' })
  @ValidateIf((_o, v) => v !== undefined)
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  from?: string;

  @ApiPropertyOptional({ example: '2026-10-20', description: 'Último día UTC incluido' })
  @ValidateIf((_o, v) => v !== undefined)
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  to?: string;
}

export class AssignCountryDto {
  @ApiProperty({
    type: String,
    nullable: true,
    example: 'CL',
    description: 'null retira el país y conserva el continente anterior',
  })
  @ValidateIf((_o, v) => v !== null)
  @IsString()
  @Matches(/^[A-Z]{2}$/)
  countryCode!: string | null;
}

export class CountryDto {
  @ApiProperty() code!: string;
  @ApiProperty() name!: string;
  @ApiProperty({ enum: CONTINENTS }) continent!: AnalyticsContinent;
}
export class SourceGeographyDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() url!: string;
  @ApiProperty() active!: boolean;
  @ApiProperty({ type: String, nullable: true }) countryCode!: string | null;
  @ApiProperty({ enum: CONTINENTS, nullable: true }) continent!: AnalyticsContinent | null;
}
export class GeographyDto {
  @ApiProperty({ type: [CountryDto] }) countries!: CountryDto[];
  @ApiProperty({ type: [SourceGeographyDto] }) sources!: SourceGeographyDto[];
}
export class CoverageDto {
  @ApiProperty() total!: number;
  @ApiProperty() analyzed!: number;
  @ApiProperty() withEvidence!: number;
  @ApiProperty() withoutEvidence!: number;
  @ApiProperty() unanalyzed!: number;
  @ApiProperty() unknownCountry!: number;
  @ApiProperty() missingTermEvidence!: number;
  @ApiProperty({ type: Number, nullable: true, minimum: -1, maximum: 1 }) average!: number | null;
}
export class TimelineDto extends CoverageDto {
  @ApiProperty({ format: 'date' }) date!: string;
}
export class CountryCoverageDto extends CoverageDto {
  @ApiProperty() code!: string;
  @ApiProperty() name!: string;
  @ApiProperty({ enum: CONTINENTS }) continent!: AnalyticsContinent;
}
export class TermEvidenceDto {
  @ApiProperty() term!: string;
  @ApiProperty({ enum: ['es', 'en'] }) language!: 'es' | 'en';
  @ApiProperty({ minimum: -5, maximum: 5 }) weight!: number;
  @ApiProperty({ minimum: 1 }) occurrences!: number;
}
export class WordInfluenceDto {
  @ApiProperty() term!: string;
  @ApiProperty({ enum: ['es', 'en'] }) language!: 'es' | 'en';
  @ApiProperty() occurrences!: number;
  @ApiProperty() newsCount!: number;
  @ApiProperty({ description: 'Suma de contribuciones con signo al promedio' })
  contribution!: number;
  @ApiProperty({ description: 'Suma de magnitudes de contribución; determina tamaño' })
  influence!: number;
}
export class NewsDetailDto {
  @ApiProperty() id!: string;
  @ApiProperty({ type: String, nullable: true }) title!: string | null;
  @ApiProperty({ type: String, nullable: true }) description!: string | null;
  @ApiProperty({ type: String, nullable: true }) link!: string | null;
  @ApiProperty({ format: 'date-time' }) date!: string;
  @ApiProperty({ enum: ['publication', 'capture'] }) dateSource!: string;
  @ApiProperty() sourceId!: string;
  @ApiProperty() sourceUrl!: string;
  @ApiProperty({ type: String, nullable: true }) countryCode!: string | null;
  @ApiProperty({ enum: CONTINENTS, nullable: true }) continent!: AnalyticsContinent | null;
  @ApiProperty({ type: Number, nullable: true }) score!: number | null;
  @ApiProperty({ type: Number, nullable: true }) matchedTerms!: number | null;
  @ApiProperty({ enum: ['es', 'en'], nullable: true }) language!: 'es' | 'en' | null;
  @ApiProperty({ type: String, format: 'date-time', nullable: true }) analyzedAt!: string | null;
  @ApiProperty({ type: [TermEvidenceDto], nullable: true }) terms!: TermEvidenceDto[] | null;
  @ApiProperty({
    type: Number,
    nullable: true,
    description: 'score / noticias con evidencia del conjunto',
  })
  contribution!: number | null;
}
export class EffectiveFilterDto {
  @ApiProperty({ enum: CONTINENTS, nullable: true }) continent!: AnalyticsContinent | null;
  @ApiProperty({ type: String, nullable: true }) country!: string | null;
  @ApiProperty({ type: String, nullable: true, format: 'date' }) from!: string | null;
  @ApiProperty({ type: String, nullable: true, format: 'date' }) to!: string | null;
}
export class HumorDashboardDto {
  @ApiProperty({ type: EffectiveFilterDto }) filters!: EffectiveFilterDto;
  @ApiProperty({ type: CoverageDto }) summary!: CoverageDto;
  @ApiProperty({ type: [TimelineDto] }) timeline!: TimelineDto[];
  @ApiProperty({ type: [CountryCoverageDto] }) countries!: CountryCoverageDto[];
  @ApiProperty({ type: [WordInfluenceDto] }) words!: WordInfluenceDto[];
  @ApiProperty({ type: [NewsDetailDto] }) news!: NewsDetailDto[];
}
