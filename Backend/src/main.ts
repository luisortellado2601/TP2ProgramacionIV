import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule, ObserveInstrument } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    instrument: ObserveInstrument,
  });
  // CORS_ORIGIN: dominios permitidos separados por coma (ej. la URL del front en Vercel).
  // Sin definir (desarrollo local) se acepta cualquier origen.
  const origenes = process.env.CORS_ORIGIN?.split(',').map((o) => o.trim());
  app.enableCors({ origin: origenes?.length ? origenes : true });
  // Las imágenes viajan en base64 dentro del JSON (2 MB ≈ 2,7 MB en base64).
  app.useBodyParser('json', { limit: '3mb' });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
