import { Controller, Get, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { HumorDashboardDto, HumorQueryDto } from '../dto/analytics.dto';
import { AnalyticsService } from '../services/analytics.service';
import { AnalyticsController } from './analytics.controller';

@ApiTags('sentiment')
@Controller('sentiment')
export class SentimentQueryController {
  constructor(private readonly analytics: AnalyticsService) {}
  @Get()
  @ApiOperation({ summary: 'Consultar humor global, por continente o país; filtros compartidos con el dashboard' })
  @ApiOkResponse({ type: HumorDashboardDto })
  query(@Query() input: HumorQueryDto) {
    return new AnalyticsController(this.analytics).query(input);
  }
}
