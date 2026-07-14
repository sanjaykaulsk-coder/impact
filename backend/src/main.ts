import 'reflect-metadata';
import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import { AppModule } from './app.module';

const REQUIRED_ENV_VARS = [
  'DATABASE_URL',
  'APP_DATABASE_URL',
  'JWT_ACCESS_SECRET',
  'JWT_REFRESH_SECRET',
] as const;

function assertRequiredEnv() {
  const missing = REQUIRED_ENV_VARS.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    // Fail fast and loud rather than starting in a half-configured state (spec §36).
    // eslint-disable-next-line no-console
    console.error(`Missing required environment variable(s): ${missing.join(', ')}. See .env.example.`);
    process.exit(1);
  }
}

async function bootstrap() {
  assertRequiredEnv();

  const app = await NestFactory.create(AppModule);
  const logger = new Logger('Bootstrap');

  app.use(helmet());
  app.enableCors({ origin: true, credentials: true });
  app.setGlobalPrefix(process.env.API_PREFIX ?? 'api/v1');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  const port = Number(process.env.BACKEND_PORT ?? 4000);
  await app.listen(port);
  logger.log(`IMPACT FIELD COMMAND backend listening on http://localhost:${port}/${process.env.API_PREFIX ?? 'api/v1'}`);
}

bootstrap();
