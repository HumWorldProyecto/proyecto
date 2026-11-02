import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { createOpenApiDocument } from './openapi';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  const swaggerDocument = createOpenApiDocument(app);
  SwaggerModule.setup('api/docs', app, swaggerDocument);

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
}

void bootstrap();
