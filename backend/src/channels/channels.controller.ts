import { BadRequestException, Body, Controller, Delete, Get, HttpCode, InternalServerErrorException, NotFoundException, Param, ParseUUIDPipe, Post, Put } from '@nestjs/common';
import { ApiBadRequestResponse, ApiCreatedResponse, ApiNoContentResponse, ApiNotFoundResponse, ApiOkResponse, ApiProperty, ApiTags } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';
import { RequireApiKey } from '../auth/require-api-key.decorator';
import { ChannelInputError, ChannelNotFoundError } from './channel.port';
import { ChannelsService } from './channels.service';

export class ChannelInputDto {
  @ApiProperty({ minLength: 1, maxLength: 120 }) @IsString() @MinLength(1) @MaxLength(120) name!: string;
}
class ChannelSourceDto {
  @ApiProperty() id!: string;
  @ApiProperty() url!: string;
  @ApiProperty() active!: boolean;
}
export class ChannelDto {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiProperty({ format: 'date-time' }) createdAt!: string;
  @ApiProperty({ format: 'date-time' }) updatedAt!: string;
  @ApiProperty({ type: [ChannelSourceDto] }) sources!: ChannelSourceDto[];
}

@ApiTags('channels') @ApiNotFoundResponse() @Controller('channels')
export class ChannelsController {
  constructor(private readonly channels: ChannelsService) {}
  @Get() @RequireApiKey('read') @ApiOkResponse({ type: [ChannelDto] })
  list() { return this.execute(() => this.channels.list()); }
  @Get(':id') @RequireApiKey('read') @ApiOkResponse({ type: ChannelDto })
  find(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) { return this.execute(() => this.channels.find(id)); }
  @Post() @RequireApiKey('write') @ApiCreatedResponse({ type: ChannelDto }) @ApiBadRequestResponse()
  create(@Body() body: ChannelInputDto) { return this.execute(() => this.channels.create(body.name)); }
  @Put(':id') @RequireApiKey('write') @ApiOkResponse({ type: ChannelDto }) @ApiBadRequestResponse()
  rename(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string, @Body() body: ChannelInputDto) { return this.execute(() => this.channels.rename(id, body.name)); }
  @Delete(':id') @HttpCode(204) @RequireApiKey('write') @ApiNoContentResponse()
  remove(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) { return this.execute(() => this.channels.remove(id)); }
  @Put(':id/sources/:sourceId') @RequireApiKey('write') @ApiOkResponse({ type: ChannelDto })
  attach(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Param('sourceId', new ParseUUIDPipe({ version: '4' })) sourceId: string) { return this.execute(() => this.channels.attach(id, sourceId)); }
  @Delete(':id/sources/:sourceId') @RequireApiKey('write') @ApiOkResponse({ type: ChannelDto })
  detach(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Param('sourceId', new ParseUUIDPipe({ version: '4' })) sourceId: string) { return this.execute(() => this.channels.detach(id, sourceId)); }
  private async execute<T>(operation: () => Promise<T>): Promise<T> {
    try { return await operation(); }
    catch (error) {
      if (error instanceof ChannelInputError) throw new BadRequestException(error.message);
      if (error instanceof ChannelNotFoundError) throw new NotFoundException(error.message);
      throw new InternalServerErrorException('No se pudo completar la operación de medios');
    }
  }
}
