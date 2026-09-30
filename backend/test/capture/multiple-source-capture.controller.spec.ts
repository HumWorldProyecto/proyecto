import {
  BadRequestException,
  HttpException,
  InternalServerErrorException,
} from '@nestjs/common';
import { MultipleSourceCaptureController } from '../../src/capture/controllers/multiple-source-capture.controller';
import { MultipleSourceCaptureInputError } from '../../src/capture/errors/multiple-source-capture-input.error';
import { MultipleSourceCaptureService } from '../../src/capture/services/multiple-source-capture.service';

describe('MultipleSourceCaptureController', () => {
  const capture = jest.fn();
  const controller = new MultipleSourceCaptureController({
    capture,
  } as unknown as MultipleSourceCaptureService);

  beforeEach(() => jest.clearAllMocks());

  it('delega una vez y serializa la unión discriminada exacta', async () => {
    capture.mockResolvedValue({
      results: [
        {
          sourceId: 'source-a',
          status: 'completed',
          itemsParsed: 3,
        },
        {
          sourceId: 'source-b',
          status: 'failed',
          errorCode: 'source-inactive',
        },
      ],
    });

    await expect(
      controller.capture({ sourceIds: ['source-a', 'source-b'] }),
    ).resolves.toEqual({
      results: [
        {
          sourceId: 'source-a',
          status: 'completed',
          itemsParsed: 3,
        },
        {
          sourceId: 'source-b',
          status: 'failed',
          errorCode: 'source-inactive',
        },
      ],
    });
    expect(capture).toHaveBeenCalledTimes(1);
    expect(capture).toHaveBeenCalledWith(['source-a', 'source-b']);
  });

  it('traduce el error de cardinalidad efectiva a 400', async () => {
    capture.mockRejectedValue(new MultipleSourceCaptureInputError());

    const error = (await controller
      .capture({ sourceIds: ['source-a', 'source-a'] })
      .catch((caught) => caught)) as HttpException;

    expect(error).toBeInstanceOf(BadRequestException);
    expect(error.getStatus()).toBe(400);
  });

  it('traduce un fallo global desconocido a 500 sin filtrar detalles', async () => {
    capture.mockRejectedValue(new Error('prisma.internal 10.0.0.9 secreto'));

    const error = (await controller
      .capture({ sourceIds: ['source-a', 'source-b'] })
      .catch((caught) => caught)) as HttpException;

    expect(error).toBeInstanceOf(InternalServerErrorException);
    expect(error.getStatus()).toBe(500);
    expect(JSON.stringify(error.getResponse())).not.toMatch(
      /prisma\.internal|10\.0\.0\.9|secreto/,
    );
  });
});
