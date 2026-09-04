export interface CapturedNewsItem {
  readonly sourceId: string;
  readonly title?: string;
  readonly link?: string | null;
  readonly guid?: string | null;
  readonly pubDate?: string;
  readonly description?: string;
}
