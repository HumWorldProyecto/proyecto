import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { NewsService } from '../services/news.service';
import { NewsResponseDto } from '../dto/news-response.dto';

@ApiTags('news')
@Controller('news')
export class NewsController {
  constructor(private readonly newsService: NewsService) {}

  @Get()
  @ApiOkResponse({
    description: 'Listado de noticias almacenadas (lista vacía si no hay ninguna)',
    type: NewsResponseDto,
    isArray: true,
  })
  async list(): Promise<NewsResponseDto[]> {
    const news = await this.newsService.listNews();
    return news.map(NewsResponseDto.fromDomain);
  }
}
