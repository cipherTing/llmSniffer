import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type TimeWindow = '90m' | '24h' | '7d' | '30d';
export type MetricBucketDocument = HydratedDocument<MetricBucket>;

@Schema({ timestamps: true })
export class MetricBucket {
  @Prop({ required: true, index: true })
  siteId!: string;

  @Prop({ required: true, index: true })
  probeId!: string;

  @Prop({ required: true, default: 'default', index: true })
  region!: 'default';

  @Prop({ required: true, index: true })
  window!: TimeWindow;

  @Prop({ required: true })
  generatedAt!: Date;

  @Prop({ required: true })
  uptimePercent!: number;

  @Prop({ type: Number })
  p50LatencyMs?: number | null;

  @Prop({ type: Number })
  p95LatencyMs?: number | null;

  @Prop({ required: true })
  failureCount!: number;

  @Prop({ required: true })
  longestOutageMinutes!: number;

  @Prop({ required: true, type: Array })
  trends!: {
    timestamp: string;
    status: string;
    latencyMs: number | null;
    failureCount: number;
  }[];
}

export const MetricBucketSchema = SchemaFactory.createForClass(MetricBucket);
MetricBucketSchema.index(
  { siteId: 1, probeId: 1, region: 1, window: 1 },
  { unique: true },
);
