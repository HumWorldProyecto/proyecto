import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';

export class ListSourcesQueryDto {
  @ApiPropertyOptional({
    description: 'Filtra estrictamente por estado',
    enum: ['true', 'false'],
    example: 'true',
  })
  @IsOptional()
  @IsIn(['true', 'false'])
  active?: 'true' | 'false';

  toActiveFilter(): boolean | undefined {
    return this.active === undefined ? undefined : this.active === 'true';
  }
}
