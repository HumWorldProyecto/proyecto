import { Inject, Injectable } from '@nestjs/common';
import {
  SOURCE_REGISTRY_PORT,
  SourceRegistryPort,
} from '../../sources/ports/source-registry.port';
import { SourceCaptureService } from './source-capture.service';

@Injectable()
export class CaptureOrchestratorService {
  constructor(
    @Inject(SOURCE_REGISTRY_PORT) private readonly sourceRegistry: SourceRegistryPort,
    private readonly sourceCapture: SourceCaptureService,
  ) {}

  async runCapture(): Promise<void> {
    const sourcesSnapshot = await this.sourceRegistry.getEligibleSources();

    if (sourcesSnapshot.length === 0) {
      return;
    }

    for (const source of sourcesSnapshot) {
      try {
        await this.sourceCapture.capture(source);
      } catch {
        // HU-01 aísla cada fuente, incluidas las que estén ocupadas.
      }
    }
  }
}
