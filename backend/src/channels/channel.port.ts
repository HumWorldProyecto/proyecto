export type ChannelSource = Readonly<{ id: string; url: string; active: boolean }>;
export type Channel = Readonly<{ id: string; name: string; createdAt: Date; updatedAt: Date; sources: readonly ChannelSource[] }>;
export class ChannelInputError extends Error {}
export class ChannelNotFoundError extends Error {}
export interface ChannelRepository {
  list(): Promise<readonly Channel[]>;
  find(id: string): Promise<Channel | null>;
  create(name: string): Promise<Channel>;
  rename(id: string, name: string): Promise<Channel>;
  remove(id: string): Promise<void>;
  attach(id: string, sourceId: string): Promise<Channel>;
  detach(id: string, sourceId: string): Promise<Channel>;
}
export const CHANNEL_REPOSITORY = Symbol('CHANNEL_REPOSITORY');
