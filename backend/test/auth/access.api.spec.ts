import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/prisma/prisma.service';
import { SourceAccessibilityChecker } from '../../src/sources/integrations/source-accessibility-checker';
import { SourcesService } from '../../src/sources/services/sources.service';
import { AnalyticsService } from '../../src/analytics/services/analytics.service';
import { ManualSourceCaptureService } from '../../src/capture/services/manual-source-capture.service';
import { MultipleSourceCaptureService } from '../../src/capture/services/multiple-source-capture.service';
import { createOpenApiDocument } from '../../src/openapi';

const id = '5dc7e1c2-2a78-42e7-b423-0a649c3fe516';
const base = '/api/v1';
const routes = [
  { method: 'get', path: '/sources', permission: 'read', status: 200 },
  { method: 'get', path: `/sources/${id}`, permission: 'read', status: 200 },
  { method: 'get', path: '/dashboards/geography', permission: 'read', status: 200 },
  { method: 'post', path: '/sources', permission: 'write', status: 201, body: { url: 'https://new.p12.example/feed' } },
  { method: 'put', path: `/sources/${id}`, permission: 'write', status: 200, body: { url: 'https://replaced.p12.example/feed' } },
  { method: 'patch', path: `/sources/${id}`, permission: 'write', status: 200, body: { active: false } },
  { method: 'delete', path: `/sources/${id}`, permission: 'write', status: 204 },
  { method: 'post', path: `/sources/${id}/capture`, permission: 'write', status: 200 },
  { method: 'post', path: '/sources/capture', permission: 'write', status: 200, body: { sourceIds: [id, 'another-source'] } },
  { method: 'put', path: `/dashboards/sources/${id}/geography`, permission: 'write', status: 200, body: { countryCode: 'CL' } },
] as const;

jest.setTimeout(30_000);
describe('P12 acceso HTTP / PostgreSQL real', () => {
  let app: INestApplication; let prisma: PrismaService;
  let services: jest.SpyInstance[];
  const manual = { capture: jest.fn().mockResolvedValue({ sourceId: id, status: 'completed', itemsParsed: 0 }) };
  const multiple = { capture: jest.fn().mockResolvedValue({ results: [] }) };
  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(SourceAccessibilityChecker).useValue({ assertAccessible: async (url: string) => url })
      .overrideProvider(ManualSourceCaptureService).useValue(manual)
      .overrideProvider(MultipleSourceCaptureService).useValue(multiple).compile();
    app = moduleRef.createNestApplication(); app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init(); prisma = moduleRef.get(PrismaService);
  });
  async function clean() { await prisma.news.deleteMany(); await prisma.rssSource.deleteMany(); }
  beforeEach(async () => {
    jest.clearAllMocks(); await clean();
    await prisma.rssSource.create({ data: { id, url: 'https://existing.p12.example/feed' } });
    const sourceService = app.get(SourcesService); const analytics = app.get(AnalyticsService);
    services = [jest.spyOn(sourceService, 'create'), jest.spyOn(sourceService, 'list'),
      jest.spyOn(sourceService, 'findById'), jest.spyOn(sourceService, 'update'),
      jest.spyOn(sourceService, 'replace'), jest.spyOn(sourceService, 'deactivate'),
      jest.spyOn(analytics, 'geography'), jest.spyOn(analytics, 'assignCountry')];
  });
  afterEach(async () => { jest.restoreAllMocks(); await clean(); });
  afterAll(async () => { await app?.close(); });

  function invoke(route: typeof routes[number], key?: string) {
    let operation = request(app.getHttpServer())[route.method](`${base}${route.path}`);
    if (key !== undefined) operation = operation.set('X-API-Key', key);
    return 'body' in route ? operation.send(route.body) : operation;
  }
  async function deniedHasNoEffects() {
    for (const service of services) expect(service).not.toHaveBeenCalled();
    expect(manual.capture).not.toHaveBeenCalled(); expect(multiple.capture).not.toHaveBeenCalled();
    expect(await prisma.rssSource.count()).toBe(1);
    expect(await prisma.news.count()).toBe(0);
    expect(await prisma.rssSource.findUnique({ where: { id } })).toMatchObject({ active: true, countryCode: null });
  }

  it.each(routes)('401 sin clave: $method $path', async (route) => {
    const response = await invoke(route);
    expect(response.status).toBe(401); await deniedHasNoEffects();
  });
  it.each(routes)('401 clave incorrecta: $method $path', async (route) => {
    const response = await invoke(route, 'valor-invalido-no-configurado');
    expect(response.status).toBe(401); await deniedHasNoEffects();
  });
  it.each(routes.filter((route) => route.permission === 'write'))('403 consulta en escritura: $method $path', async (route) => {
    expect((await invoke(route, process.env.HUMWORLD_API_KEY_READ)).status).toBe(403);
    await deniedHasNoEffects();
  });
  it.each(routes)('gestión conserva contrato: $method $path', async (route) => {
    const response = await invoke(route, process.env.HUMWORLD_API_KEY_WRITE);
    expect(response.status).toBe(route.status);
    expect(response.text.includes(process.env.HUMWORLD_API_KEY_WRITE!)).toBe(false);
    expect(response.text.includes(process.env.HUMWORLD_API_KEY_READ!)).toBe(false);
    if (route.method === 'post' && route.path === '/sources') expect(await prisma.rssSource.count()).toBe(2);
  });
  it.each(routes.filter((route) => route.permission === 'read'))('consulta conserva contrato: $method $path', async (route) => {
    expect((await invoke(route, process.env.HUMWORLD_API_KEY_READ)).status).toBe(200);
  });
  it('401/403 preceden DTO y búsqueda; autorizado conserva 400/404/409', async () => {
    const http = app.getHttpServer();
    expect((await request(http).post('/api/v1/sources').send({})).status).toBe(401);
    expect((await request(http).post('/api/v1/sources').set('X-API-Key', process.env.HUMWORLD_API_KEY_READ!).send({})).status).toBe(403);
    expect((await request(http).get('/api/v1/sources/missing')).status).toBe(401);
    await deniedHasNoEffects();
    expect((await request(http).post('/api/v1/sources').set('X-API-Key', process.env.HUMWORLD_API_KEY_WRITE!).send({})).status).toBe(400);
    expect((await request(http).get('/api/v1/sources/missing').set('X-API-Key', process.env.HUMWORLD_API_KEY_READ!)).status).toBe(404);
    expect((await request(http).post('/api/v1/sources').set('X-API-Key', process.env.HUMWORLD_API_KEY_WRITE!).send({ url: 'https://existing.p12.example/feed' })).status).toBe(409);
  });
  it('OpenAPI declara diez operaciones protegidas, 401, siete 403 y esquema sin claves', () => {
    const document = createOpenApiDocument(app);
    expect(document.components?.securitySchemes?.apiKey).toEqual({ type: 'apiKey', in: 'header', name: 'X-API-Key' });
    for (const route of routes) {
      const path = `${base}${route.path.replace(id, '{id}')}`;
      const operation = document.paths[path]?.[route.method];
      expect(operation?.security).toEqual([{ apiKey: [] }]);
      expect(operation?.responses['401']).toBeDefined();
      if (route.permission === 'write') expect(operation?.responses['403']).toBeDefined();
      expect(operation?.responses[String(route.status)]).toBeDefined();
    }
    expect(document.paths['/api/v1/dashboards/humor']?.get?.security).toBeUndefined();
    const serialized = JSON.stringify(document);
    expect(serialized.includes(process.env.HUMWORLD_API_KEY_READ!)).toBe(false);
    expect(serialized.includes(process.env.HUMWORLD_API_KEY_WRITE!)).toBe(false);
  });
});
