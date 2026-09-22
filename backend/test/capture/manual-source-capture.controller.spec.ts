import {
  BadGatewayException,
  ConflictException,
  GatewayTimeoutException,
  HttpException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { ManualSourceCaptureController } from '../../src/capture/controllers/manual-source-capture.controller';
import { SourceCaptureError } from '../../src/capture/errors/source-capture.error';
import { ManualSourceCaptureService } from '../../src/capture/services/manual-source-capture.service';

describe('ManualSourceCaptureController', () => {
  const capture = jest.fn();
  const controller = new ManualSourceCaptureController({
    capture,
  } as unknown as ManualSourceCaptureService);

  beforeEach(() => jest.clearAllMocks());

  it('responde con el DTO mínimo de una captura completada', async () => {
    capture.mockResolvedValue({
      sourceId: 'source-a',
      status: 'completed',
      itemsParsed: 3,
    });

    await expect(controller.capture('source-a')).resolves.toEqual({
      sourceId: 'source-a',
      status: 'completed',
      itemsParsed: 3,
    });
    expect(capture).toHaveBeenCalledWith('source-a');
  });

  it.each([
    ['source-not-found' as const, NotFoundException, 404],
    ['source-inactive' as const, ConflictException, 409],
    ['source-busy' as const, ConflictException, 409],
    ['parse/invalid-rss' as const, BadGatewayException, 502],
    ['fetch/upstream' as const, BadGatewayException, 502],
    ['timeout' as const, GatewayTimeoutException, 504],
    ['unexpected' as const, InternalServerErrorException, 500],
  ])('mapea %s a HTTP %s', async (code, exceptionType, status) => {
    capture.mockRejectedValue(
      new SourceCaptureError(
        code,
        'source-a',
        new Error('upstream.internal 10.0.0.8 detalle secreto'),
      ),
    );

    const error = (await controller.capture('source-a').catch((caught) => caught)) as HttpException;

    expect(error).toBeInstanceOf(exceptionType);
    expect(error.getStatus()).toBe(status);
    expect(JSON.stringify(error.getResponse())).not.toMatch(
      /upstream\.internal|10\.0\.0\.8|detalle secreto/,
    );
  });

  it('mapea un error desconocido a 500 sin exponer detalles', async () => {
    capture.mockRejectedValue(new Error('prisma.internal 10.0.0.9 secreto'));

    const error = (await controller.capture('source-a').catch((caught) => caught)) as HttpException;

    expect(error).toBeInstanceOf(InternalServerErrorException);
    expect(error.getStatus()).toBe(500);
    expect(JSON.stringify(error.getResponse())).not.toMatch(/prisma\.internal|10\.0\.0\.9|secreto/);
  });

  it('mapea una categoría SourceCaptureError desconocida a 500', async () => {
    const error = new SourceCaptureError('unexpected', 'source-a');
    Object.defineProperty(error, 'code', { value: 'future-category' });
    capture.mockRejectedValue(error);

    await expect(controller.capture('source-a')).rejects.toBeInstanceOf(
      InternalServerErrorException,
    );
  });
});
