import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ProbeModule } from '../probes/probe.module';
import { MetricsService } from './metrics.service';
import {
  MetricBucket,
  MetricBucketSchema,
} from './schemas/metric-bucket.schema';

@Module({
  imports: [
    ProbeModule,
    MongooseModule.forFeature([
      { name: MetricBucket.name, schema: MetricBucketSchema },
    ]),
  ],
  providers: [MetricsService],
  exports: [MetricsService, MongooseModule],
})
export class MetricsModule {}
