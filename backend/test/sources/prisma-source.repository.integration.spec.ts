import { PrismaService } from '../../src/prisma/prisma.service';
import {
  SourceNotFoundError,
  SourceUrlConflictError,
} from '../../src/sources/errors/source-domain.error';
import { PrismaSourceRepository } from '../../src/sources/repositories/prisma-source.repository';

describe('PrismaSourceRepository (integración, PostgreSQL real)', () => {
  const prisma = new PrismaService();
  const repository = new PrismaSourceRepository(prisma);

  beforeAll(async () => {
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.news.deleteMany();
    await prisma.rssSource.deleteMany();
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await prisma.news.deleteMany();
    await prisma.rssSource.deleteMany();
  });

  it('crea, consulta y lista una fuente activa con el modelo existente', async () => {
    const created = await repository.create('https://example.com/feed');

    expect(created).toMatchObject({ url: 'https://example.com/feed', active: true });
    expect(created.id).toEqual(expect.any(String));
    await expect(repository.findById(created.id)).resolves.toEqual(created);
    await expect(repository.findByUrl(created.url)).resolves.toEqual(created);
    await expect(repository.list()).resolves.toEqual([created]);
  });

  it('filtra separadamente fuentes activas e inactivas', async () => {
    const active = await repository.create('https://active.example/feed');
    const inactive = await repository.create('https://inactive.example/feed');
    await repository.setActive(inactive.id, false);

    await expect(repository.list(true)).resolves.toEqual([active]);
    await expect(repository.list(false)).resolves.toEqual([
      expect.objectContaining({ id: inactive.id, active: false }),
    ]);
  });

  it('traduce una colisión P2002 real aunque la fuente existente esté inactiva', async () => {
    const existing = await repository.create('https://duplicate.example/feed');
    await repository.setActive(existing.id, false);

    await expect(repository.create('https://duplicate.example/feed')).rejects.toBeInstanceOf(
      SourceUrlConflictError,
    );
    await expect(prisma.rssSource.count()).resolves.toBe(1);
  });

  it('traduce también P2002 al reemplazar o actualizar hacia una URL ocupada', async () => {
    const first = await repository.create('https://first.example/feed');
    const second = await repository.create('https://second.example/feed');

    await expect(repository.replace(second.id, first.url)).rejects.toBeInstanceOf(
      SourceUrlConflictError,
    );
    await expect(repository.update(second.id, { url: first.url, active: false })).rejects.toBeInstanceOf(
      SourceUrlConflictError,
    );
    await expect(repository.findById(second.id)).resolves.toMatchObject({
      url: 'https://second.example/feed',
      active: true,
    });
  });

  it('reemplaza URL y actualiza URL/estado en operaciones atómicas', async () => {
    const created = await repository.create('https://before.example/feed');

    await expect(repository.replace(created.id, 'https://replacement.example/feed')).resolves.toMatchObject({
      url: 'https://replacement.example/feed',
      active: true,
    });
    await expect(
      repository.update(created.id, { url: 'https://after.example/feed', active: false }),
    ).resolves.toMatchObject({ url: 'https://after.example/feed', active: false });
  });

  it('traduce una actualización de identificador inexistente', async () => {
    await expect(repository.setActive('missing', false)).rejects.toBeInstanceOf(
      SourceNotFoundError,
    );
  });

  it('cambia estado sin borrar físicamente ni modificar noticias asociadas', async () => {
    const created = await repository.create('https://with-news.example/feed');
    const news = await prisma.news.create({
      data: {
        sourceId: created.id,
        guid: 'guid-source-state',
        dedupeKey: 'guid:guid-source-state',
        title: 'Noticia preservada',
      },
    });

    await repository.setActive(created.id, false);
    await repository.setActive(created.id, true);

    await expect(prisma.rssSource.count({ where: { id: created.id } })).resolves.toBe(1);
    await expect(prisma.news.findUnique({ where: { id: news.id } })).resolves.toEqual(news);
  });
});
