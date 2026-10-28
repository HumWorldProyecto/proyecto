require('reflect-metadata');
const { NestFactory } = require('@nestjs/core');
const { ValidationPipe } = require('@nestjs/common');
const { AppModule } = require('../dist/app.module');
const { createOpenApiDocument } = require('../dist/openapi');
const fs = require('node:fs');
async function main() {
  const app = await NestFactory.create(AppModule, { logger: false, abortOnError: false });
  try {
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    fs.writeFileSync('../docs/openapi.json', `${JSON.stringify(createOpenApiDocument(app))}\n`);
    console.log('OpenAPI exportado sin valores de credenciales.');
  } finally { await app.close(); }
}
main().catch(() => { console.error('No se pudo exportar OpenAPI; revisa la configuración local.'); process.exitCode = 1; });
