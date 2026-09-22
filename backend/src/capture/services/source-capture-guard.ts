import { Injectable } from '@nestjs/common';

export type SourceCaptureLease = Readonly<{
  release(): void;
}>;

@Injectable()
export class SourceCaptureGuard {
  private readonly activeSourceIds = new Set<string>();

  tryAcquire(sourceId: string): SourceCaptureLease | null {
    if (this.activeSourceIds.has(sourceId)) {
      return null;
    }

    this.activeSourceIds.add(sourceId);
    let released = false;

    return Object.freeze({
      release: () => {
        if (!released) {
          this.activeSourceIds.delete(sourceId);
          released = true;
        }
      },
    });
  }
}
