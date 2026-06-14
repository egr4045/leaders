import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import * as path from 'node:path';
import { json } from 'body-parser';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.enableCors({ origin: true, credentials: true });
  // ML-box отправляет аудио base64 (~300 KB), увеличиваем лимит тела
  app.use(json({ limit: '10mb' }));
  // кэш сгенерированных ассетов (озвучка, картинки) — раздаётся как /media/*
  // (НЕ /assets/ — этот префикс занят бандлом Vite)
  const assetDir = process.env.ASSET_DIR ?? path.resolve(process.cwd(), '../../assets-cache');
  app.useStaticAssets(assetDir, { prefix: '/media/', maxAge: '7d' });
  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port, '0.0.0.0');
  console.log(`[leaders] server listening on :${port}`);
}

bootstrap();
