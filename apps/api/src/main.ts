import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, new ExpressAdapter());
  app.use(cookieParser());
  app.useGlobalPipes(
    new ValidationPipe({
      forbidNonWhitelisted: true,
      transform: true,
      whitelist: true,
    }),
  );
  app.enableCors({
    origin: corsOrigin,
    credentials: true,
  });

  await app.listen(process.env.API_PORT ?? 3001);
}
void bootstrap();

const LOCAL_WEB_ORIGINS = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://[::1]:3000',
];

const allowedWebOrigins = new Set([
  ...LOCAL_WEB_ORIGINS,
  ...parseOrigins(process.env.WEB_ORIGIN),
  ...parseOrigins(process.env.WEB_ORIGINS),
]);

function corsOrigin(
  origin: string | undefined,
  callback: (error: Error | null, allow?: boolean) => void,
) {
  // 浏览器 CORS 要精确回传来源；本地开发常在 localhost 和 127.0.0.1 之间切换。
  if (!origin || allowedWebOrigins.has(origin)) {
    callback(null, true);
    return;
  }

  callback(null, false);
}

function parseOrigins(value: string | undefined) {
  if (!value) return [];
  return value
    .split(',')
    .map((origin) => origin.trim().replace(/\/$/, ''))
    .filter(Boolean);
}
