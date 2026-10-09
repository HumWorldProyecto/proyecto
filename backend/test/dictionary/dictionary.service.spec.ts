import { DictionaryTermNormalizer } from '../../src/dictionary/domain/dictionary-term-normalizer';
import {
  DictionaryEntryConflictError,
  DictionaryEntryNotFoundError,
  DictionaryInputError,
} from '../../src/dictionary/errors/dictionary-domain.error';
import { DictionaryRepositoryPort } from '../../src/dictionary/ports/dictionary-repository.port';
import { DictionaryService } from '../../src/dictionary/services/dictionary.service';
import { DictionaryEntry } from '../../src/dictionary/types/dictionary-entry';

const ID = '11111111-1111-4111-8111-111111111111';

function entry(overrides: Partial<DictionaryEntry> = {}): DictionaryEntry {
  return Object.freeze({ id: ID, term: 'bueno', language: 'es', weight: 3, ...overrides });
}

function repositoryMock(): jest.Mocked<DictionaryRepositoryPort> {
  return {
    create: jest.fn(),
    findAll: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };
}

describe('DictionaryService', () => {
  let repository: jest.Mocked<DictionaryRepositoryPort>;
  let service: DictionaryService;

  beforeEach(() => {
    repository = repositoryMock();
    service = new DictionaryService(repository, new DictionaryTermNormalizer());
  });

  it('crea usando la forma canónica y conserva peso cero', async () => {
    const created = entry({ term: 'muy bueno', weight: 0 });
    repository.create.mockResolvedValue(created);

    await expect(
      service.create({ term: '  MUY—BUENO! ', language: 'es', weight: 0 }),
    ).resolves.toEqual(created);
    expect(repository.create).toHaveBeenCalledWith({
      term: 'muy bueno',
      language: 'es',
      weight: 0,
    });
  });

  it('rechaza entrada inválida antes de persistir', async () => {
    await expect(
      service.create({ term: '!!!', language: 'es', weight: 2 }),
    ).rejects.toBeInstanceOf(DictionaryInputError);
    await expect(
      service.create({ term: 'valid', language: 'es', weight: 2.5 }),
    ).rejects.toBeInstanceOf(DictionaryInputError);
    expect(repository.create).not.toHaveBeenCalled();
  });

  it('lista y consulta entradas existentes', async () => {
    const entries = [entry()];
    repository.findAll.mockResolvedValue(entries);
    repository.findById.mockResolvedValue(entries[0]);

    await expect(service.list()).resolves.toEqual(entries);
    await expect(service.findById(ID)).resolves.toEqual(entries[0]);
  });

  it('rechaza consulta y borrado inexistentes', async () => {
    repository.findById.mockResolvedValue(null);

    await expect(service.findById(ID)).rejects.toBeInstanceOf(DictionaryEntryNotFoundError);
    await expect(service.delete(ID)).rejects.toBeInstanceOf(DictionaryEntryNotFoundError);
    expect(repository.delete).not.toHaveBeenCalled();
  });

  it('rechaza PATCH vacío antes de leer o escribir', async () => {
    await expect(service.update(ID, {})).rejects.toBeInstanceOf(DictionaryInputError);
    expect(repository.findById).not.toHaveBeenCalled();
    expect(repository.update).not.toHaveBeenCalled();
  });

  it('normaliza la entidad candidata completa y realiza una sola actualización', async () => {
    repository.findById.mockResolvedValue(entry());
    repository.update.mockResolvedValue(entry({ term: 'great news', language: 'en', weight: -5 }));

    await expect(
      service.update(ID, { term: ' GREAT...NEWS ', language: 'en', weight: -5 }),
    ).resolves.toMatchObject({ term: 'great news', language: 'en', weight: -5 });
    expect(repository.update).toHaveBeenCalledTimes(1);
    expect(repository.update).toHaveBeenCalledWith(ID, {
      term: 'great news',
      language: 'en',
      weight: -5,
    });
  });

  it('conserva la fila cuando la entidad candidata no es válida', async () => {
    repository.findById.mockResolvedValue(entry());

    await expect(service.update(ID, { term: '!!!', weight: 5 })).rejects.toBeInstanceOf(
      DictionaryInputError,
    );
    expect(repository.update).not.toHaveBeenCalled();
  });

  it('propaga conflicto de persistencia sin intentar una segunda escritura', async () => {
    repository.findById.mockResolvedValue(entry());
    repository.update.mockRejectedValue(new DictionaryEntryConflictError());

    await expect(service.update(ID, { term: 'ocupado' })).rejects.toBeInstanceOf(
      DictionaryEntryConflictError,
    );
    expect(repository.update).toHaveBeenCalledTimes(1);
  });

  it('elimina físicamente una entrada existente', async () => {
    repository.findById.mockResolvedValue(entry());
    repository.delete.mockResolvedValue(undefined);

    await expect(service.delete(ID)).resolves.toBeUndefined();
    expect(repository.delete).toHaveBeenCalledWith(ID);
  });
});
