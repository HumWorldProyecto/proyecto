import { Inject, Injectable } from '@nestjs/common';
import {
  SOURCE_REGISTRY_PORT,
  SourceRegistryPort,
} from '../../sources/ports/source-registry.port';
import { SourceCaptureError } from '../errors/source-capture.error';
import { SourceCaptureResult } from '../types/source-capture-result';
import { SourceCaptureService } from './source-capture.service';

@Injectable()
export class ManualSourceCaptureService {
  constructor(
    @Inject(SOURCE_REGISTRY_PORT) private readonly sourceRegistry: SourceRegistryPort,
    private readonly sourceCapture: SourceCaptureService,
  ) {}

  async capture(sourceId: string): Promise<SourceCaptureResult> {
    const selection = await this.sourceRegistry.findForCapture(sourceId);

    if (selection.kind === 'missing') {
      throw new SourceCaptureError('source-not-found', sourceId);
    }

    if (selection.kind === 'inactive') {
      throw new SourceCaptureError('source-inactive', sourceId);
    }

    return this.sourceCapture.capture(selection.source);
  }
}
