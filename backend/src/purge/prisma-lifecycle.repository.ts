import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LifecycleRepository } from './lifecycle.port';

@Injectable()
export class PrismaLifecycleRepository implements LifecycleRepository {
  constructor(private readonly prisma: PrismaService) {}
  async getPolicy() {
    const row = await this.prisma.newsRetentionPolicy.findUnique({ where: { id: 'global' } });
    return { retentionDays: row?.retentionDays ?? null };
  }
  async savePolicy(days: number | null) {
    const row = await this.prisma.newsRetentionPolicy.upsert({
      where: { id: 'global' }, create: { retentionDays: days }, update: { retentionDays: days },
    });
    return { retentionDays: row.retentionDays };
  }
  async count(cutoff: Date | null) {
    const [totalCount, expiredCount] = await this.prisma.$transaction([
      this.prisma.news.count(),
      this.prisma.news.count({ where: cutoff ? { capturedAt: { lt: cutoff } } : { id: { in: [] } } }),
    ]);
    return { totalCount, expiredCount };
  }
  async deleteBefore(cutoff: Date) {
    return (await this.prisma.news.deleteMany({ where: { capturedAt: { lt: cutoff } } })).count;
  }
}
