import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/prisma/prisma.service';
import { LIFECYCLE_CLOCK } from '../../src/purge/lifecycle.port';
import { AutomaticPurgeJob } from '../../src/purge/automatic-purge.job';
import { createOpenApiDocument } from '../../src/openapi';
const now = new Date('2026-10-31T12:00:00.000Z');
const missing = '4051da55-9948-4d32-919b-766c40a6b73b';
const routes = [
  ['get', '/config/retention', false], ['put', '/config/retention', true],
  ['get', '/news/purge-preview', false], ['post', '/news/purge', true],
  ['get', '/channels', false], ['get', `/channels/${missing}`, false],
  ['post', '/channels', true], ['put', `/channels/${missing}`, true], ['delete', `/channels/${missing}`, true],
  ['put', `/channels/${missing}/sources/${missing}`, true], ['delete', `/channels/${missing}/sources/${missing}`, true],
] as const;
jest.setTimeout(30_000);
describe('Cierre Sprint 5: API / PostgreSQL 16', () => {
  let app: INestApplication; let prisma: PrismaService;
  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(LIFECYCLE_CLOCK).useValue({ now: () => new Date(now) }).compile();
    app = moduleRef.createNestApplication(); app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true })); await app.init();
    prisma = moduleRef.get(PrismaService);
  });
  async function clean() {
    await prisma.news.deleteMany(); await prisma.rssSource.deleteMany();
    await prisma.channel.deleteMany(); await prisma.newsRetentionPolicy.deleteMany();
  }
  beforeEach(clean);
  afterEach(() => jest.restoreAllMocks());
  afterAll(async () => { await clean(); await app.close(); });
  function api(method: 'get'|'post'|'put'|'delete', path: string, profile: 'read'|'write' = 'write') {
    return request(app.getHttpServer())[method](`/api/v1${path}`).set('X-API-Key',
      process.env[profile === 'read' ? 'HUMWORLD_API_KEY_READ' : 'HUMWORLD_API_KEY_WRITE']!);
  }
  async function fixture() {
    const channel = await prisma.channel.create({ data: { name: 'Medio existente' } });
    const source = await prisma.rssSource.create({ data: { url: 'https://lifecycle.example/feed', channelId: channel.id } });
    const cutoff = new Date(now.getTime() - 7 * 86400000);
    const news = [];
    for (const [name, offset] of [['old', -1], ['edge', 0], ['fresh', 1]] as const) {
      news.push(await prisma.news.create({ data: {
        sourceId: source.id, dedupeKey: name, guid: name, capturedAt: new Date(cutoff.getTime()+offset),
        pubDate: new Date(name === 'old' ? '2030-01-01' : '2000-01-01'),
        mediaTopicQcodes: ['medtop:13000000'], sentimentScore: '0.8', sentimentMatchedTerms: 1,
        sentimentLanguage: 'es', sentimentAnalyzedAt: now, sentimentTerms: [{ term:'bueno', weight:4, occurrences:1 }],
      } }));
    }
    return { channel, source, news, cutoff };
  }
  it.each(routes)('401 en %s %s antes de validaciones y efectos', async (method, path) => {
    expect((await request(app.getHttpServer())[method](`/api/v1${path}`).send({})).status).toBe(401);
    expect(await prisma.channel.count()).toBe(0); expect(await prisma.newsRetentionPolicy.count()).toBe(0);
  });
  it.each(routes.filter((route) => route[2]))('403 consulta en %s %s sin cambios', async (method, path) => {
    expect((await api(method, path, 'read').send({})).status).toBe(403);
    expect(await prisma.channel.count()).toBe(0); expect(await prisma.newsRetentionPolicy.count()).toBe(0);
  });
  it('sin configurar no purga; valida periodo, persiste/idempotencia y desactiva', async () => {
    await fixture();
    expect((await api('get','/config/retention','read')).body).toEqual({retentionDays:null});
    expect((await api('get','/news/purge-preview','read')).body).toMatchObject({expiredCount:0,totalCount:3,cutoff:null});
    expect((await api('post','/news/purge').send({expectedRetentionDays:7})).status).toBe(409);
    await app.get(AutomaticPurgeJob).run(); expect(await prisma.news.count()).toBe(3);
    for(const value of [0,-1,1.5,'7',36501]) expect((await api('put','/config/retention').send({retentionDays:value})).status).toBe(400);
    expect((await api('put','/config/retention').send({retentionDays:7})).status).toBe(200);
    const before = await prisma.newsRetentionPolicy.findUnique({where:{id:'global'}});
    await api('put','/config/retention').send({retentionDays:7});
    expect(await prisma.newsRetentionPolicy.findUnique({where:{id:'global'}})).toEqual(before);
    await api('put','/config/retention').send({retentionDays:null});
    expect((await api('get','/config/retention')).body.retentionDays).toBeNull();
    expect(await prisma.news.count()).toBe(3);
  });
  it('preview y manual eliminan solo anterior estricto; preservan límite, metadatos y fuentes', async () => {
    const f = await fixture();
    await api('put','/config/retention').send({retentionDays:7});
    const preview = await api('get','/news/purge-preview','read');
    expect(preview.body).toMatchObject({retentionDays:7,expiredCount:1,totalCount:3,cutoff:f.cutoff.toISOString()});
    expect((await api('post','/news/purge').send({expectedRetentionDays:5})).status).toBe(409);
    expect(await prisma.news.count()).toBe(3);
    expect((await api('post','/news/purge').send({expectedRetentionDays:7})).body.deletedCount).toBe(1);
    expect(await prisma.news.findUnique({where:{id:f.news[0].id}})).toBeNull();
    expect(await prisma.news.findUnique({where:{id:f.news[1].id}})).toEqual(f.news[1]);
    expect(await prisma.news.findUnique({where:{id:f.news[2].id}})).toEqual(f.news[2]);
    expect(await prisma.rssSource.findUnique({where:{id:f.source.id}})).toEqual(f.source);
    expect(await prisma.channel.findUnique({where:{id:f.channel.id}})).toEqual(f.channel);
    expect((await api('post','/news/purge').send({expectedRetentionDays:7})).body.deletedCount).toBe(0);
  });
  it('el job automático ejecuta el mismo borrado y deja vigentes', async () => {
    await fixture(); await api('put','/config/retention').send({retentionDays:7});
    await app.get(AutomaticPurgeJob).run(); expect(await prisma.news.count()).toBe(2);
    await app.get(AutomaticPurgeJob).run(); expect(await prisma.news.count()).toBe(2);
  });
  it('CRUD medios y relación: varias fuentes, traslado, desvinculación y SetNull preservan noticias', async () => {
    const f = await fixture();
    const created = await api('post','/channels').send({name:'  Otro medio  '});
    expect(created.status).toBe(201); expect(created.body.name).toBe('Otro medio');
    const id=created.body.id;
    const other = await prisma.rssSource.create({data:{url:'https://other.example/rss'}});
    expect((await api('put',`/channels/${id}/sources/${f.source.id}`)).status).toBe(200);
    const both = await api('put',`/channels/${id}/sources/${other.id}`);
    expect(both.body.sources).toHaveLength(2);
    expect((await api('put',`/channels/${id}`).send({name:'Renombrado'})).body.name).toBe('Renombrado');
    expect((await api('get',`/channels/${id}`,'read')).body.sources).toHaveLength(2);
    expect((await api('get','/channels','read')).body).toHaveLength(2);
    expect((await api('delete',`/channels/${id}/sources/${other.id}`)).status).toBe(200);
    expect((await api('delete',`/channels/${id}`)).status).toBe(204);
    expect((await prisma.rssSource.findUnique({where:{id:f.source.id}}))?.channelId).toBeNull();
    expect(await prisma.news.findUnique({where:{id:f.news[1].id}})).toEqual(f.news[1]);
    expect(await prisma.rssSource.count()).toBe(2); expect(await prisma.news.count()).toBe(3);
  });
  it('errores 400/404/500 sanitizados en medios y lifecycle', async () => {
    expect((await api('post','/channels').send({name:'   '})).status).toBe(400);
    expect((await api('get',`/channels/${missing}`)).status).toBe(404);
    expect((await api('put',`/channels/${missing}`).send({name:'No existe'})).status).toBe(404);
    expect((await api('delete',`/channels/${missing}`)).status).toBe(404);
    expect((await api('put',`/channels/${missing}/sources/${randomUUID()}`)).status).toBe(404);
    expect((await api('delete',`/channels/${missing}/sources/${randomUUID()}`)).status).toBe(404);
    jest.spyOn(prisma.channel,'create').mockRejectedValueOnce(new Error('detalle interno sintético'));
    const failed=await api('post','/channels').send({name:'Fallo'});
    expect(failed.status).toBe(500); expect(failed.text).not.toContain('detalle interno');
    jest.spyOn(prisma.newsRetentionPolicy,'findUnique').mockRejectedValueOnce(new Error('detalle interno sintético'));
    expect((await api('get','/config/retention')).status).toBe(500);
    jest.spyOn(prisma.newsRetentionPolicy,'upsert').mockRejectedValueOnce(new Error('detalle interno sintético'));
    expect((await api('put','/config/retention').send({retentionDays:4})).status).toBe(500);
  });
  it('OpenAPI declara la seguridad y las rutas nuevas sin quitar las de P12/Sprint4', () => {
    const document=createOpenApiDocument(app);
    for(const [method,path,write] of routes){
      const operation=document.paths[`/api/v1${path.replaceAll(missing,'{id}').replace('/sources/{id}','/sources/{sourceId}')}`]?.[method];
      expect(operation?.security).toEqual([{apiKey:[]}]); expect(operation?.responses['401']).toBeDefined();
      if(write)expect(operation?.responses['403']).toBeDefined();
    }
    expect(document.paths['/api/v1/dashboards/humor']).toBeDefined();
    expect(document.paths['/api/v1/sources']).toBeDefined();
  });
});
