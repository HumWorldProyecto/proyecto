import { SourceUrlNormalizer } from '../../src/sources/domain/source-url-normalizer';
import {
  SourceInputError,
  SourceNotFoundError,
  SourceUrlConflictError,
} from '../../src/sources/errors/source-domain.error';
import { SourceAccessibilityError } from '../../src/sources/errors/source-accessibility.error';
import { SourceAccessibilityChecker } from '../../src/sources/integrations/source-accessibility-checker';
import { SourceRepositoryPort } from '../../src/sources/ports/source-repository.port';
import { SourcesService } from '../../src/sources/services/sources.service';
import { RssSource } from '../../src/sources/types/rss-source';

const NOW = new Date('2026-09-04T12:00:00.000Z');

function source(overrides: Partial<RssSource> = {}): RssSource {
  return {
    id: 'source-a',
    url: 'https://example.com/feed',
    active: true,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

function repositoryMock(): jest.Mocked<SourceRepositoryPort> {
  return {
    create: jest.fn(),
    findById: jest.fn(),
    findByUrl: jest.fn(),
    list: jest.fn(),
    replace: jest.fn(),
    update: jest.fn(),
    setActive: jest.fn(),
  };
}

describe('SourcesService', () => {
  let repository: jest.Mocked<SourceRepositoryPort>;
  let accessibility: jest.Mocked<Pick<SourceAccessibilityChecker, 'assertAccessible'>>;
  let service: SourcesService;

  beforeEach(() => {
    repository = repositoryMock();
    accessibility = { assertAccessible: jest.fn().mockResolvedValue(undefined) };
    service = new SourcesService(
      repository,
      new SourceUrlNormalizer(),
      accessibility as unknown as SourceAccessibilityChecker,
    );
  });

  it('crea una fuente activa después de normalizar, comprobar accesibilidad y unicidad', async () => {
    repository.findByUrl.mockResolvedValue(null);
    repository.create.mockResolvedValue(source());

    await expect(service.create('  https://example.com/feed  ')).resolves.toEqual(source());

    expect(accessibility.assertAccessible).toHaveBeenCalledWith('https://example.com/feed');
    expect(repository.findByUrl).toHaveBeenCalledWith('https://example.com/feed');
    expect(repository.create).toHaveBeenCalledWith('https://example.com/feed');
  });

  it('rechaza una URL inválida sin comprobar accesibilidad ni persistir', async () => {
    await expect(service.create('not a url')).rejects.toBeInstanceOf(SourceAccessibilityError);
    expect(accessibility.assertAccessible).not.toHaveBeenCalled();
    expect(repository.create).not.toHaveBeenCalled();
  });

  it('rechaza una URL inaccesible sin consultar unicidad ni persistir', async () => {
    accessibility.assertAccessible.mockRejectedValue(
      new SourceAccessibilityError('NETWORK', 'No accesible'),
    );

    await expect(service.create('https://example.com/feed')).rejects.toBeInstanceOf(
      SourceAccessibilityError,
    );
    expect(repository.findByUrl).not.toHaveBeenCalled();
    expect(repository.create).not.toHaveBeenCalled();
  });

  it('rechaza una URL duplicada activa o inactiva', async () => {
    repository.findByUrl.mockResolvedValue(source({ active: false }));

    await expect(service.create('https://example.com/feed')).rejects.toBeInstanceOf(
      SourceUrlConflictError,
    );
    expect(repository.create).not.toHaveBeenCalled();
  });

  it('consulta por identificador y distingue una fuente inexistente', async () => {
    repository.findById.mockResolvedValueOnce(source()).mockResolvedValueOnce(null);

    await expect(service.findById('source-a')).resolves.toEqual(source());
    await expect(service.findById('missing')).rejects.toBeInstanceOf(SourceNotFoundError);
  });

  it.each([undefined, true, false])('lista con el filtro %p', async (active) => {
    repository.list.mockResolvedValue([source({ active: active ?? true })]);

    await service.list(active);

    expect(repository.list).toHaveBeenCalledWith(active);
  });

  it('reemplaza una URL cambiada solo después de validarla completamente', async () => {
    const updated = source({ url: 'https://new.example.com/feed' });
    repository.findById.mockResolvedValue(source());
    repository.findByUrl.mockResolvedValue(null);
    repository.replace.mockResolvedValue(updated);

    await expect(service.replace('source-a', ' https://new.example.com/feed ')).resolves.toEqual(
      updated,
    );
    expect(accessibility.assertAccessible).toHaveBeenCalledWith('https://new.example.com/feed');
    expect(repository.replace).toHaveBeenCalledWith('source-a', 'https://new.example.com/feed');
  });

  it('no repite accesibilidad ni escritura cuando PUT conserva la URL normalizada', async () => {
    repository.findById.mockResolvedValue(source());

    await expect(service.replace('source-a', ' https://example.com/feed ')).resolves.toEqual(
      source(),
    );
    expect(accessibility.assertAccessible).not.toHaveBeenCalled();
    expect(repository.replace).not.toHaveBeenCalled();
  });

  it('un PUT rechazado conserva la fuente sin escribir', async () => {
    repository.findById.mockResolvedValue(source());
    accessibility.assertAccessible.mockRejectedValue(
      new SourceAccessibilityError('TIMEOUT', 'Timeout'),
    );

    await expect(service.replace('source-a', 'https://timeout.example/feed')).rejects.toBeInstanceOf(
      SourceAccessibilityError,
    );
    expect(repository.replace).not.toHaveBeenCalled();
    expect(repository.update).not.toHaveBeenCalled();
  });

  it.each([
    ['sintaxis', 'not a url'],
    ['esquema', 'ftp://example.com/feed'],
    ['credenciales', 'https://user:secret@example.com/feed'],
  ])('PUT y PATCH rechazan errores de %s antes de escribir', async (_case, rawUrl) => {
    repository.findById.mockResolvedValue(source());

    await expect(service.replace('source-a', rawUrl)).rejects.toBeInstanceOf(
      SourceAccessibilityError,
    );
    await expect(service.update('source-a', { url: rawUrl })).rejects.toBeInstanceOf(
      SourceAccessibilityError,
    );
    expect(accessibility.assertAccessible).not.toHaveBeenCalled();
    expect(repository.replace).not.toHaveBeenCalled();
    expect(repository.update).not.toHaveBeenCalled();
  });

  it.each(['NETWORK', 'TIMEOUT'] as const)(
    'PUT y PATCH conservan la fuente ante un fallo de accesibilidad %s',
    async (code) => {
      repository.findById.mockResolvedValue(source());
      accessibility.assertAccessible.mockRejectedValue(
        new SourceAccessibilityError(code, 'Fallo controlado'),
      );

      await expect(
        service.replace('source-a', 'https://changed.example/feed'),
      ).rejects.toMatchObject({ code });
      await expect(
        service.update('source-a', { url: 'https://changed.example/feed', active: false }),
      ).rejects.toMatchObject({ code });
      expect(repository.replace).not.toHaveBeenCalled();
      expect(repository.update).not.toHaveBeenCalled();
      expect(repository.setActive).not.toHaveBeenCalled();
    },
  );

  it('rechaza PATCH vacío antes de consultar o mutar persistencia', async () => {
    await expect(service.update('source-a', {})).rejects.toBeInstanceOf(SourceInputError);
    expect(repository.findById).not.toHaveBeenCalled();
    expect(repository.update).not.toHaveBeenCalled();
  });

  it('actualiza URL y estado mediante una única escritura después de validar la URL', async () => {
    const updated = source({ url: 'https://new.example/feed', active: false });
    repository.findById.mockResolvedValue(source());
    repository.findByUrl.mockResolvedValue(null);
    repository.update.mockResolvedValue(updated);

    await expect(
      service.update('source-a', { url: 'https://new.example/feed', active: false }),
    ).resolves.toEqual(updated);
    expect(repository.update).toHaveBeenCalledTimes(1);
    expect(repository.update).toHaveBeenCalledWith('source-a', {
      url: 'https://new.example/feed',
      active: false,
    });
  });

  it('conserva URL y estado cuando falla la URL de un PATCH combinado', async () => {
    repository.findById.mockResolvedValue(source());
    accessibility.assertAccessible.mockRejectedValue(
      new SourceAccessibilityError('FORBIDDEN_DESTINATION', 'Destino bloqueado'),
    );

    await expect(
      service.update('source-a', { url: 'http://10.0.0.1/feed', active: false }),
    ).rejects.toBeInstanceOf(SourceAccessibilityError);
    expect(repository.update).not.toHaveBeenCalled();
    expect(repository.setActive).not.toHaveBeenCalled();
  });

  it.each([true, false])('cambia solo active=%p sin comprobar accesibilidad', async (active) => {
    const current = source({ active: !active });
    const updated = source({ active });
    repository.findById.mockResolvedValue(current);
    repository.update.mockResolvedValue(updated);

    await expect(service.update('source-a', { active })).resolves.toEqual(updated);
    expect(accessibility.assertAccessible).not.toHaveBeenCalled();
    expect(repository.update).toHaveBeenCalledWith('source-a', { active });
  });

  it('no escribe cuando PATCH conserva URL y estado', async () => {
    repository.findById.mockResolvedValue(source());

    await expect(
      service.update('source-a', { url: 'https://example.com/feed', active: true }),
    ).resolves.toEqual(source());
    expect(accessibility.assertAccessible).not.toHaveBeenCalled();
    expect(repository.update).not.toHaveBeenCalled();
  });

  it('DELETE desactiva una fuente activa sin borrado físico', async () => {
    repository.findById.mockResolvedValue(source({ active: true }));
    repository.setActive.mockResolvedValue(source({ active: false }));

    await expect(service.deactivate('source-a')).resolves.toBeUndefined();
    expect(repository.setActive).toHaveBeenCalledWith('source-a', false);
  });

  it('DELETE sobre una fuente inactiva es idempotente y no escribe', async () => {
    repository.findById.mockResolvedValue(source({ active: false }));

    await expect(service.deactivate('source-a')).resolves.toBeUndefined();
    expect(repository.setActive).not.toHaveBeenCalled();
  });

  it('DELETE sobre una fuente inexistente produce error de dominio', async () => {
    repository.findById.mockResolvedValue(null);

    await expect(service.deactivate('missing')).rejects.toBeInstanceOf(SourceNotFoundError);
    expect(repository.setActive).not.toHaveBeenCalled();
  });
});
