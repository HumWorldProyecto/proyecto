export type RssSource = Readonly<{
  countryCode?: string | null;
  continent?: import('@prisma/client').Continent | null;
  channelId?: string | null;
  language?: 'es' | 'en' | null;
  mediaTopicQcode?: string | null;
  id: string;
  url: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}>;
