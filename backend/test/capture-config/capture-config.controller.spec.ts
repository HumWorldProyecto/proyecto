import { BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { CaptureConfigController } from '../../src/capture-config/controllers/capture-config.controller';
import { PeriodicityInputError } from '../../src/capture-config/errors/periodicity.error';
import { CaptureConfigService } from '../../src/capture-config/services/capture-config.service';

describe('CaptureConfigController', () => {
  const service = {
    getCurrentState: jest.fn(),
    configure: jest.fn(),
  };
  let controller: CaptureConfigController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new CaptureConfigController(service as unknown as CaptureConfigService);
  });

  it('GET representa unconfigured como null y configured como número', async () => {
    service.getCurrentState
      .mockResolvedValueOnce({ kind: 'unconfigured' })
      .mockResolvedValueOnce({ kind: 'configured', minutes: 30 });

    await expect(controller.getCurrent()).resolves.toEqual({ capturePeriodicityMinutes: null });
    await expect(controller.getCurrent()).resolves.toEqual({ capturePeriodicityMinutes: 30 });
  });

  it('PUT devuelve 200 con la representación vigente', async () => {
    service.configure.mockResolvedValue({ kind: 'configured', minutes: 60 });
    await expect(controller.configure({ capturePeriodicityMinutes: 60 })).resolves.toEqual({
      capturePeriodicityMinutes: 60,
    });
  });

  it('mapea un valor inválido a 400', async () => {
    service.configure.mockRejectedValue(new PeriodicityInputError());
    await expect(controller.configure({ capturePeriodicityMinutes: 30 })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('mapea un error inesperado a 500 estándar sin detalles internos', async () => {
    service.getCurrentState.mockRejectedValue(new Error('Prisma en 10.0.0.4'));

    try {
      await controller.getCurrent();
      throw new Error('Se esperaba InternalServerErrorException');
    } catch (error) {
      expect(error).toBeInstanceOf(InternalServerErrorException);
      expect(JSON.stringify((error as InternalServerErrorException).getResponse())).not.toMatch(
        /Prisma|10\.0\.0\.4/,
      );
    }
  });
});
