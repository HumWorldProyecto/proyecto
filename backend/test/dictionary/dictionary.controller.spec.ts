import {
  BadRequestException,
  ConflictException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { DictionaryController } from '../../src/dictionary/controllers/dictionary.controller';
import {
  DictionaryEntryConflictError,
  DictionaryEntryNotFoundError,
  DictionaryInputError,
} from '../../src/dictionary/errors/dictionary-domain.error';
import { DictionaryService } from '../../src/dictionary/services/dictionary.service';

const ENTRY = Object.freeze({
  id: '11111111-1111-4111-8111-111111111111',
  term: 'bueno',
  language: 'es' as const,
  weight: 4,
});

describe('DictionaryController', () => {
  const service = {
    create: jest.fn(),
    list: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };
  let controller: DictionaryController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new DictionaryController(service as unknown as DictionaryService);
  });

  it('devuelve el DTO exacto al crear, listar, consultar y actualizar', async () => {
    service.create.mockResolvedValue(ENTRY);
    service.list.mockResolvedValue([ENTRY]);
    service.findById.mockResolvedValue(ENTRY);
    service.update.mockResolvedValue({ ...ENTRY, weight: 0 });

    await expect(controller.create({ term: 'bueno', language: 'es', weight: 4 })).resolves.toEqual(
      ENTRY,
    );
    await expect(controller.list()).resolves.toEqual([ENTRY]);
    await expect(controller.findById(ENTRY.id)).resolves.toEqual(ENTRY);
    await expect(controller.update(ENTRY.id, { weight: 0 })).resolves.toEqual({
      ...ENTRY,
      weight: 0,
    });
  });

  it.each([
    [new DictionaryInputError('detalle sensible'), BadRequestException],
    [new DictionaryEntryNotFoundError(), NotFoundException],
    [new DictionaryEntryConflictError(), ConflictException],
  ])('mapea errores de dominio a HTTP sin detalles internos', async (error, expected) => {
    service.create.mockRejectedValue(error);

    try {
      await controller.create({ term: 'bueno', language: 'es', weight: 4 });
      throw new Error('Se esperaba una excepción HTTP');
    } catch (caught) {
      expect(caught).toBeInstanceOf(expected);
      expect(JSON.stringify((caught as BadRequestException).getResponse())).not.toContain(
        'detalle sensible',
      );
    }
  });

  it('mapea un fallo inesperado a 500 sin exponer PostgreSQL', async () => {
    service.list.mockRejectedValue(new Error('postgresql://secret@10.0.0.4/database'));

    try {
      await controller.list();
      throw new Error('Se esperaba InternalServerErrorException');
    } catch (caught) {
      expect(caught).toBeInstanceOf(InternalServerErrorException);
      expect(JSON.stringify((caught as InternalServerErrorException).getResponse())).not.toMatch(
        /secret|10\.0\.0\.4|postgresql/,
      );
    }
  });

  it('delega DELETE y no devuelve cuerpo', async () => {
    service.delete.mockResolvedValue(undefined);
    await expect(controller.delete(ENTRY.id)).resolves.toBeUndefined();
    expect(service.delete).toHaveBeenCalledWith(ENTRY.id);
  });
});
