import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AdminModule } from './admin/admin.module';
import { MetricsModule } from './metrics/metrics.module';
import { ProbeModule } from './probes/probe.module';
import { QueueModule } from './queue/queue.module';
import { RedisModule } from './redis/redis.module';
import { SecretsModule } from './secrets/secrets.module';
import { SnapshotModule } from './snapshots/snapshot.module';
import {
  MonitoredSite,
  MonitoredSiteSchema,
} from './sites/schemas/monitored-site.schema';
import { MetricsProcessor, MetricsWorker } from './workers/metrics.worker';
import { ProbeProcessor, ProbeWorker } from './workers/probe.worker';
import { SchedulerWorker } from './workers/scheduler.worker';
import { SnapshotProcessor, SnapshotWorker } from './workers/snapshot.worker';

const WORKER_PROVIDERS = workerProvidersForRole(process.env.WORKER_ROLE);

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: ['.env', '../../.env'],
      expandVariables: true,
      isGlobal: true,
    }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        uri: configService.getOrThrow<string>('MONGODB_URI'),
      }),
    }),
    MongooseModule.forFeature([
      { name: MonitoredSite.name, schema: MonitoredSiteSchema },
    ]),
    RedisModule,
    QueueModule,
    ProbeModule,
    MetricsModule,
    SnapshotModule,
    SecretsModule,
    AdminModule,
  ],
  controllers: [AppController],
  providers: [AppService, ...WORKER_PROVIDERS],
})
export class AppModule {}

function workerProvidersForRole(role: string | undefined) {
  if (role === 'scheduler') return [SchedulerWorker];
  if (role === 'probe') return [ProbeWorker, ProbeProcessor];
  if (role === 'metrics') return [MetricsWorker, MetricsProcessor];
  if (role === 'snapshot') return [SnapshotWorker, SnapshotProcessor];
  return [];
}
