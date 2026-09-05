import { AutomaticCaptureJob } from '../../src/capture/jobs/automatic-capture.job';
import { CaptureOrchestratorService } from '../../src/capture/services/capture-orchestrator.service';

describe('AutomaticCaptureJob', () => {
  it('omite sin ejecutar ni encolar una activación solapada y admite otra posterior', async () => {
    let releaseFirst!: () => void;
    const firstCapture = new Promise<void>((resolve) => {
      releaseFirst = resolve;
    });
    const runCapture = jest
      .fn()
      .mockImplementationOnce(() => firstCapture)
      .mockResolvedValueOnce(undefined);
    const job = new AutomaticCaptureJob({ runCapture } as unknown as CaptureOrchestratorService);

    const activationA = job.run();
    await Promise.resolve();
    await expect(job.run()).resolves.toBe(false);
    expect(runCapture).toHaveBeenCalledTimes(1);

    releaseFirst();
    await expect(activationA).resolves.toBe(true);
    await expect(job.run()).resolves.toBe(true);
    expect(runCapture).toHaveBeenCalledTimes(2);
  });

  it('libera el guard en finally cuando el orquestador falla', async () => {
    const runCapture = jest
      .fn()
      .mockRejectedValueOnce(new Error('fallo controlado por la capa superior'))
      .mockResolvedValueOnce(undefined);
    const job = new AutomaticCaptureJob({ runCapture } as unknown as CaptureOrchestratorService);

    await expect(job.run()).rejects.toThrow('fallo controlado');
    await expect(job.run()).resolves.toBe(true);
    expect(runCapture).toHaveBeenCalledTimes(2);
  });
});
