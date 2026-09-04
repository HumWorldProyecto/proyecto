import { CapturedNewsItem } from '../types/captured-news-item';
import {
  IdentifiedCapturedNewsItem,
  NewsDedupeKey,
} from '../types/identified-captured-news-item';

function normalizeIdentityValue(value: string | null | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

export function resolveCapturedNewsItem(
  item: CapturedNewsItem,
): IdentifiedCapturedNewsItem | null {
  const guid = normalizeIdentityValue(item.guid);
  const link = normalizeIdentityValue(item.link);

  let dedupeKey: NewsDedupeKey;
  if (guid) {
    dedupeKey = `guid:${guid}`;
  } else if (link) {
    dedupeKey = `link:${link}`;
  } else {
    return null;
  }

  return {
    sourceId: item.sourceId,
    dedupeKey,
    title: item.title,
    link,
    guid,
    pubDate: item.pubDate,
    description: item.description,
  };
}
