import {
  BadRequestException,
  ConflictException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { SourcesController } from '../../src/sources/controllers/sources.controller';
import { ListSourcesQueryDto } from '../../src/sources/dto/list-sources-query.dto';
import { SourceAccessibilityError } from '../../src/sources/errors/source-accessibility.error';
import {
  SourceInputError,
  SourceNotFoundError,
  SourceUrlConflictError,
} from '../../src/sources/errors/source-domain.error';
import { SourcesService } from '../../src/sources/services/sources.service';

const DOMAIN_SOURCE = {
  id: 'source-a',
  url: 'https://example.com/feed',
  active: true,
  createdAt: new Date('2026-09-04T12:00:00.000Z'),
  updatedAt: new Date('2026-09-04T13:00:00.000Z'),
};

describe('SourcesController', () => {
  const service = {
    create: jest.fn(),
    findById: jest.fn(),
    list: jest.fn(),
    replace: jest.fn(),
    update: jest.fn(),
    deactivate: jest.fn(),
  };
  let controller: SourcesController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new SourcesController(service as unknown as SourcesService);
  });

  it('mapea una fuente a su DTO con fechas ISO', async () => {
    service.create.mockResolvedValue(DOMAIN_SOURCE);

    await expect(controller.create({ url: DOMAIN_SOURCE.url })).resolves.toEqual({
      id: 'source-a',
      url: 'https://example.com/feed',
      active: true,
      createdAt: '2026-09-04T12:00:00.000Z',
      updatedAt: '2026-09-04T13:00:00.000Z',
    });
  });

  it.each([
    new SourceAccessibilityError('DNS', 'detalle DNS', new Error('10.0.0.1')),
    new SourceInputError('detalle de entrada'),
  ])('mapea entrada/accesibilidad inválida a 400 sin exponer su causa', async (error) => {
    service.create.mockRejectedValue(error);

    try {
      await controller.create({ url: 'https://example.com/feed' });
      throw new Error('Se esperaba BadRequestException');
    } catch (caught) {
      expect(caught).toBeInstanceOf(BadRequestException);
      expect(JSON.stringify((caught as BadRequestException).getResponse())).not.toMatch(
        /10\.0\.0\.1|detalle DNS|detalle de entrada/,
      );
    }
  });

  it('mapea fuente inexistente a 404', async () => {
    service.findById.mockRejectedValue(new SourceNotFoundError());
    await expect(controller.findById('missing')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('mapea URL duplicada a 409', async () => {
    service.create.mockRejectedValue(new SourceUrlConflictError());
    await expect(controller.create({ url: DOMAIN_SOURCE.url })).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('mapea un fallo inesperado a 500 estándar sin exponerlo', async () => {
    service.list.mockRejectedValue(new Error('prisma host 10.0.0.2'));

    try {
      await controller.list(new ListSourcesQueryDto());
      throw new Error('Se esperaba InternalServerErrorException');
    } catch (caught) {
      expect(caught).toBeInstanceOf(InternalServerErrorException);
      expect(JSON.stringify((caught as InternalServerErrorException).getResponse())).not.toMatch(
        /prisma|10\.0\.0\.2/,
      );
    }
  });

  it('traduce estrictamente el filtro true/false para el servicio', async () => {
    service.list.mockResolvedValue([]);
    const active = new ListSourcesQueryDto();
    active.active = 'true';
    const inactive = new ListSourcesQueryDto();
    inactive.active = 'false';

    await controller.list(active);
    await controller.list(inactive);
    await controller.list(new ListSourcesQueryDto());

    expect(service.list.mock.calls.map(([filter]) => filter)).toEqual([true, false, undefined]);
  });

  it('delega DELETE y no devuelve cuerpo', async () => {
    service.deactivate.mockResolvedValue(undefined);
    await expect(controller.deactivate('source-a')).resolves.toBeUndefined();
  });
});
