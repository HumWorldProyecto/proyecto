// HTTP real, configuración/guard/controllers reales; servicios de negocio dobles, sin DB/red RSS.
require('reflect-metadata');
const { Module, ValidationPipe } = require('@nestjs/common');
const { NestFactory } = require('@nestjs/core');
const { randomBytes } = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { AuthModule } = require('../dist/auth/auth.module');
const { SourcesController } = require('../dist/sources/controllers/sources.controller');
const { SourcesService } = require('../dist/sources/services/sources.service');
const { SourceNotFoundError } = require('../dist/sources/errors/source-domain.error');
const { ManualSourceCaptureController } = require('../dist/capture/controllers/manual-source-capture.controller');
const { ManualSourceCaptureService } = require('../dist/capture/services/manual-source-capture.service');
const { MultipleSourceCaptureController } = require('../dist/capture/controllers/multiple-source-capture.controller');
const { MultipleSourceCaptureService } = require('../dist/capture/services/multiple-source-capture.service');
const { AnalyticsController } = require('../dist/analytics/controllers/analytics.controller');
const { AnalyticsService } = require('../dist/analytics/services/analytics.service');

const id = '5dc7e1c2-2a78-42e7-b423-0a649c3fe516';
const source = { id, url: 'https://p12.example/feed', active: true, createdAt: new Date('2026-01-01Z'), updatedAt: new Date('2026-01-01Z') };
const routes = [
  ['GET', '/sources', 'read', 200], ['GET', `/sources/${id}`, 'read', 200],
  ['GET', '/dashboards/geography', 'read', 200],
  ['POST', '/sources', 'write', 201, { url: 'https://p12.example/feed' }],
  ['PUT', `/sources/${id}`, 'write', 200, { url: 'https://p12.example/new' }],
  ['PATCH', `/sources/${id}`, 'write', 200, { active: false }],
  ['DELETE', `/sources/${id}`, 'write', 204],
  ['POST', `/sources/${id}/capture`, 'write', 200],
  ['POST', '/sources/capture', 'write', 200, { sourceIds: [id, 'other'] }],
  ['PUT', `/dashboards/sources/${id}/geography`, 'write', 200, { countryCode: 'CL' }],
];
const report = { kind: 'HTTP con dobles de negocio; no prueba de escritura PostgreSQL', checks: [] };
let app;
function check(name, condition) {
  report.checks.push({ name, passed: Boolean(condition) });
  if (!condition) throw new Error('Falló comprobación de acceso');
}
async function start() {
  let calls = 0;
  const counted = (value) => async () => { calls++; return value; };
  class SecuritySmokeModule {}
  Module({ imports: [AuthModule], controllers: [SourcesController, ManualSourceCaptureController, MultipleSourceCaptureController, AnalyticsController], providers: [
    { provide: SourcesService, useValue: {
      list: counted([source]), create: counted(source), update: counted(source), replace: counted(source),
      deactivate: counted(undefined), findById: async (requested) => { calls++; if (requested !== id) throw new SourceNotFoundError(requested); return source; },
    } },
    { provide: ManualSourceCaptureService, useValue: { capture: counted({ sourceId: id, status: 'completed', itemsParsed: 0 }) } },
    { provide: MultipleSourceCaptureService, useValue: { capture: counted({ results: [] }) } },
    { provide: AnalyticsService, useValue: { geography: counted({ countries: [], sources: [] }), assignCountry: counted({ id, countryCode: 'CL' }) } },
  ] })(SecuritySmokeModule);
  const instance = await NestFactory.create(SecuritySmokeModule, { logger: false, abortOnError: false });
  instance.setGlobalPrefix('api/v1');
  instance.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  await instance.listen(0, '127.0.0.1');
  return { instance, url: await instance.getUrl(), calls: () => calls };
}
async function request(url, method, route, key, body) {
  const response = await fetch(`${url}/api/v1${route}`, { method,
    headers: { 'Content-Type': 'application/json', ...(key ? { 'X-API-Key': key } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const text = await response.text();
  return { status: response.status, text };
}

async function main() {
  const read = process.env.HUMWORLD_API_KEY_READ;
  const write = process.env.HUMWORLD_API_KEY_WRITE;
  // No defaults: el job debe recibir los secretos explícitamente.
  check('Credenciales de entorno presentes y diferentes', Boolean(read?.trim() && write?.trim() && read !== write));
  const original = await start(); app = original.instance;
  for (const [method, route, permission, success, body] of routes) {
    for (const [profile, key, expected] of [
      ['ausente', undefined, 401], ['incorrecta', randomBytes(32).toString('hex'), 401],
      ['consulta', read, permission === 'read' ? success : 403], ['gestión', write, success],
    ]) {
      const before = original.calls();
      const response = await request(original.url, method, route, key, body);
      check(`${profile}: ${method} ${route} → ${expected}`, response.status === expected);
      check(`Sin filtración: ${profile} ${method} ${route}`, !response.text.includes(read) && !response.text.includes(write));
      if (expected === 401 || expected === 403) check(`Sin servicio: ${profile} ${method} ${route}`, before === original.calls());
    }
  }
  check('404 funcional autorizado', (await request(original.url, 'GET', '/sources/missing', read)).status === 404);
  await app.close(); app = undefined;
  const rotatedWrite = randomBytes(32).toString('hex');
  process.env.HUMWORLD_API_KEY_WRITE = rotatedWrite;
  try {
    const rotated = await start(); app = rotated.instance;
    check('Rotación: gestión anterior rechazada', (await request(rotated.url, 'GET', '/sources', write)).status === 401);
    check('Rotación: gestión nueva escribe', (await request(rotated.url, 'POST', '/sources', rotatedWrite, { url: source.url })).status === 201);
    check('Rotación: consulta conserva acceso', (await request(rotated.url, 'GET', '/sources', read)).status === 200);
  } finally { process.env.HUMWORLD_API_KEY_WRITE = write; }
}
main().then(() => {
  console.log(`P12: ${report.checks.length} comprobaciones HTTP/rotación aprobadas; valores omitidos.`);
}).catch(() => {
  // No imprimir errores de petición, objetos de configuración ni valores recibidos.
  console.error('P12: falló una comprobación de acceso o configuración; consulta el informe de casos.');
  process.exitCode = 1;
}).finally(async () => {
  if (app) await app.close();
  fs.mkdirSync(path.resolve('reports/p12'), { recursive: true });
  fs.writeFileSync(path.resolve('reports/p12/access-checks.json'), JSON.stringify(report, null, 2));
});
