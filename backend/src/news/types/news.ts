export interface News {
  readonly id: string;
  readonly sourceId: string;
  readonly title: string | null;
  readonly link: string | null;
  readonly guid: string | null;
  readonly description: string | null;
  readonly pubDate: Date | null;
  readonly capturedAt: Date;
}
