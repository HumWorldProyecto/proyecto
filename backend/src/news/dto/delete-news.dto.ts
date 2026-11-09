import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';
export class DeleteNewsDto {
  @ApiProperty({ format: 'uuid', description: 'Identificador de la noticia que se eliminará' })
  @IsUUID('4') id!: string;
}
