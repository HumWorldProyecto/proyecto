export interface RssItem {
  readonly sourceId: string;
  readonly title?: string;
  readonly link?: string;
  readonly guid?: string;
  readonly pubDate?: string;
  readonly description?: string;
}
