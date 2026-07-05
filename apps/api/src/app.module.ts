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
import { MetricsWorker } from './workers/metrics.worker';
import { ProbeWorker } from './workers/probe.worker';
import { SchedulerWorker } from './workers/scheduler.worker';
import { SnapshotWorker } from './workers/snapshot.worker';

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
  providers: [
    AppService,
    SchedulerWorker,
    ProbeWorker,
    MetricsWorker,
    SnapshotWorker,
  ],
})
export class AppModule {}
