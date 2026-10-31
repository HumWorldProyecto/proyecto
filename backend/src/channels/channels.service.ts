import { Inject, Injectable } from '@nestjs/common';
import { CHANNEL_REPOSITORY, ChannelInputError, ChannelNotFoundError, ChannelRepository } from './channel.port';

export function requireChannelName(value: unknown): string {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > 120) {
    throw new ChannelInputError('El nombre del medio debe tener entre 1 y 120 caracteres');
  }
  return value.trim();
}
@Injectable()
export class ChannelsService {
  constructor(@Inject(CHANNEL_REPOSITORY) private readonly repository: ChannelRepository) {}
  list() { return this.repository.list(); }
  async find(id: string) {
    const channel = await this.repository.find(id);
    if (!channel) throw new ChannelNotFoundError('El medio no existe');
    return channel;
  }
  create(name: unknown) { return this.repository.create(requireChannelName(name)); }
  rename(id: string, name: unknown) { return this.repository.rename(id, requireChannelName(name)); }
  remove(id: string) { return this.repository.remove(id); }
  attach(id: string, sourceId: string) { return this.repository.attach(id, sourceId); }
  detach(id: string, sourceId: string) { return this.repository.detach(id, sourceId); }
}
