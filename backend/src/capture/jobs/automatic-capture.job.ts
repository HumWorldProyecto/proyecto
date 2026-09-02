import { Inject, Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { CAPTURE_TRIGGER_PORT, CaptureTriggerPort } from '../ports/capture-trigger.port';
import { CaptureOrchestratorService } from '../services/capture-orchestrator.service';

/**
 * Job: dispara el caso de uso de captura y no duplica su lógica de negocio.
 */
@Injectable()
export class AutomaticCaptureJob implements OnModuleInit, OnModuleDestroy {
  constructor(
    @Inject(CAPTURE_TRIGGER_PORT) private readonly trigger: CaptureTriggerPort,
    private readonly orchestrator: CaptureOrchestratorService,
  ) {}

  onModuleInit(): void {
    this.trigger.start(() => this.orchestrator.runCapture());
  }

  onModuleDestroy(): void {
    this.trigger.stop();
  }
}
