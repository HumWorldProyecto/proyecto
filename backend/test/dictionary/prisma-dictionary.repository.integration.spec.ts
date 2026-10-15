import { randomUUID } from 'node:crypto';
import { PrismaService } from '../../src/prisma/prisma.service';
import {
  DictionaryEntryConflictError,
  DictionaryEntryNotFoundError,
} from '../../src/dictionary/errors/dictionary-domain.error';
import { PrismaDictionaryRepository } from '../../src/dictionary/repositories/prisma-dictionary.repository';
import { DictionaryEntry } from '../../src/dictionary/types/dictionary-entry';

describe('PrismaDictionaryRepository (integración, PostgreSQL real)', () => {
  const prisma = new PrismaService();
  const repository = new PrismaDictionaryRepository(prisma);

  beforeAll(async () => {
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.dictionaryEntry.deleteMany();
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await prisma.dictionaryEntry.deleteMany();
  });

  it('crea, consulta, lista en orden estable, actualiza y elimina físicamente', async () => {
    const zeta = await repository.create({ term: 'zeta', language: 'es', weight: -5 });
    const alphaEn = await repository.create({ term: 'alpha', language: 'en', weight: 0 });
    const alphaEs = await repository.create({ term: 'alpha', language: 'es', weight: 5 });

    await expect(repository.findById(zeta.id)).resolves.toEqual(zeta);
    await expect(repository.findAll()).resolves.toEqual([alphaEs, zeta, alphaEn]);

    await expect(repository.update(zeta.id, { term: 'beta', weight: 1 })).resolves.toMatchObject({
      id: zeta.id,
      term: 'beta',
      language: 'es',
      weight: 1,
    });
    await repository.delete(alphaEn.id);
    await expect(repository.findById(alphaEn.id)).resolves.toBeNull();
  });

  it('traduce la unicidad real y una carrera concurrente a conflicto', async () => {
    await repository.create({ term: 'único', language: 'es', weight: 1 });
    await expect(
      repository.create({ term: 'único', language: 'es', weight: 2 }),
    ).rejects.toBeInstanceOf(DictionaryEntryConflictError);
    await expect(
      repository.create({ term: 'único', language: 'en', weight: 2 }),
    ).resolves.toMatchObject({ language: 'en' });

    const race = await Promise.allSettled([
      repository.create({ term: 'carrera', language: 'es', weight: 1 }),
      repository.create({ term: 'carrera', language: 'es', weight: 2 }),
    ]);
    expect(race.filter(({ status }) => status === 'fulfilled')).toHaveLength(1);
    const rejected = race.find(({ status }) => status === 'rejected') as PromiseRejectedResult;
    expect(rejected.reason).toBeInstanceOf(DictionaryEntryConflictError);
  });

  it('conserva la fila anterior ante conflicto o fallo de CHECK en una actualización', async () => {
    const first = await repository.create({ term: 'primero', language: 'es', weight: 2 });
    const occupied = await repository.create({ term: 'ocupado', language: 'es', weight: -2 });

    await expect(repository.update(first.id, { term: occupied.term })).rejects.toBeInstanceOf(
      DictionaryEntryConflictError,
    );
    await expect(repository.update(first.id, { weight: 6 })).rejects.toBeDefined();
    await expect(repository.findById(first.id)).resolves.toEqual(first);
  });

  it('traduce P2025 real en update y delete', async () => {
    const missing = randomUUID();
    await expect(repository.update(missing, { weight: 0 })).rejects.toBeInstanceOf(
      DictionaryEntryNotFoundError,
    );
    await expect(repository.delete(missing)).rejects.toBeInstanceOf(
      DictionaryEntryNotFoundError,
    );
  });

  it('aplica restricciones SQL de idioma, peso y longitud', async () => {
    const insert = (id: string, term: string, language: string, weight: number) =>
      prisma.$executeRawUnsafe(
        'INSERT INTO "dictionary_entries" ("id", "term", "language", "weight") VALUES ($1, $2, $3::"DictionaryLanguage", $4)',
        id,
        term,
        language,
        weight,
      );

    await expect(insert(randomUUID(), 'invalid-language', 'fr', 1)).rejects.toBeDefined();
    await expect(insert(randomUUID(), 'invalid-weight', 'es', 6)).rejects.toBeDefined();
    await expect(insert(randomUUID(), '', 'es', 1)).rejects.toBeDefined();
    await expect(insert(randomUUID(), 'á'.repeat(201), 'es', 1)).rejects.toBeDefined();
    await expect(prisma.dictionaryEntry.count()).resolves.toBe(0);
  });

  it('devuelve snapshot inmutable por idioma y las mutaciones solo aparecen en lecturas nuevas', async () => {
    const first = await repository.create({ term: 'alpha', language: 'es', weight: 1 });
    await repository.create({ term: 'english', language: 'en', weight: 2 });
    const snapshot = await repository.listByLanguage('es');

    expect(snapshot).toEqual([first]);
    expect(Object.isFrozen(snapshot)).toBe(true);
    expect(Object.isFrozen(snapshot[0])).toBe(true);
    expect(() => (snapshot as DictionaryEntry[]).push(first)).toThrow();
    expect(() => ((snapshot[0] as { weight: number }).weight = 5)).toThrow();

    await repository.update(first.id, { weight: 5 });
    await repository.create({ term: 'beta', language: 'es', weight: 0 });

    expect(snapshot).toEqual([first]);
    await expect(repository.listByLanguage('es')).resolves.toEqual([
      expect.objectContaining({ term: 'alpha', weight: 5 }),
      expect.objectContaining({ term: 'beta', weight: 0 }),
    ]);
  });
});
