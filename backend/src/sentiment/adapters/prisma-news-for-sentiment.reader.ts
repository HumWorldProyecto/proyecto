import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NewsForSentimentReadError } from '../errors/sentiment-analysis.error';
import {
  NewsForSentiment,
  NewsForSentimentReaderPort,
} from '../ports/news-for-sentiment-reader.port';

@Injectable()
export class PrismaNewsForSentimentReader implements NewsForSentimentReaderPort {
  constructor(private readonly prisma: PrismaService) {}

  async findById(newsId: string): Promise<NewsForSentiment | null> {
    try {
      const news = await this.prisma.news.findUnique({
        where: { id: newsId },
        select: { id: true, title: true, description: true },
      });
      return news ? Object.freeze(news) : null;
    } catch {
      throw new NewsForSentimentReadError();
    }
  }
}
