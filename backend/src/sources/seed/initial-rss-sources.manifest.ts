import { Continent } from '@prisma/client';

export type InitialRssSourceManifestEntry = Readonly<{
  url: string;
  continent: Continent;
}>;

export const INITIAL_RSS_SOURCES_MANIFEST: readonly InitialRssSourceManifestEntry[] =
  Object.freeze([
    Object.freeze({
      url: 'https://africanews.com/feed/rss',
      continent: Continent.AFRICA,
    }),
    Object.freeze({
      url: 'https://www.straitstimes.com/news/asia/rss.xml',
      continent: Continent.ASIA,
    }),
    Object.freeze({
      url: 'https://www.euronews.com/rss?format=mrss&level=theme&name=news',
      continent: Continent.EUROPE,
    }),
    Object.freeze({
      url: 'https://moxie.foxnews.com/google-publisher/latest.xml',
      continent: Continent.NORTH_AMERICA,
    }),
    Object.freeze({
      url: 'https://en.mercopress.com/rss/',
      continent: Continent.SOUTH_AMERICA,
    }),
    Object.freeze({
      url: 'https://www.theguardian.com/australia-news/rss',
      continent: Continent.OCEANIA,
    }),
  ]);
