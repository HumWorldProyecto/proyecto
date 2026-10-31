import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ChannelNotFoundError, ChannelRepository } from './channel.port';

const include = { sources: { select: { id: true, url: true, active: true }, orderBy: { createdAt: 'asc' as const } } };
function translate(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError && ['P2025', 'P2003'].includes(error.code)) {
    throw new ChannelNotFoundError('El medio o la fuente no existe');
  }
  throw error;
}
@Injectable()
export class PrismaChannelRepository implements ChannelRepository {
  constructor(private readonly prisma: PrismaService) {}
  list() { return this.prisma.channel.findMany({ include, orderBy: { createdAt: 'asc' } }); }
  find(id: string) { return this.prisma.channel.findUnique({ where: { id }, include }); }
  create(name: string) { return this.prisma.channel.create({ data: { name }, include }); }
  async rename(id: string, name: string) {
    try { return await this.prisma.channel.update({ where: { id }, data: { name }, include }); }
    catch (error) { return translate(error); }
  }
  async remove(id: string) {
    try { await this.prisma.channel.delete({ where: { id } }); }
    catch (error) { translate(error); }
  }
  async attach(id: string, sourceId: string) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        await tx.rssSource.update({ where: { id: sourceId }, data: { channel: { connect: { id } } } });
        return tx.channel.findUniqueOrThrow({ where: { id }, include });
      });
    } catch (error) { return translate(error); }
  }
  async detach(id: string, sourceId: string) {
    return this.prisma.$transaction(async (tx) => {
      const changed = await tx.rssSource.updateMany({ where: { id: sourceId, channelId: id }, data: { channelId: null } });
      if (!changed.count) throw new ChannelNotFoundError('No existe esa asociación de medio y fuente');
      return tx.channel.findUniqueOrThrow({ where: { id }, include });
    });
  }
}
