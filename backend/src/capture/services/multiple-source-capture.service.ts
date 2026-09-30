import { Injectable } from '@nestjs/common';
import {
  SourceCaptureError,
  SourceCaptureErrorCode,
} from '../errors/source-capture.error';
import { MultipleSourceCaptureInputError } from '../errors/multiple-source-capture-input.error';
import {
  IndividualSourceCaptureResult,
  MultipleSourceCaptureResult,
} from '../types/source-capture-result';
import { ManualSourceCaptureService } from './manual-source-capture.service';

@Injectable()
export class MultipleSourceCaptureService {
  constructor(private readonly manualCapture: ManualSourceCaptureService) {}

  async capture(sourceIds: readonly string[]): Promise<MultipleSourceCaptureResult> {
    const effectiveSourceIds = [...new Set(sourceIds)];

    if (effectiveSourceIds.length < 2) {
      throw new MultipleSourceCaptureInputError();
    }

    const results: IndividualSourceCaptureResult[] = [];

    for (const sourceId of effectiveSourceIds) {
      try {
        const result = await this.manualCapture.capture(sourceId);
        results.push(result);
      } catch (error) {
        results.push(
          Object.freeze({
            sourceId,
            status: 'failed' as const,
            errorCode: this.toErrorCode(error),
          }),
        );
      }
    }

    return Object.freeze({ results: Object.freeze(results) });
  }

  private toErrorCode(error: unknown): SourceCaptureErrorCode {
    if (!(error instanceof SourceCaptureError)) {
      return 'unexpected';
    }

    switch (error.code) {
      case 'source-not-found':
      case 'source-inactive':
      case 'source-busy':
      case 'fetch/upstream':
      case 'parse/invalid-rss':
      case 'timeout':
      case 'unexpected':
        return error.code;
      default:
        return 'unexpected';
    }
  }
}
