import { AutomaticCaptureJob } from '../../src/capture/jobs/automatic-capture.job';
import { CaptureTriggerPort } from '../../src/capture/ports/capture-trigger.port';
import { CaptureOrchestratorService } from '../../src/capture/services/capture-orchestrator.service';

describe('AutomaticCaptureJob', () => {
  it('inicia el disparador delegando la ejecución en el caso de uso de captura al arrancar el módulo', () => {
    const trigger: CaptureTriggerPort = { start: jest.fn(), stop: jest.fn() };
    const orchestrator = { runCapture: jest.fn().mockResolvedValue(undefined) } as unknown as CaptureOrchestratorService;

    const job = new AutomaticCaptureJob(trigger, orchestrator);
    job.onModuleInit();

    expect(trigger.start).toHaveBeenCalledTimes(1);
    const registeredCallback = (trigger.start as jest.Mock).mock.calls[0][0];
    registeredCallback();
    expect(orchestrator.runCapture).toHaveBeenCalledTimes(1);
  });

  it('detiene el disparador al destruir el módulo, sin duplicar la lógica de negocio del caso de uso', () => {
    const trigger: CaptureTriggerPort = { start: jest.fn(), stop: jest.fn() };
    const orchestrator = { runCapture: jest.fn() } as unknown as CaptureOrchestratorService;

    const job = new AutomaticCaptureJob(trigger, orchestrator);
    job.onModuleDestroy();

    expect(trigger.stop).toHaveBeenCalledTimes(1);
  });
});
