import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { WORKER_ROLES, type WorkerRole } from './queue/queue.constants';

async function bootstrap() {
  const role = parseWorkerRole(process.env.WORKER_ROLE);
  const logger = new Logger('WorkerBootstrap');
  const app = await NestFactory.createApplicationContext(AppModule);

  logger.log(`LLMSniffer worker started with role: ${role}`);

  process.on('SIGTERM', () => {
    logger.log('Worker received SIGTERM');
    void app.close().then(() => process.exit(0));
  });
}

function parseWorkerRole(value: string | undefined): WorkerRole {
  if (value && WORKER_ROLES.includes(value as WorkerRole)) {
    return value as WorkerRole;
  }
  throw new Error(`Invalid WORKER_ROLE: ${value ?? '<empty>'}`);
}

void bootstrap();
