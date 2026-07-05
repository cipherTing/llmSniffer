import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MetricsModule } from '../metrics/metrics.module';
import { ProbeModule } from '../probes/probe.module';
import { RedisModule } from '../redis/redis.module';
import {
  MonitoredSite,
  MonitoredSiteSchema,
} from '../sites/schemas/monitored-site.schema';
import {
  RelaySnapshot,
  RelaySnapshotSchema,
} from './schemas/relay-snapshot.schema';
import { SnapshotService } from './snapshot.service';

@Module({
  imports: [
    RedisModule,
    ProbeModule,
    MetricsModule,
    MongooseModule.forFeature([
      { name: MonitoredSite.name, schema: MonitoredSiteSchema },
      { name: RelaySnapshot.name, schema: RelaySnapshotSchema },
    ]),
  ],
  providers: [SnapshotService],
  exports: [SnapshotService, RedisModule, MongooseModule],
})
export class SnapshotModule {}
