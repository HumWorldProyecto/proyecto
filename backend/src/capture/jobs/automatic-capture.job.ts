import { Injectable } from '@nestjs/common';
import { CaptureOrchestratorService } from '../services/capture-orchestrator.service';

@Injectable()
export class AutomaticCaptureJob {
  private running = false;

  constructor(private readonly orchestrator: CaptureOrchestratorService) {}

  async run(): Promise<boolean> {
    if (this.running) {
      return false;
    }

    this.running = true;
    try {
      await this.orchestrator.runCapture();
      return true;
    } finally {
      this.running = false;
    }
  }
}
