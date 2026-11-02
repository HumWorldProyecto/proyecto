import { BadRequestException, Body, ConflictException, Controller, Get, HttpCode, InternalServerErrorException, Post, Put } from '@nestjs/common';
import { LifecycleConflictError, LifecycleInputError } from './lifecycle.errors';
import { ApiBadRequestResponse, ApiConflictResponse, ApiOkResponse, ApiProperty, ApiTags } from '@nestjs/swagger';
import { IsInt, Max, Min, ValidateIf } from 'class-validator';
import { RequireApiKey } from '../auth/require-api-key.decorator';
import { LifecycleService, MAX_RETENTION_DAYS } from './lifecycle.service';

export class ConfigureRetentionDto {
  @ApiProperty({ type: Number, nullable: true, minimum: 1, maximum: MAX_RETENTION_DAYS, description: 'Días desde captura; null desactiva' })
  @ValidateIf((_object, value) => value !== null) @IsInt() @Min(1) @Max(MAX_RETENTION_DAYS)
  retentionDays!: number | null;
}
export class PurgeRequestDto {
  @ApiProperty({ minimum: 1, maximum: MAX_RETENTION_DAYS, description: 'Periodo mostrado en la vista previa' })
  @IsInt() @Min(1) @Max(MAX_RETENTION_DAYS) expectedRetentionDays!: number;
}
export class RetentionDto {
  @ApiProperty({ type: Number, nullable: true }) retentionDays!: number | null;
}
export class PurgePreviewDto extends RetentionDto {
  @ApiProperty({ nullable: true, type: String, format: 'date-time' }) cutoff!: string | null;
  @ApiProperty({ format: 'date-time' }) evaluatedAt!: string;
  @ApiProperty() totalCount!: number;
  @ApiProperty() expiredCount!: number;
}
export class PurgeResultDto extends RetentionDto {
  @ApiProperty({ nullable: true, type: String, format: 'date-time' }) cutoff!: string | null;
  @ApiProperty({ format: 'date-time' }) evaluatedAt!: string;
  @ApiProperty() deletedCount!: number;
  @ApiProperty() skipped!: boolean;
}

@ApiTags('lifecycle')
@Controller()
export class LifecycleController {
  constructor(private readonly lifecycle: LifecycleService) {}
  @Get('config/retention') @RequireApiKey('read') @ApiOkResponse({ type: RetentionDto })
  policy() { return this.execute(() => this.lifecycle.getPolicy()); }
  @Put('config/retention') @RequireApiKey('write') @ApiOkResponse({ type: RetentionDto })
  @ApiBadRequestResponse() @ApiConflictResponse()
  configure(@Body() body: ConfigureRetentionDto) { return this.execute(() => this.lifecycle.configure(body.retentionDays)); }
  @Get('news/purge-preview') @RequireApiKey('read') @ApiOkResponse({ type: PurgePreviewDto })
  preview() { return this.execute(() => this.lifecycle.preview()); }
  @Post('news/purge') @HttpCode(200) @RequireApiKey('write') @ApiOkResponse({ type: PurgeResultDto })
  @ApiBadRequestResponse() @ApiConflictResponse()
  purge(@Body() body: PurgeRequestDto) { return this.execute(() => this.lifecycle.purge({ expectedRetentionDays: body.expectedRetentionDays })); }
  private async execute<T>(operation: () => Promise<T>): Promise<T> {
    try { return await operation(); }
    catch (error) {
      if (error instanceof LifecycleInputError) throw new BadRequestException(error.message);
      if (error instanceof LifecycleConflictError) throw new ConflictException(error.message);
      throw new InternalServerErrorException('No se pudo completar la operación de ciclo de vida');
    }
  }
}
